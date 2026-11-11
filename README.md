# Pocket Bank

A children's "bank" web app for tracking pocket money. Prototype, single file, no build step.

- Children see their balance, charts and a passbook. They cannot change anything.
- Parents unlock a parent desk with a 4-digit PIN to add or take out money, switch on interest (per month or per year) and investments, manage accounts and choose the language.
- Languages: English, Italian, Polish, German.

## Run

Open `index.html` in a browser.

## Storage

Opened as a plain file or from a web server, the bank is saved in that browser's local storage, so each device has its own separate bank. When published as a Claude artifact, it uses the artifact's shared database instead, so all viewers see the same bank.

## Limits

The PIN only hides the parent controls on screen. It is a child-gate, not security.
