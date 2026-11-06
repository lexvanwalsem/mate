import { Chess } from "chess.js";
import { GameAnalysis } from "./analyze";
import { Side, countClasses, CLASS_ORDER, resultFor, openingName } from "./stats";
import { commentFor } from "./commentary";
import { classLabel } from "@/ui/classes";
import { CLASS_META } from "@/ui/classes";
import { t } from "./i18n";
import { BLOKJE_BODY } from "@/ui/blokjeShape";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const evalText = (a: GameAnalysis, p: number): string => {
  const line = a.positions[p].lines[0];
  if (!line) return "0.00";
  return line.mate !== undefined ? `#${line.mate}` : ((line.cp ?? 0) / 100).toFixed(2);
};

/** The game as PGN with an engine evaluation and a short explanation after every move. */
export function exportAnnotatedPgn(a: GameAnalysis, side: Side) {
  const game = new Chess(a.fens[0]);
  for (const [key, value] of Object.entries(a.headers)) game.setHeader(key, value);
  a.sans.forEach((san, i) => {
    game.move(san);
    game.setComment(`[%eval ${evalText(a, i + 1)}] ${commentFor(a, i + 1, side)}`.trim());
  });
  const name = `${(a.headers.White ?? "white").replace(/\W+/g, "_")}-${(a.headers.Black ?? "black").replace(/\W+/g, "_")}.pgn`;
  download(new Blob([game.pgn()], { type: "application/x-chess-pgn" }), name);
}

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
};

/** A square picture of the summary, ready to share. Drawn on a canvas, nothing leaves your computer. */
export async function saveSummaryImage(a: GameAnalysis, side: Side) {
  await document.fonts.ready;
  const size = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const display = '"Fredoka Variable", "Nunito Variable", system-ui, sans-serif';
  const body = '"Nunito Variable", system-ui, sans-serif';

  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, "#e4dbff");
  bg.addColorStop(1, "#ffe9d8");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.fillStyle = "#ffffff";
  roundRect(ctx, 60, 60, size - 120, size - 120, 56);
  ctx.fill();

  // Blokje, drawn from rounded blocks
  // Blokje, the same tower as in the app (drawn in its 200x200 box, scaled down)
  ctx.save();
  ctx.translate(90, 90);
  ctx.scale(0.85, 0.85);
  const body2 = ctx.createLinearGradient(0, 26, 0, 186);
  body2.addColorStop(0, "#8d6bff");
  body2.addColorStop(1, "#5b3df0");
  ctx.fillStyle = body2;
  roundRect(ctx, 38, 94, 24, 38, 12); ctx.fill();
  roundRect(ctx, 138, 94, 24, 38, 12); ctx.fill();
  ctx.fill(new Path2D(BLOKJE_BODY));
  ctx.fillStyle = "#fff";
  roundRect(ctx, 68, 87, 28, 34, 13); ctx.fill();
  roundRect(ctx, 104, 87, 28, 34, 13); ctx.fill();
  ctx.fillStyle = "#1f1b3a";
  ctx.beginPath(); ctx.arc(82, 106, 9, 0, 7); ctx.arc(118, 106, 9, 0, 7); ctx.fill();
  ctx.strokeStyle = "#1f1b3a";
  ctx.lineWidth = 6;
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(88, 132); ctx.quadraticCurveTo(100, 142, 112, 132); ctx.stroke();
  ctx.restore();

  ctx.fillStyle = "#6c4cf5";
  ctx.font = `600 64px ${display}`;
  ctx.fillText(t("app.name"), 290, 190);
  ctx.fillStyle = "#7a76a0";
  ctx.font = `500 30px ${body}`;
  ctx.fillText(`${a.headers.White ?? "?"} vs ${a.headers.Black ?? "?"}`, 290, 238);

  const mine = a.accuracy[side];
  ctx.fillStyle = "#1f1b3a";
  ctx.font = `600 200px ${display}`;
  ctx.fillText(`${mine.toFixed(1)}%`, 110, 520);
  ctx.fillStyle = "#7a76a0";
  ctx.font = `500 36px ${body}`;
  ctx.fillText(t("summary.accuracy"), 116, 574);
  const result = resultFor(a.headers, side);
  if (result !== "unknown") {
    ctx.fillStyle = result === "win" ? "#22c58b" : result === "loss" ? "#ff6b6b" : "#8f93a8";
    roundRect(ctx, 760, 430, 210, 70, 24);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `600 36px ${display}`;
    ctx.textAlign = "center";
    ctx.fillText(t(`summary.${result}`), 865, 478);
    ctx.textAlign = "left";
  }

  // class tiles
  const counts = countClasses(a, side);
  const shown = CLASS_ORDER.filter((c) => counts[c] > 0).slice(0, 8);
  const tileW = 200, tileH = 130, gap = 22;
  shown.forEach((c, i) => {
    const x = 110 + (i % 4) * (tileW + gap);
    const y = 640 + Math.floor(i / 4) * (tileH + gap);
    ctx.fillStyle = CLASS_META[c].color;
    roundRect(ctx, x, y, tileW, tileH, 28);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = `600 56px ${display}`;
    ctx.fillText(String(counts[c]), x + 22, y + 66);
    ctx.font = `500 26px ${body}`;
    ctx.fillText(classLabel(c), x + 22, y + 106);
  });

  const opening = openingName(a);
  if (opening) {
    ctx.fillStyle = "#7a76a0";
    ctx.font = `500 26px ${body}`;
    ctx.fillText(opening.length > 60 ? `${opening.slice(0, 57)}...` : opening, 110, 960);
  }

  canvas.toBlob((blob) => blob && download(blob, "summary.png"), "image/png");
}
