// Everything a parent can do to the bank. Each action changes the data, saves it,
// and returns the message to show. No screen code here.

import { state, save, currentKid } from "./state.js";
import { balances, byDate, today } from "./core.js";
import { tr } from "./i18n/index.js";
import { money, rid } from "./format.js";

/** Record money in, money out, or a move between savings and investments. */
export function recordEntry({ kind, amount, date, note }) {
  const kid = currentKid(), b = balances(kid), cents = Math.round(parseFloat(amount) * 100);
  if (!(cents > 0)) return tr("amtZero");
  if (!date || date > today()) return tr("dateBad");
  if ((kind === "out" || kind === "buy") && cents > b.sav) return tr("savOnly", { amt: money(b.sav) });
  if (kind === "sell" && cents > b.inv) return tr("invOnly", { amt: money(b.inv) });
  kid.tx.push({ id: rid(), d: date, t: kind, a: cents, n: note.trim() });
  kid.tx.sort(byDate);
  save();
  return tr("recorded", { what: tr("t_" + kind), amt: money(cents) });
}

export function deleteEntry(id) {
  const kid = currentKid();
  kid.tx = kid.tx.filter(t => t.id !== id);
  save();
  return tr("deleted");
}

/** Save the bank rules: interest, investments, currency sign and language. */
export function saveRules({ interestOn, interestRate, interestPer, investOn, investRate, investSwing, currency, lang }) {
  const num = (v, fallback) => (isFinite(parseFloat(v)) ? parseFloat(v) : fallback);
  const bank = state.bank;
  bank.interest = { on: interestOn, rate: num(interestRate, 1), per: interestPer === "year" ? "year" : "month" };
  bank.invest = { on: investOn, rate: num(investRate, 6), swing: Math.abs(num(investSwing, 3)) };
  bank.currency = currency.trim() || "€";
  bank.lang = lang;
  state.ui.rules = true;
  save();
  return tr("rulesSaved");
}

export function openAccount(name) {
  const id = rid();
  state.bank.kids.push({ id, name, thru: today().slice(0, 7), tx: [] });
  state.ui.kid = id;
  state.ui.accts = false;
  save();
  return tr("opened", { name });
}

export function renameAccount(id, name) {
  state.bank.kids.find(k => k.id === id).name = name;
  save();
  return tr("renamed");
}

export function closeAccount(id) {
  state.bank.kids = state.bank.kids.filter(k => k.id !== id);
  state.ui.arm = null;
  save();
  return tr("closed");
}

export function clearExamples() {
  state.bank.kids = [];
  state.bank.example = false;
  state.ui.accts = true;
  save();
  return tr("cleared");
}
