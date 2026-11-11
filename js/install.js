// What makes the site behave like an app: the Install button and the offline worker (sw.js).
// The Install dialog also lists technical details, to find out why a device will not install.

import { tr } from "./i18n/index.js";
import { $ } from "./dom.js";
import { VERSION } from "./version.js";

/** True when the app is already running as an installed app (own window, no browser bars). */
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

let prompt = null;          // the browser's install prompt, when it offers one
let promptSeen = false, promptResult = "";

/** Facts about this device and browser, as [label, value] pairs. */
async function facts() {
  let worker = "not supported", persisted = "unknown";
  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      worker = !reg ? "not registered" : reg.active ? "active" : reg.installing ? "installing" : "waiting";
      if (reg && navigator.serviceWorker.controller) worker += ", controlling this page";
    }
  } catch (e) { worker = "error: " + e.message; }
  try { if (navigator.storage && navigator.storage.persisted) persisted = (await navigator.storage.persisted()) ? "yes" : "no"; } catch (e) {}
  let storage = "works";
  try { localStorage.setItem("pocketbank-test", "1"); localStorage.removeItem("pocketbank-test"); } catch (e) { storage = "blocked"; }
  return [
    ["App version", VERSION],
    ["Address", location.origin + location.pathname],
    ["Secure (https)", window.isSecureContext ? "yes" : "no"],
    ["Running installed", installed() ? "yes" : "no"],
    ["Browser offered install", promptSeen ? "yes" + (promptResult ? ", answer: " + promptResult : "") : "no"],
    ["Offline worker", worker],
    ["Device storage", storage + ", kept permanently: " + persisted],
    ["Browser", navigator.userAgent],
  ];
}

async function openDialog() {
  $("#inst-title").textContent = tr("install");
  $("#inst-text").textContent = tr("installHint");
  $("#inst-close").textContent = tr("closeBtn");
  $("#inst-facts").textContent = "";
  $("#inst").showModal();
  $("#inst-facts").textContent = (await facts()).map(f => f[0] + ": " + f[1]).join("\n");
}

export function initInstall() {
  const button = $("#install");
  button.hidden = installed();
  $("#version").textContent = "Pocket Bank " + VERSION;

  // Chrome, Edge and Android hand us an install prompt. Other browsers (Safari, Firefox) do not,
  // and neither does Chrome when installing is not allowed; then the button opens the dialog instead.
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; promptSeen = true; });
  button.onclick = async () => {
    if (!prompt) { openDialog(); return; }
    const p = prompt; prompt = null;
    try { p.prompt(); promptResult = (await p.userChoice).outcome; } catch (e) { promptResult = "error: " + e.message; }
    if (promptResult !== "accepted") openDialog();
  };
  $("#version").onclick = openDialog;
  $("#inst-close").onclick = () => $("#inst").close();
  addEventListener("appinstalled", () => { button.hidden = true; promptResult = "installed"; });

  // Offline support. Browsers only allow this on https (and localhost).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
