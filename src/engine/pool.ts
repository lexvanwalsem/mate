import { PositionEval } from "@/types/eval";
import { parseEvaluationResults } from "./parseResults";
import { getIsStalemate, getWhoIsCheckmated } from "@/lib/chess";

export const ENGINE_PATH = "engines/stockfish-18-lite-single.js";

interface Job {
  fen: string;
  depth: number;
  resolve: (e: PositionEval) => void;
  onUpdate?: (e: PositionEval) => void;
  latest?: boolean; // a newer 'latest' request replaces this one while it still waits in the queue
}

class EngineWorker {
  private worker: Worker;
  private listener: (line: string) => void = () => {};
  busy = false;

  constructor(path: string) {
    this.worker = new Worker(path);
    this.worker.onmessage = (ev) => this.listener(String(ev.data));
  }

  send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  /** Send commands and wait for a line starting with `final`. */
  run(commands: string[], final: string, onLine?: (all: string[]) => void): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      this.listener = (line) => {
        lines.push(line);
        onLine?.(lines);
        if (line.startsWith(final)) {
          this.listener = () => {};
          resolve(lines);
        }
      };
      commands.forEach((c) => this.send(c));
    });
  }

  async init(multiPv: number) {
    await this.run(["uci"], "uciok");
    await this.run([`setoption name MultiPV value ${multiPv}`, "isready"], "readyok");
    await this.run(["ucinewgame", "isready"], "readyok");
  }

  async setMultiPv(n: number) {
    await this.run([`setoption name MultiPV value ${n}`, "isready"], "readyok");
  }

  terminate() {
    this.send("quit");
    this.worker.terminate();
  }
}

export class EnginePool {
  private workers: EngineWorker[] = [];
  private queue: Job[] = [];
  private multiPv: number;

  private constructor(multiPv: number) {
    this.multiPv = multiPv;
  }

  static async create(size: number, multiPv: number, path = ENGINE_PATH): Promise<EnginePool> {
    const pool = new EnginePool(multiPv);
    const workers = Array.from({ length: Math.max(1, size) }, () => new EngineWorker(path));
    await Promise.all(workers.map((w) => w.init(multiPv)));
    pool.workers = workers;
    return pool;
  }

  static recommendedSize(): number {
    const cores = navigator.hardwareConcurrency || 4;
    return Math.max(1, Math.min(6, Math.floor(cores / 2)));
  }

  /**
   * Evaluate one position. With `latest` set, older waiting requests of that kind are dropped (their promise
   * resolves with no lines). A search that already started is never interrupted: the single-threaded engine only
   * handles new commands once it is done, so the caller just ignores results it no longer needs.
   */
  evaluate(fen: string, depth: number, onUpdate?: (e: PositionEval) => void, latest = false): Promise<PositionEval> {
    // Mate/stalemate: no engine needed.
    const mated = getWhoIsCheckmated(fen);
    if (mated) {
      return Promise.resolve({ lines: [{ pv: [], depth: 0, multiPv: 1, mate: mated === "w" ? -1 : 1 }] });
    }
    if (getIsStalemate(fen)) {
      return Promise.resolve({ lines: [{ pv: [], depth: 0, multiPv: 1, cp: 0 }] });
    }
    return new Promise((resolve) => {
      if (latest) {
        const stale = this.queue.filter((j) => j.latest);
        this.queue = this.queue.filter((j) => !j.latest);
        stale.forEach((j) => j.resolve({ lines: [] }));
      }
      this.queue.push({ fen, depth, resolve, onUpdate, latest });
      this.pump();
    });
  }

  private pump() {
    for (const w of this.workers) {
      if (w.busy) continue;
      const job = this.queue.shift();
      if (!job) return;
      w.busy = true;
      let last = 0;
      w.run([`position fen ${job.fen}`, `go depth ${job.depth}`], "bestmove", (lines) => {
        if (!job.onUpdate) return;
        const now = performance.now();
        if (now - last < 80) return;
        last = now;
        job.onUpdate(parseEvaluationResults(lines, job.fen));
      }).then((lines) => {
        w.busy = false;
        job.resolve(parseEvaluationResults(lines, job.fen));
        this.pump();
      });
    }
  }

  async setMultiPv(n: number) {
    if (n === this.multiPv) return;
    this.multiPv = n;
    await Promise.all(this.workers.map((w) => w.setMultiPv(n)));
  }

  shutdown() {
    this.queue = [];
    this.workers.forEach((w) => w.terminate());
    this.workers = [];
  }
}
