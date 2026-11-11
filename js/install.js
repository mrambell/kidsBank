// What makes the site behave like an app: the Install button and the offline worker (sw.js).

import { tr } from "./i18n/index.js";
import { $ } from "./dom.js";

/** True when the app is already running as an installed app (own window, no browser bars). */
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

export function initInstall() {
  const button = $("#install");
  button.hidden = installed();

  // Chrome, Edge and Android hand us an install prompt. Other browsers (Safari, Firefox) do not,
  // so there the button explains where to find "install" in the browser's own menu.
  let prompt = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; });
  button.onclick = () => {
    if (prompt) { prompt.prompt(); prompt = null; return; }
    $("#inst-title").textContent = tr("install");
    $("#inst-text").textContent = tr("installHint");
    $("#inst-close").textContent = tr("closeBtn");
    $("#inst").showModal();
  };
  $("#inst-close").onclick = () => $("#inst").close();
  addEventListener("appinstalled", () => { button.hidden = true; });

  // Offline support. Browsers only allow this on https (and localhost).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
