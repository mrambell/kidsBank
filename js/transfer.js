// Moving the bank between devices and backup files: the QR dialog, the camera scanner,
// the "replace this bank?" question, and saving or loading a JSON file.
// Uses the two bundled libraries loaded in index.html: qrcode (draws codes) and jsQR (reads them).

import { state, replaceBank, emptyDevice } from "./state.js";
import { normalize, bankFromCode, transferLink } from "./codec.js";
import { today } from "./core.js";
import { tr } from "./i18n/index.js";
import { $, toast } from "./dom.js";
import { askPin } from "./pin.js";

/* ----- show the code on the old device ----- */

let shownLink = "";

export async function showQr() {
  const result = await transferLink(state.bank, location.href), canvas = $("#qr-canvas");
  $("#qr-title").textContent = tr("moveOut");
  $("#qr-close").textContent = tr("closeBtn");
  $("#qr-copy").textContent = tr("copyLink");
  $("#qr-text").textContent = tr(result ? "qrText" : "qrTooBig");
  $("#qr-note").textContent = result && result.merged ? tr("qrMerged") : "";
  $("#qr-note").hidden = !(result && result.merged);
  canvas.hidden = !result; $("#qr-copy").hidden = !result;
  if (result) {
    shownLink = result.url;
    const qr = window.qrcode(0, "L"); qr.addData(result.url); qr.make();
    const n = qr.getModuleCount(), px = 6, margin = 4;
    canvas.width = canvas.height = (n + margin * 2) * px;
    const g = canvas.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = "#000";
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (qr.isDark(y, x)) g.fillRect((x + margin) * px, (y + margin) * px, px, px);
  }
  $("#qr").showModal();
}

/* ----- scan the code on the new device ----- */

let camera = null, scanning = false;

export async function openScan() {
  $("#scan-title").textContent = tr("moveIn");
  $("#scan-text").textContent = tr("scanText");
  $("#scan-lab").textContent = tr("pasteLink");
  $("#scan-close").textContent = tr("cancel");
  $("#scan-use").textContent = tr("useLink");
  $("#scan-paste").value = "";
  const video = $("#scan-video");
  video.hidden = false;
  $("#scan").showModal();
  try {
    camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    if (!$("#scan").open) { stopScan(); return; }
    video.srcObject = camera; await video.play(); scanning = true;
    const frame = document.createElement("canvas"), g = frame.getContext("2d", { willReadFrequently: true });
    const look = () => {
      if (!scanning) return;
      if (video.videoWidth) {
        const k = Math.min(1, 900 / Math.max(video.videoWidth, video.videoHeight));
        frame.width = video.videoWidth * k | 0; frame.height = video.videoHeight * k | 0;
        g.drawImage(video, 0, 0, frame.width, frame.height);
        const hit = window.jsQR(g.getImageData(0, 0, frame.width, frame.height).data, frame.width, frame.height, { inversionAttempts: "dontInvert" });
        if (hit && hit.data.includes("#m=")) { $("#scan").close(); incoming(hit.data.split("#m=")[1]); return; }
      }
      requestAnimationFrame(look);
    };
    look();
  } catch (e) { video.hidden = true; $("#scan-text").textContent = tr("noCam"); }
}

function stopScan() {
  scanning = false;
  if (camera) { camera.getTracks().forEach(t => t.stop()); camera = null; }
  $("#scan-video").srcObject = null;
}

/* ----- a bank arrives: from a scan, a pasted or opened link, or a backup file ----- */

/** Handle a transfer code. Also removes it from the address bar so it is not kept in history. */
export async function incoming(code) {
  if (location.hash) history.replaceState(null, "", location.pathname + location.search);
  let bank;
  try { bank = await bankFromCode(code); } catch (e) { toast(tr("badCode")); return; }
  offer(bank);
}

let waiting = null;

/** Take the bank straight away on an empty device; otherwise require the PIN and a clear yes. */
function offer(bank) {
  const ask = () => {
    waiting = bank;
    $("#imp-title").textContent = tr("impTitle");
    $("#imp-text").textContent = tr("impText", { names: bank.kids.map(k => k.name).join(", ") || tr("impNone") });
    $("#imp-cancel").textContent = tr("cancel");
    $("#imp-ok").textContent = tr("replace");
    $("#imp").showModal();
  };
  if (emptyDevice()) accept(bank);
  else if (state.unlocked) ask();
  else askPin("enter", ask);
}

function accept(bank) { replaceBank(bank); toast(tr("moved")); }

/* ----- backup file ----- */

export function saveBackup() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(state.bank, null, 1)], { type: "application/json" }));
  a.download = "pocket-bank-" + today() + ".json";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export const chooseBackupFile = () => $("#file-in").click();

/* ----- wiring ----- */

export function initTransfer() {
  $("#qr-close").onclick = () => $("#qr").close();
  $("#qr-copy").onclick = () => { navigator.clipboard.writeText(shownLink).then(() => toast(tr("copied")), () => {}); };

  $("#scan").addEventListener("close", stopScan);
  $("#scan-close").onclick = () => $("#scan").close();
  $("#scan-form").addEventListener("submit", e => {
    e.preventDefault();
    const text = $("#scan-paste").value.trim();
    if (!text) return;
    $("#scan").close();
    incoming(text.includes("#m=") ? text.split("#m=")[1] : text);
  });

  $("#imp-cancel").onclick = () => { waiting = null; $("#imp").close(); };
  $("#imp-ok").onclick = () => { const bank = waiting; waiting = null; $("#imp").close(); if (bank) accept(bank); };

  $("#file-in").addEventListener("change", async e => {
    const file = e.target.files[0]; e.target.value = "";
    if (!file) return;
    try { offer(normalize(JSON.parse(await file.text()))); } catch (err) { toast(tr("badFile")); }
  });

  // a transfer link opened directly in the browser
  const fromAddress = () => { if (location.hash.startsWith("#m=")) incoming(location.hash.slice(3)); };
  addEventListener("hashchange", fromAddress);
  fromAddress();
}
