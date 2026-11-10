// Runs in the page itself on duolingo.com (world MAIN, before the site starts). When Duolingo loads your
// chess match list, the answer is passed on to our content script, so its buttons match the rows exactly.
// Approach from github.com/JohnVitor-Dev/duolingo-chess-history (MIT).
import { DUOLINGO_LIST } from "@/lib/duolingo";

const pass = (url: string, body: string) => window.postMessage({ source: "mate-duolingo", url, body }, location.origin);

const realFetch = window.fetch;
window.fetch = async function (...args: Parameters<typeof fetch>) {
  const res = await realFetch.apply(this, args);
  try {
    const input = args[0];
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (DUOLINGO_LIST.test(url)) res.clone().text().then((body) => pass(url, body), () => undefined);
  } catch {
    // never break the site's own request
  }
  return res;
};

const realOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: unknown[]) {
  const href = String(url);
  if (DUOLINGO_LIST.test(href)) this.addEventListener("load", () => pass(href, this.responseText));
  return (realOpen as (...a: unknown[]) => void).call(this, method, url, ...rest);
} as typeof XMLHttpRequest.prototype.open;
