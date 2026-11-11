// The one place that holds the bank while the app is open, and saves it on this device.
// Nothing here talks to a server: the bank lives in this browser's localStorage only.

import { defaultState, settle, today } from "./core.js";

const STORAGE_KEY = "pocketbank";

export const state = {
  bank: defaultState(),
  unlocked: false,          // true while the parent desk is open
  storageFailed: false,     // true if this browser refused to save
  ui: { kid: null, all: false, rules: false, accts: false, dev: false, arm: null, armErase: false },
};

const listeners = [];
/** Call `fn` every time the screen should be redrawn. */
export const onChange = fn => listeners.push(fn);
/** Redraw the screen without saving. */
export const refresh = () => listeners.forEach(fn => fn());

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.bank));
    state.storageFailed = false;
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  } catch (e) { state.storageFailed = true; }
}

/** Read the bank from this device and post any month-end entries that are due. */
export function load() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) {}
  state.bank = Object.assign(defaultState(), data || {});
  if (settle(state.bank, today())) persist();
  refresh();
}

/** Save the bank on this device and redraw. */
export function save() { persist(); refresh(); }

/** Swap in a whole bank that arrived from another device or a backup file. */
export function replaceBank(bank) {
  state.bank = bank;
  settle(state.bank, today());
  state.unlocked = false;
  state.ui.kid = null;
  state.ui.dev = false;
  save();
}

/** Remove the bank from this device. */
export function eraseBank() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
  state.bank = defaultState();
  state.unlocked = false;
  state.ui.armErase = false;
  refresh();
}

/** The account currently shown. */
export const currentKid = () => state.bank.kids.find(k => k.id === state.ui.kid) || state.bank.kids[0] || null;

/** True on a fresh device: no accounts and no PIN yet. */
export const emptyDevice = () => !state.bank.pinHash && !state.bank.kids.length;
