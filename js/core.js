// The bank's rules and arithmetic. No screen code here: everything is a plain function
// of the bank data, so this is the file to read (or change) to see how money moves.
//
// Bank data shape:
//   { v, lang, currency, pinHash, example,
//     interest: { on, rate, per: "month" | "year" },
//     invest:   { on, rate, swing },
//     kids: [ { id, name, thru: "YYYY-MM", tx: [ { id, d: "YYYY-MM-DD", t, a, n } ] } ] }
// Amounts (a) are whole cents. Entry kinds (t):
//   in = money paid in      out = money taken out     int = interest paid by the bank
//   buy = savings moved to investments    sell = investments moved back    ret = monthly investment result

export const KINDS = ["in", "out", "int", "buy", "sell", "ret"];

export function defaultState() {
  return {
    v: 1, lang: "en", currency: "€", pinHash: "", example: false,
    interest: { on: false, rate: 1, per: "month" },
    invest: { on: false, rate: 6, swing: 3 },
    kids: [],
  };
}

/** Today's date as "YYYY-MM-DD" in the device's time zone. */
export function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export const byDate = (a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0);

/** "2026-12" -> "2027-01" */
export function nextMonth(ym) {
  let y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1;
  if (m > 12) { m = 1; y++; }
  return y + "-" + String(m).padStart(2, "0");
}

/** A repeatable "random" number from 0 to 1 for a given text, so a month's investment swing never changes. */
export function random01(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  h += 0x6D2B79F5;
  let t = Math.imul(h ^ (h >>> 15), 1 | h);
  t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Interest paid on savings each month, as a fraction. A yearly rate is split so 12 months compound to it. */
export function monthlyInterestRate(bank) {
  const r = bank.interest.rate / 100;
  return bank.interest.per === "month" ? r : Math.pow(1 + r, 1 / 12) - 1;
}

/** The average monthly investment result, as a fraction, before the random swing. */
export function monthlyInvestBase(bank) {
  return Math.pow(1 + bank.invest.rate / 100, 1 / 12) - 1;
}

/** The investment result for one account in one month: average plus or minus a swing. */
export function monthlyInvestResult(bank, kidId, ym) {
  return monthlyInvestBase(bank) + (random01(kidId + ym) * 2 - 1) * bank.invest.swing / 100;
}

/** Add up an account's entries. With `before`, only entries dated earlier than that day count. */
export function balances(kid, before) {
  let sav = 0, inv = 0, paid = 0, int = 0, ret = 0;
  for (const t of kid.tx) {
    if (before && t.d >= before) continue;
    if (t.t === "in") { sav += t.a; paid += t.a; }
    else if (t.t === "out") { sav -= t.a; paid -= t.a; }
    else if (t.t === "int") { sav += t.a; int += t.a; }
    else if (t.t === "buy") { sav -= t.a; inv += t.a; }
    else if (t.t === "sell") { sav += t.a; inv -= t.a; }
    else if (t.t === "ret") { inv += t.a; ret += t.a; }
  }
  return { sav, inv, paid, int, ret, total: sav + inv };
}

/**
 * Month-end run: for every month that has started since an account was last settled,
 * post interest and the investment result on the 1st. Returns true if anything was added.
 */
export function settle(bank, day) {
  const current = day.slice(0, 7);
  let changed = false;
  for (const kid of bank.kids) {
    if (!kid.thru) { kid.thru = current; changed = true; }
    let m = kid.thru;
    while (m < current) {
      m = nextMonth(m);
      const first = m + "-01", b = balances(kid, first);
      if (bank.interest.on && b.sav > 0) {
        const a = Math.round(b.sav * monthlyInterestRate(bank));
        if (a) kid.tx.push({ id: "i" + m, d: first, t: "int", a, n: "" });
      }
      if (bank.invest.on && b.inv > 0) {
        const a = Math.round(b.inv * monthlyInvestResult(bank, kid.id, m));
        if (a) kid.tx.push({ id: "r" + m, d: first, t: "ret", a, n: "" });
      }
      kid.thru = m;
      changed = true;
    }
    kid.tx.sort(byDate);
  }
  return changed;
}

/** What a balance would be each month for `months` months with today's rules and no new entries. */
export function projection(bank, kid, months) {
  const b = balances(kid);
  let sav = b.sav, inv = b.inv;
  const out = [b.total];
  for (let m = 1; m <= months; m++) {
    if (bank.interest.on) sav *= 1 + monthlyInterestRate(bank);
    if (bank.invest.on) inv *= 1 + monthlyInvestBase(bank);
    out.push(Math.round(sav + inv));
  }
  return out;
}
