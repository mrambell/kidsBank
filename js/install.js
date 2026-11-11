// What makes the site behave like an app: the Install button and the offline worker (sw.js).

import { $ } from "./dom.js";

export function initInstall() {
  // Chrome, Edge and Android offer an install prompt; show our button when they do.
  let prompt = null;
  addEventListener("beforeinstallprompt", e => { e.preventDefault(); prompt = e; $("#install").hidden = false; });
  $("#install").onclick = () => { if (prompt) { prompt.prompt(); prompt = null; $("#install").hidden = true; } };
  addEventListener("appinstalled", () => { $("#install").hidden = true; });

  // Offline support. Browsers only allow this on https (and localhost).
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost"))
    navigator.serviceWorker.register("sw.js").catch(() => {});
}
