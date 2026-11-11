# Pocket Bank

A children's "bank" web app for tracking pocket money. Installable, works offline, no build step, no server.

- Children see their balance, charts and a passbook. They cannot change anything.
- Parents unlock a parent desk with a 4-digit PIN to add or take out money, switch on interest (per month or per year) and investments, manage accounts and choose the language.
- Languages: English, Italian, Polish, German.

## Where the data lives

The bank is stored only in the browser storage of the device it is used on. Nothing is uploaded. The site makes no requests to other hosts; fonts and libraries are bundled in `vendor/`.

The intended use is one bank per device: the parent makes changes on the child's device.

- **Move to another device**: the parent desk shows a QR code holding the whole bank, PIN included. On the new device open the app, choose "Move a bank here" and scan it. Opening the scanned link with the device camera works too. Long histories are merged into monthly totals so they fit in one code.
- **Backup**: save or load the bank as a JSON file from the parent desk.
- **Erase**: remove the bank from a device after moving it.

On iPhone and iPad the installed app and Safari keep separate storage, so scan from inside the installed app.

## Hosting

Any static host works. For Cloudflare Pages: connect this repository, leave the build command empty and set the output directory to `/`. HTTPS is required for installing, offline use and the camera.

After changing files, bump `CACHE` in `sw.js` so installed copies pick up the new version.

## Run locally

Serve the folder, for example `python3 -m http.server`, and open `http://localhost:8000`.

## Limits

The PIN only hides the parent controls on screen. It is a child-gate, not security. Anyone who sees the transfer code can copy the bank.

## Third-party files

- `vendor/qrcode.js`: qrcode-generator by Kazuhiko Arase, MIT.
- `vendor/jsQR.js`: jsQR by Cosmo Wolfe, Apache 2.0.
- `vendor/fonts/`: Fredoka, Nunito and DM Mono, SIL Open Font License 1.1.
