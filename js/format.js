// Small helpers for showing text, dates and money.

import { state } from "./state.js";
import { monthName } from "./i18n/index.js";
import { today } from "./core.js";

/** Make any text safe to place inside HTML. */
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** A short random id for new accounts and entries. */
export const rid = () => Math.random().toString(36).slice(2, 9);

/** "YYYY-MM-DD" -> milliseconds, for placing dates on a chart. */
export const ms = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));

const comma = n => (state.bank.lang !== "en" ? n.replace(".", ",") : n);

/** "2026-11-07" -> "7 Nov" (the year is added when it is not this year). */
export const fdate = d => +d.slice(8, 10) + " " + monthName(+d.slice(5, 7) - 1) + (d.slice(0, 4) !== today().slice(0, 4) ? " " + d.slice(0, 4) : "");

/** Cents -> "€12.50". With `whole`, no decimals. */
export function money(cents, whole) {
  return (cents < 0 ? "−" : "") + esc(state.bank.currency) + comma((Math.abs(cents) / 100).toFixed(whole ? 0 : 2));
}

/** A fraction -> "+1.2%" */
export function percent(fraction) {
  const p = fraction * 100;
  return (p < 0 ? "−" : "+") + comma(Math.abs(p).toFixed(1)) + "%";
}
