# Pocket Bank

A family "bank" for children's pocket money. It runs in the browser, installs like an app, works offline, and keeps all data on the device. There is no server, no account and no build step.

- **Children** see their balance, two charts and a passbook. They cannot change anything.
- **Parents** unlock a parent desk with a 4-digit PIN to add or take out money, set the bank rules, manage accounts and move the bank to another device.
- **Languages:** English, Italian, Polish, German. The language is chosen in the parent desk and applies to the whole bank.

The intended use is one bank per device: the parent makes changes on the child's device.

## Contents

1. [Using the app](#using-the-app)
2. [How interest and investments work](#how-interest-and-investments-work)
3. [Where the data lives](#where-the-data-lives)
4. [Moving the bank to another device](#moving-the-bank-to-another-device)
5. [Hosting and installing](#hosting-and-installing)
6. [Project structure](#project-structure)
7. [Common changes](#common-changes)
8. [Data formats](#data-formats)
9. [Limits](#limits)
10. [Third-party files](#third-party-files)

## Using the app

**Child's view** (always visible)

- **Balance card:** total balance, split into savings and investments, plus how much came from pocket money, from interest and from investment results. One sentence states the current rules and the next interest payout.
- **"How the money grew":** savings and investments over time. Hover or tap for the values on a day.
- **"If it stays in the bank for 5 years":** the balance projected with today's rules and no new entries, next to the same money kept in a piggy bank at home.
- **Passbook:** every entry, newest first, with a running balance.

**Parent desk** (press **Parent**; the first time you choose the PIN)

- **Record an entry:** add money, take money out, move savings to investments, or move investments back. Each entry has an amount, an optional note and a date (today or earlier). Money out and moves cannot exceed what the pot holds.
- **Bank rules:** interest on or off, its rate, per month or per year; investments on or off, their average yearly return and monthly swing; currency sign; language. A short box explains the rules and shows a worked line from the saved values.
- **Accounts and PIN:** open, rename and close accounts; change the PIN; clear example accounts.
- **This device:** move the bank to another device, receive a bank, save or load a backup file, erase the bank from this device.
- **Fixing mistakes:** while the desk is open, each manual entry in the passbook has a × to delete it. Interest and investment entries cannot be deleted.

Closing an account and erasing the bank ask twice. The desk locks again when you press the button or reload the app.

## How interest and investments work

The bank has two pots per account. **Savings** earn interest. **Investments** earn no interest; they get a monthly result that can be negative. A parent moves money between the pots.

### The month-end run

On the **1st of every month** the bank posts up to two entries per account, dated the 1st:

| Entry | Condition | Amount |
|---|---|---|
| Interest | interest is on and savings are above zero | savings × monthly interest rate |
| Investment result | investments are on and the invested amount is above zero | invested × that month's result |

- The balances used are those from all entries dated **before the 1st**.
- Amounts are rounded to whole cents. An amount that rounds to zero is not posted.
- If nobody opens the app for a while, the missed months are posted one after another the next time it opens, so interest compounds correctly. All missed months use the rules in force at that moment.
- Changing the rules affects future runs only. Entries already posted never change.
- A new account starts earning from the first month-end after it was opened.

### Interest

- **Rate per month:** the monthly rate is the rate you enter. `2% per month` on €100.00 pays €2.00.
- **Rate per year:** the yearly rate is split into twelve slices that compound back to it:
  `monthly rate = (1 + yearly rate)^(1/12) − 1`. `12% per year` gives about 0.949% per month, so €100.00 pays €0.95 the first month and reaches €112.00 after twelve payouts.

### Investments

Each month every account gets its own result:

`result = monthly average + random swing`

- `monthly average = (1 + average yearly return)^(1/12) − 1`
- `random swing` is drawn evenly between −swing and +swing, where swing is the "monthly swing ± %" you set.

Example with 8% a year and a swing of 3%: the monthly average is about +0.64%, so each month lands somewhere between about −2.4% and +3.6%. On €50.00 invested that is between −€1.18 and +€1.82.

The swing is not truly random: it is computed from the account and the month, so a given month always gives the same result on that device, however often the app is opened. Once posted, the result is an ordinary entry and travels with the bank.

A swing of 0 turns investments into a steady, second interest rate. A swing larger than the monthly average means some months lose money, which is the point of the lesson.

### The 5-year projection

The projection starts from today's two pots and applies, for 60 months, the monthly interest rate to savings and the monthly **average** to investments, with no swing, no new pocket money and no spending. It is an illustration, not a promise.

### Worked example

Rules: interest 1% per month, investments 8% a year ± 3%.

| Date | Entry | Savings | Invested |
|---|---|---|---|
| 5 May | Money in €20.00 | €20.00 | €0.00 |
| 20 May | Moved to investments €10.00 | €10.00 | €10.00 |
| 1 Jun | Interest: €10.00 × 1% = +€0.10 | €10.10 | €10.00 |
| 1 Jun | Investment result, say +2.1% = +€0.21 | €10.10 | €10.21 |
| 12 Jun | Money in €5.00 | €15.10 | €10.21 |
| 1 Jul | Interest: €15.10 × 1% = +€0.15 | €15.25 | €10.21 |
| 1 Jul | Investment result, say −1.3% = −€0.13 | €15.25 | €10.08 |

## Where the data lives

- The bank is saved in the browser's local storage on the device, under the key `pocketbank`. Nothing is uploaded.
- The site makes no requests to other hosts. Fonts and libraries are bundled in `vendor/`.
- The app asks the browser to keep its storage permanently. Browsers may still clear storage of sites that are not installed; on iPhone and iPad this can happen after about a week without use. **Install the app** and keep a **backup file** to be safe.
- Each browser on each device has its own separate bank. On iPhone and iPad, the installed app and Safari are separate too.

## Moving the bank to another device

1. On the old device: parent desk → **This device** → **Move to another device**. A QR code appears.
2. On the new device: open the app. On a fresh device press **Move a bank here**; otherwise find it in the parent desk under **This device**. Scan the code.
3. The new device now holds the bank, starts locked, and uses the same PIN.
4. Optional: on the old device use **Erase bank from this device**. Until then both devices hold independent copies.

Details:

- The code contains the whole bank including the PIN check. Show it only to your own devices.
- If the receiving device already has a bank, it asks for that device's PIN and then for confirmation before replacing it.
- If the camera is unavailable, use **Copy link** on the old device and paste the link on the new one. Scanning the code with the phone's own camera app also works, except on iPhone and iPad when the app is installed: scan from inside the app there.
- A long history is merged into monthly totals, oldest months first, until it fits in one code. Balances are unchanged. If it still cannot fit, use a backup file.
- **Backup file:** **Save backup file** downloads the bank as JSON; **Load backup file** reads one back, with the same confirmation.

## Hosting and installing

Any static host works. HTTPS is required for installing, offline use and the camera.

**Cloudflare Pages:** create a Pages project, connect this repository, leave the build command empty, set the output directory to `/`. Every push to the chosen branch redeploys.

**GitHub Pages:** repository Settings → Pages → deploy from the branch root.

**Installing:**

- Android, Chrome, Edge: press **Install app** in the header, or use the browser menu.
- iPhone, iPad: Share → **Add to Home Screen**.

**Run locally:**

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Opening `index.html` directly from disk does not work, because browsers block script modules on `file:` pages.

**Releasing a change:** raise the number in `CACHE` in `sw.js` and `VERSION` in `js/version.js` together. Installed copies show the saved version first and pick up the new one on the next start.

**If a device will not install or looks out of date:** the version is shown at the very bottom of the page. Tap it, or press **Install app**, and open **Technical details**. It lists the app version, whether the browser offered installation, the offline worker state and whether storage works. No version at the bottom means the device is showing a copy from before version 5: reload twice or clear the site's data.

## Project structure

There is no build step. The browser loads the files as they are.

```
index.html             Page skeleton and dialogs. No logic.
css/styles.css         All styling. Colours and fonts are variables at the top, light and dark.
manifest.webmanifest   App name, icons and colours for installing.
sw.js                  Offline worker: keeps a copy of the app's files.
icon.svg, icon-*.png   App icons.
js/
  app.js               Start-up. Connects buttons and forms to the actions.
  core.js              The bank's rules and arithmetic. No screen code.
  state.js             The bank held in memory; saving and loading on this device.
  actions.js           Everything a parent can do: record an entry, save rules, accounts.
  views.js             Builds the page: balance card, parent desk, passbook.
  charts.js            The two charts, drawn as SVG.
  pin.js               The parent PIN dialog.
  codec.js             Bank to QR code text and back; checks incoming data.
  transfer.js          QR dialog, camera scanner, backup files.
  install.js           Install button and offline worker registration.
  format.js            Money, dates, safe text.
  dom.js               Page helpers and the toast message.
  i18n/index.js        Picks the text for the current language.
  i18n/en.js, it.js, pl.js, de.js   One file of texts per language.
vendor/                Bundled QR libraries and fonts.
```

How the pieces fit together:

1. `app.js` loads the bank through `state.js` and asks `views.js` to draw it.
2. A click or form on the page carries a name (`data-act` or `data-form`). `app.js` looks the name up and calls the matching function in `actions.js`.
3. The action changes the bank, `state.js` saves it and tells `views.js` to redraw.
4. `core.js` is used by all of them for the arithmetic and knows nothing about the page.

## Common changes

| To change | Edit |
|---|---|
| A wording or translation | the key in `js/i18n/<language>.js` |
| Colours, fonts, spacing | variables at the top of `css/styles.css` |
| How interest is calculated | `monthlyInterestRate` and `settle` in `js/core.js` |
| How investment results are drawn | `monthlyInvestResult` in `js/core.js` |
| The length of the projection | the `60` in `drawFuture` in `js/charts.js` |
| What the balance card shows | `balanceCard` in `js/views.js` |
| A new parent button | add the button with `data-act="name"` in `js/views.js`, the handler in `parentOnly` in `js/app.js`, and the work in `js/actions.js` |
| A new rule field | default in `defaultState` (`core.js`), input in `rulesSection` (`views.js`), saving in `saveRules` (`actions.js`), and `normalize`, `pack`, `unpack` in `codec.js` so it survives a move |

**Add a language:**

1. Copy `js/i18n/en.js` to `js/i18n/xx.js` and translate the values. Keep the keys and the `{placeholders}`. `mon` is the twelve short month names.
2. In `js/i18n/index.js`, import the file and add it to `TEXT` and `LANGS`.
3. Add the file to `FILES` in `sw.js` and raise `CACHE`.

After any change, raise `CACHE` in `sw.js`, and add new files to `FILES`.

## Data formats

**Stored bank and backup file** (JSON; amounts in whole cents):

```json
{
  "v": 1, "lang": "en", "currency": "€", "pinHash": "…", "example": false,
  "interest": { "on": true, "rate": 1, "per": "month" },
  "invest": { "on": true, "rate": 8, "swing": 3 },
  "kids": [
    { "id": "k3x9q", "name": "Mila", "thru": "2026-11",
      "tx": [ { "id": "a1b2c3d", "d": "2026-11-07", "t": "in", "a": 500, "n": "Weekly pocket money" } ] }
  ]
}
```

- `thru` is the last month whose month-end run was posted for that account.
- Entry kinds `t`: `in` money in, `out` money out, `int` interest, `buy` moved to investments, `sell` moved back to savings, `ret` investment result.
- `pinHash` is a SHA-256 hash of the PIN. The PIN itself is not stored.

**Transfer link:** `https://<site>/#m=<code>`. The code is the bank in a compact form (short keys, entries as arrays), compressed with deflate and written as URL-safe base64. The first character is `z` for compressed or `r` for uncompressed. The part after `#` is never sent to the host. The link is kept under 1400 characters so the QR code stays readable.

Anything that arrives from a code or a file is rebuilt field by field by `normalize` in `js/codec.js`; unknown fields are dropped, and ids are generated afresh.

## Limits

- **The PIN is a child-gate, not security.** Everything runs on the device, so someone with the browser's developer tools can read or change the bank. A 4-digit PIN hash can also be guessed quickly by a program.
- **Anyone who captures the transfer code has a copy of the bank.**
- **No sync.** Two devices never update each other; a move is a one-time copy.
- **Old months' rules are not kept.** Catch-up after a long pause uses the current rules for all missed months.
- **Back-dated entries do not recalculate** interest or results that were already posted.
- **Deleting entries can make a past balance negative.** The app does not prevent it.

## Third-party files

- `vendor/qrcode.js`: qrcode-generator by Kazuhiko Arase, MIT licence.
- `vendor/jsQR.js`: jsQR by Cosmo Wolfe, Apache 2.0 licence.
- `vendor/fonts/`: Fredoka, Nunito and DM Mono, SIL Open Font License 1.1.
