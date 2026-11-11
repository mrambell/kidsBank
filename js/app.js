// Start-up and wiring: connects clicks and forms on the page to the actions.
// Reading order for the code: core.js (rules) -> state.js (data) -> actions.js (changes) -> views.js (screen).

import { state, load, onChange, refresh, currentKid, emptyDevice, eraseBank } from "./state.js";
import { settle, today } from "./core.js";
import { tr } from "./i18n/index.js";
import { $, toast } from "./dom.js";
import { render, drawCharts } from "./views.js";
import { initPin, askPin } from "./pin.js";
import { initTransfer, showQr, openScan, saveBackup, chooseBackupFile } from "./transfer.js";
import { initInstall } from "./install.js";
import * as actions from "./actions.js";

const app = $("#app"), ui = state.ui;

/* Buttons: every button in the page body carries data-act="name". */
const anyone = {            // allowed without the PIN
  pick: id => { ui.kid = id; ui.all = false; refresh(); },
  all: () => { ui.all = !ui.all; refresh(); },
};
const parentOnly = {        // need the parent desk to be open
  pin: () => askPin("set"),
  qr: showQr,
  scan: openScan,
  backup: saveBackup,
  restore: chooseBackupFile,
  rename: id => { const name = $("#n-" + id).value.trim(); if (name) toast(actions.renameAccount(id, name)); },
  remove: id => { if (ui.arm !== id) { ui.arm = id; ui.accts = true; refresh(); } else toast(actions.closeAccount(id)); },   // asks twice
  clear: () => toast(actions.clearExamples()),
  del: id => toast(actions.deleteEntry(id)),
  erase: () => { if (!ui.armErase) { ui.armErase = true; ui.dev = true; refresh(); } else { eraseBank(); toast(tr("erased")); } },   // asks twice
};

app.addEventListener("click", e => {
  const button = e.target.closest("[data-act]");
  if (!button) return;
  const name = button.dataset.act, id = button.dataset.id;
  if (anyone[name]) anyone[name](id);
  else if (name === "scan" && emptyDevice()) openScan();       // a fresh device may receive a bank without a PIN
  else if (state.unlocked && parentOnly[name]) parentOnly[name](id);
});

/* Forms: every form carries data-form="name". All of them are parent-only. */
const forms = {
  tx: () => toast(actions.recordEntry({ kind: $("#tx-type").value, amount: $("#tx-amt").value, date: $("#tx-date").value, note: $("#tx-note").value })),
  rules: () => toast(actions.saveRules({
    interestOn: $("#r-int").checked, interestRate: $("#r-rate").value, interestPer: $("#r-per").value,
    investOn: $("#r-inv").checked, investRate: $("#r-irate").value, investSwing: $("#r-swing").value,
    currency: $("#r-cur").value, lang: $("#r-lang").value })),
  kid: () => { const name = $("#k-name").value.trim(); if (name) toast(actions.openAccount(name)); },
};

app.addEventListener("submit", e => {
  e.preventDefault();
  const handler = forms[e.target.dataset.form];
  if (state.unlocked && handler) handler();
});

/* Remember which parent-desk sections are open, so a redraw does not close them. */
app.addEventListener("toggle", e => { const key = e.target.dataset && e.target.dataset.d; if (key) ui[key] = e.target.open; }, true);

/* Redraw the charts when the page width or the colour theme changes. */
let resizeTimer;
new ResizeObserver(() => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawCharts, 120); }).observe(app);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", refresh);

/* If the app stays open over a month change, post the month-end entries when it comes back into view. */
document.addEventListener("visibilitychange", () => { if (!document.hidden && settle(state.bank, today())) refresh(); });

onChange(render);
initPin();
initInstall();
load();
initTransfer();
