// Builds the page from the bank data. render() redraws everything; the smaller functions
// each return the HTML for one block. Buttons carry data-act="..." and forms data-form="...";
// app.js listens for those.

import { state, currentKid, emptyDevice } from "./state.js";
import { balances, monthlyInterestRate, monthlyInvestBase, nextMonth, today } from "./core.js";
import { tr, LANGS } from "./i18n/index.js";
import { esc, fdate, money, percent } from "./format.js";
import { $ } from "./dom.js";
import { drawHistory, drawFuture } from "./charts.js";

const app = () => $("#app");

export function render() {
  const bank = state.bank, kid = currentKid();
  document.documentElement.lang = bank.lang;
  $("#lock").textContent = tr(state.unlocked ? "lockDesk" : "parent");
  $("#install").textContent = tr("install");

  let h = "";
  if (state.storageFailed) h += `<p class="note">${tr("noStore")}</p>`;
  if (bank.example) h += `<p class="note">${tr("example")}</p>`;
  if (bank.kids.length > 1) h += accountTabs(kid);
  if (kid) h += balanceCard(kid);
  else h += `<p class="note">${tr(state.unlocked ? "noAcctsOpen" : "noAcctsLocked")}</p>`
    + (emptyDevice() ? `<div><button class="btn" type="button" data-act="scan">${tr("moveIn")}</button></div>` : "");
  if (state.unlocked) h += parentDesk(kid);
  if (kid) {
    h += `<section class="card"><h2>${tr("grew", { name: esc(kid.name) })}</h2><div id="lg1"></div><div class="chart" id="c1"></div></section>`;
    h += `<section class="card"><h2>${tr("future")}</h2><div id="p2"></div><div id="lg2"></div><div class="chart" id="c2"></div></section>`;
    h += passbook(kid);
  }
  app().innerHTML = h;
  drawCharts();
}

export function drawCharts() {
  const kid = currentKid();
  if (kid && $("#c1")) { drawHistory(kid); drawFuture(kid); }
}

function accountTabs(kid) {
  return `<nav class="kids" aria-label="${tr("accounts")}">${state.bank.kids.map(x =>
    `<button type="button" class="kid" data-act="pick" data-id="${x.id}" aria-pressed="${x === kid}"><i>${esc(x.name.slice(0, 1).toUpperCase())}</i>${esc(x.name)}</button>`).join("")}</nav>`;
}

/** The green card: total balance, its parts, and the rules in one sentence. */
function balanceCard(kid) {
  const bank = state.bank, b = balances(kid), showInv = bank.invest.on || b.inv !== 0;
  let rule = "";
  if (bank.interest.on) rule += tr(bank.interest.per === "month" ? "ruleIntM" : "ruleIntY", {
    rate: bank.interest.rate, date: fdate(nextMonth(today().slice(0, 7)) + "-01"),
    amt: money(Math.max(0, Math.round(b.sav * monthlyInterestRate(bank)))) });
  if (bank.invest.on) rule += tr("ruleInv", { rate: bank.invest.rate });
  const part = (value, label) => `<div><b>${value}</b><span>${label}</span></div>`;
  const signed = c => (c >= 0 ? "+" : "") + money(c);
  return `<section class="hero"><span class="lab">${tr("balance", { name: esc(kid.name) })}</span><div class="big">${money(b.total)}</div>
    <div class="split">
      ${showInv ? part(money(b.sav), tr("savings")) + part(money(b.inv), tr("invested")) : ""}
      ${part(money(b.paid), tr("kept"))}
      ${bank.interest.on || b.int ? part(signed(b.int), tr("intEarned")) : ""}
      ${showInv ? part(signed(b.ret), tr("invResult")) : ""}
    </div>
    ${rule ? `<div class="rule">${rule}</div>` : ""}</section>`;
}

/** The yellow parent desk: record an entry, bank rules, accounts, this device. */
function parentDesk(kid) {
  return `<section class="desk"><h2>${tr("desk")}</h2>${kid ? entryForm(kid) : ""}${rulesSection()}${accountsSection(kid)}${deviceSection()}</section>`;
}

function entryForm(kid) {
  const bank = state.bank, b = balances(kid), t = today();
  return `<form class="row" data-form="tx">
    <label class="f">${tr("what")}<select id="tx-type"><option value="in">${tr("addMoney")}</option><option value="out">${tr("takeOut")}</option>
      ${bank.invest.on ? `<option value="buy">${tr("toInv")}</option>` : ""}${b.inv > 0 ? `<option value="sell">${tr("fromInv")}</option>` : ""}</select></label>
    <label class="f narrow">${tr("amount")} (${esc(bank.currency)})<input id="tx-amt" type="number" step="0.01" min="0.01" inputmode="decimal" required></label>
    <label class="f">${tr("note")}<input id="tx-note" maxlength="40" placeholder="${tr("notePh")}"></label>
    <label class="f narrow" style="flex-basis:140px">${tr("date")}<input id="tx-date" type="date" max="${t}" value="${t}" required></label>
    <button class="btn primary" type="submit">${tr("recordFor", { name: esc(kid.name) })}</button></form>`;
}

/** The short explanation of interest and investments, with a worked line from the saved rules. */
function howItWorks() {
  const bank = state.bank, base = monthlyInvestBase(bank), swing = bank.invest.swing / 100;
  const now = tr("howNow", { a: money(10000), b: money(Math.round(10000 * monthlyInterestRate(bank))), lo: percent(base - swing), hi: percent(base + swing) });
  return `<p class="how"><b>${tr("howTitle")}</b>${tr("how")}<span>${now}</span></p>`;
}

function rulesSection() {
  const bank = state.bank, sel = (a, b) => (a === b ? "selected" : "");
  return `<details data-d="rules" ${state.ui.rules ? "open" : ""}><summary>${tr("rules")}</summary><form data-form="rules">
    <div class="row"><label class="check"><input type="checkbox" id="r-int" ${bank.interest.on ? "checked" : ""}>${tr("payInt")}</label>
      <label class="f narrow">${tr("rate")}<input id="r-rate" type="number" step="0.1" min="0" max="50" value="${bank.interest.rate}"></label>
      <label class="f narrow">${tr("per")}<select id="r-per"><option value="month" ${sel(bank.interest.per, "month")}>${tr("month")}</option><option value="year" ${sel(bank.interest.per, "year")}>${tr("year")}</option></select></label></div>
    <div class="row"><label class="check"><input type="checkbox" id="r-inv" ${bank.invest.on ? "checked" : ""}>${tr("allowInv")}</label>
      <label class="f narrow">${tr("avgYear")}<input id="r-irate" type="number" step="0.5" min="-20" max="100" value="${bank.invest.rate}"></label>
      <label class="f narrow">${tr("swing")}<input id="r-swing" type="number" step="0.5" min="0" max="30" value="${bank.invest.swing}"></label></div>
    ${howItWorks()}
    <div class="row"><label class="f narrow" style="flex-basis:140px">${tr("language")}<select id="r-lang">${Object.keys(LANGS).map(c => `<option value="${c}" ${sel(bank.lang, c)}>${LANGS[c]}</option>`).join("")}</select></label>
      <label class="f narrow">${tr("currency")}<input id="r-cur" maxlength="3" value="${esc(bank.currency)}"></label><button class="btn primary" type="submit">${tr("saveRules")}</button></div></form></details>`;
}

function accountsSection(kid) {
  const bank = state.bank, ui = state.ui;
  return `<details data-d="accts" ${ui.accts || !kid ? "open" : ""}><summary>${tr("acctsPin")}</summary><div>
    ${bank.kids.map(x => `<div class="row"><label class="f">${tr("name")}<input id="n-${x.id}" maxlength="20" value="${esc(x.name)}"></label>
      <button class="btn small" type="button" data-act="rename" data-id="${x.id}">${tr("rename")}</button>
      <button class="btn small danger" type="button" data-act="remove" data-id="${x.id}">${tr(ui.arm === x.id ? "reallyClose" : "close")}</button></div>`).join("")}
    <form class="row" data-form="kid"><label class="f">${tr("newFor")}<input id="k-name" maxlength="20" placeholder="${tr("childName")}" required></label><button class="btn primary" type="submit">${tr("open")}</button></form>
    <div class="row"><button class="btn small" type="button" data-act="pin">${tr("changePin")}</button>
      ${bank.example ? `<button class="btn small danger" type="button" data-act="clear">${tr("clearEx")}</button>` : ""}</div></div></details>`;
}

function deviceSection() {
  const ui = state.ui;
  return `<details data-d="dev" ${ui.dev ? "open" : ""}><summary>${tr("device")}</summary><div>
    <p class="sub">${tr("devNote")} ${tr("installHint")}</p>
    <div class="row"><button class="btn small" type="button" data-act="qr">${tr("moveOut")}</button><button class="btn small" type="button" data-act="scan">${tr("moveIn")}</button></div>
    <div class="row"><button class="btn small" type="button" data-act="backup">${tr("saveBackup")}</button><button class="btn small" type="button" data-act="restore">${tr("loadBackup")}</button>
      <button class="btn small danger" type="button" data-act="erase">${tr(ui.armErase ? "reallyErase" : "erase")}</button></div></div></details>`;
}

/** The list of entries, newest first, with a running balance. */
function passbook(kid) {
  let run = 0;
  const rows = kid.tx.map(t => {
    const change = (t.t === "in" || t.t === "int" || t.t === "ret") ? t.a : (t.t === "out" ? -t.a : 0);
    run += change;
    return { t, change, run };
  }).reverse();
  const shown = state.ui.all ? rows : rows.slice(0, 12), parent = state.unlocked;
  const line = r => {
    const t = r.t, move = t.t === "buy" || t.t === "sell", manual = ["in", "out", "buy", "sell"].includes(t.t);
    return `<tr><td>${fdate(t.d)}</td><td class="what">${tr(t.t === "ret" && t.a < 0 ? "t_dip" : "t_" + t.t)}${t.n ? `<small>${esc(t.n)}</small>` : ""}</td>
      <td class="num ${move ? "mut" : r.change < 0 ? "neg" : "pos"}">${move ? money(t.a) : (r.change < 0 ? "" : "+") + money(r.change)}</td><td class="num">${money(r.run)}</td>
      ${parent ? `<td>${manual ? `<button class="x" type="button" data-act="del" data-id="${t.id}" aria-label="${tr("delEntry")}">×</button>` : ""}</td>` : ""}</tr>`;
  };
  return `<section class="card"><h2>${tr("passbook")}</h2><div class="book"><table>
    <thead><tr><th>${tr("thDate")}</th><th>${tr("thEntry")}</th><th class="num">${tr("thAmount")}</th><th class="num">${tr("thBalance")}</th>${parent ? "<th></th>" : ""}</tr></thead>
    <tbody>${shown.map(line).join("") || `<tr><td colspan="5" class="mut">${tr("nothing")}</td></tr>`}</tbody></table></div>
    ${rows.length > 12 ? `<div><button class="btn small" type="button" data-act="all">${state.ui.all ? tr("showFewer") : tr("showAll", { n: rows.length })}</button></div>` : ""}</section>`;
}
