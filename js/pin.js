// The parent PIN. It only hides the parent desk on screen: a child-gate, not real security.
// The PIN itself is never stored, only a scrambled form (hash) of it.

import { state, save, refresh } from "./state.js";
import { tr } from "./i18n/index.js";
import { $, toast } from "./dom.js";

async function hash(pin) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("pocketbank:" + pin));
  return [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
}

let mode = "enter", afterUnlock = null;

/** Open the PIN dialog. mode "set" chooses a new PIN, "enter" checks it; `then` runs after a correct PIN. */
export function askPin(newMode, then) {
  mode = newMode; afterUnlock = then || null;
  $("#pin-in").value = ""; $("#pin-err").textContent = "";
  $("#pin-title").textContent = tr(mode === "set" ? "pinChoose" : "pinTitle");
  $("#pin-sub").textContent = tr(mode === "set" ? "pinSetSub" : "pinEnterSub");
  $("#pin-cancel").textContent = tr("cancel");
  $("#pin").showModal(); $("#pin-in").focus();
}

/** The Parent button: lock if open, otherwise ask for the PIN (or choose one the first time). */
export function toggleLock() {
  if (state.unlocked) { state.unlocked = false; refresh(); }
  else askPin(state.bank.pinHash ? "enter" : "set");
}

export function initPin() {
  $("#lock").onclick = toggleLock;
  $("#pin-cancel").onclick = () => { afterUnlock = null; $("#pin").close(); };
  $("#pin-form").addEventListener("submit", async e => {
    e.preventDefault();
    const pin = $("#pin-in").value;
    if (!/^\d{4}$/.test(pin)) { $("#pin-err").textContent = tr("pin4"); return; }
    const h = await hash(pin);
    if (mode === "set") {
      state.bank.pinHash = h; state.unlocked = true; $("#pin").close(); save(); toast(tr("pinSaved"));
    } else if (h === state.bank.pinHash) {
      state.unlocked = true; $("#pin").close(); refresh();
      if (afterUnlock) { const fn = afterUnlock; afterUnlock = null; fn(); }
    } else { $("#pin-err").textContent = tr("pinWrong"); $("#pin-in").value = ""; }
  });
}
