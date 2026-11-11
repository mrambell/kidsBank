// Turning a bank into a short code (for the QR) and back, and checking data that comes from outside.
// No screen code here.

import { defaultState, KINDS, byDate, today } from "./core.js";
import { hasLang } from "./i18n/index.js";
import { rid } from "./format.js";

/** The longest link that still makes a QR code a phone can read off a screen. */
export const QR_MAX = 1400;

/**
 * Rebuild a bank field by field from untrusted data (a scanned code or a backup file).
 * Anything unexpected is dropped or replaced by a safe default. Throws if it is not a bank at all.
 */
export function normalize(d) {
  if (!d || typeof d !== "object" || !Array.isArray(d.kids)) throw new Error("not a bank");
  const num = (v, fallback) => (v !== null && v !== "" && isFinite(+v) ? +v : fallback);
  const bank = defaultState(), i = d.interest || {}, v = d.invest || {};
  bank.lang = hasLang(d.lang) ? d.lang : "en";
  bank.currency = String(d.currency || "€").slice(0, 3);
  bank.example = !!d.example;
  bank.pinHash = /^[0-9a-f]{64}$/.test(d.pinHash) ? d.pinHash : "";
  bank.interest = { on: !!i.on, rate: num(i.rate, 1), per: i.per === "year" ? "year" : "month" };
  bank.invest = { on: !!v.on, rate: num(v.rate, 6), swing: Math.abs(num(v.swing, 3)) };
  bank.kids = d.kids.slice(0, 20).map(k => ({
    id: rid(),
    name: String((k && k.name) || "?").slice(0, 20),
    thru: k && /^\d{4}-\d\d$/.test(k.thru) ? k.thru : today().slice(0, 7),
    tx: (k && Array.isArray(k.tx) ? k.tx : [])
      .filter(t => t && /^\d{4}-\d\d-\d\d$/.test(t.d) && KINDS.includes(t.t) && isFinite(+t.a))
      .map(t => ({ id: rid(), d: t.d, t: t.t, a: Math.round(+t.a), n: String(t.n || "").slice(0, 40) }))
      .sort(byDate),
  }));
  return bank;
}

/** Bank -> compact form with short keys and arrays, to keep the code small. */
export const pack = b => ({
  v: 1, l: b.lang, c: b.currency, p: b.pinHash, e: b.example ? 1 : 0,
  i: [b.interest.on ? 1 : 0, b.interest.rate, b.interest.per],
  n: [b.invest.on ? 1 : 0, b.invest.rate, b.invest.swing],
  k: b.kids.map(k => [k.name, k.thru, k.tx.map(t => (t.n ? [t.d, t.t, t.a, t.n] : [t.d, t.t, t.a]))]),
});

/** Compact form -> ordinary bank shape (still untrusted: pass it through normalize). */
export const unpack = q => ({
  lang: q.l, currency: q.c, pinHash: q.p, example: q.e,
  interest: { on: q.i[0], rate: q.i[1], per: q.i[2] },
  invest: { on: q.n[0], rate: q.n[1], swing: q.n[2] },
  kids: q.k.map(k => ({ name: k[0], thru: k[1], tx: k[2].map(t => ({ d: t[0], t: t[1], a: t[2], n: t[3] || "" })) })),
});

async function throughStream(bytes, stream) {
  return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());
}

/** Object -> text code: JSON, compressed where the browser can, then URL-safe base64. First letter says which. */
export async function encode(obj) {
  let bytes = new TextEncoder().encode(JSON.stringify(obj)), tag = "r";
  if (window.CompressionStream) { bytes = await throughStream(bytes, new CompressionStream("deflate-raw")); tag = "z"; }
  let str = "";
  bytes.forEach(x => { str += String.fromCharCode(x); });
  return tag + btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function decode(code) {
  let bytes = Uint8Array.from(atob(code.slice(1).replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  if (code[0] === "z") bytes = await throughStream(bytes, new DecompressionStream("deflate-raw"));
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Code from a QR or link -> checked bank. Throws if the code is not valid. */
export async function bankFromCode(code) { return normalize(unpack(await decode(code))); }

/** Copy of the bank where entries before month `cut` are merged into one line per month and kind. Balances stay the same. */
export function squash(bank, cut) {
  const copy = JSON.parse(JSON.stringify(bank));
  for (const k of copy.kids) {
    const recent = [], merged = {};
    for (const t of k.tx) {
      if (t.d.slice(0, 7) >= cut) { recent.push(t); continue; }
      const key = t.d.slice(0, 7) + t.t;
      if (merged[key]) { merged[key].a += t.a; merged[key].d = t.d; }
      else merged[key] = { id: "", d: t.d, t: t.t, a: t.a, n: "" };
    }
    k.tx = Object.values(merged).concat(recent).sort(byDate);
  }
  return copy;
}

function monthsAgo(n) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - n);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}

/**
 * The link that carries the whole bank. If the full history is too long for one QR code,
 * older months are merged step by step. Returns { url, merged } or null if it still does not fit.
 */
export async function transferLink(bank, pageUrl) {
  const base = pageUrl.split("#")[0] + "#m=";
  for (const keepMonths of [null, 12, 6, 3, 1, -1]) {
    const code = await encode(pack(keepMonths === null ? bank : squash(bank, monthsAgo(keepMonths))));
    if (base.length + code.length <= QR_MAX) return { url: base + code, merged: keepMonths !== null };
  }
  return null;
}
