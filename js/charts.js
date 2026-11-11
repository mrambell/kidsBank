// The two charts, drawn as plain SVG. chart() is the generic drawing function;
// drawHistory() and drawFuture() prepare the numbers for it.

import { state } from "./state.js";
import { balances, projection, today } from "./core.js";
import { tr, monthName } from "./i18n/index.js";
import { esc, money, ms } from "./format.js";
import { $ } from "./dom.js";

const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function legend(el, names, colors) {
  el.innerHTML = names.length > 1
    ? `<div class="legend">${names.map((n, i) => `<span><i class="sw" style="background:var(${colors[i]})"></i>${n}</span>`).join("")}</div>` : "";
}

/**
 * Draw a line or stacked-area chart into `el`.
 *   rows    [{ x, vals: [number per series] }], x ascending
 *   names   series names        colors  CSS variable names, one per series
 *   stack   stack the series    step    draw as steps (balances change on a day, not gradually)
 *   dash    [true/false per series]     ticks  [{ x, label, anchor }]
 *   xLabel  x -> text for the hover box     aria  description for screen readers
 */
function chart(el, o) {
  const W = Math.max(260, el.clientWidth), H = 220, left = 46, right = 10, top = 10, bottom = 24, n = o.names.length;
  const tops = o.rows.map(r => { let sum = 0; return r.vals.map(v => (o.stack ? (sum += v) : v)); });
  const x0 = o.rows[0].x, x1 = Math.max(o.rows[o.rows.length - 1].x, x0 + 1);

  // y axis: pick a round step so there are at most four gridlines
  const vmax = Math.max(1, ...tops.flat()), pow = Math.pow(10, Math.floor(Math.log10(vmax)));
  const stepY = [1, 2, 5, 10].map(s => s * pow).find(s => vmax / s <= 4), ymax = Math.ceil(vmax / stepY) * stepY;
  const X = x => left + (x - x0) / (x1 - x0) * (W - left - right);
  const Y = v => top + (1 - Math.max(0, v) / ymax) * (H - top - bottom);

  // points of series i (i = -1 is the zero line)
  const line = i => {
    const pts = [];
    o.rows.forEach((r, j) => {
      const v = i < 0 ? 0 : tops[j][i];
      if (o.step && j) pts.push([X(r.x), Y(i < 0 ? 0 : tops[j - 1][i])]);
      pts.push([X(r.x), Y(v)]);
    });
    return pts;
  };
  const path = pts => pts.map((q, i) => (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1)).join("");

  let s = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(o.aria)}">`;
  for (let v = 0; v <= ymax + 1; v += stepY)
    s += `<line x1="${left}" x2="${W - right}" y1="${Y(v)}" y2="${Y(v)}" stroke="${cssVar("--line")}" stroke-width="1"/><text x="${left - 6}" y="${Y(v) + 4}" text-anchor="end">${money(v, stepY >= 100)}</text>`;
  o.ticks.forEach(t => { s += `<text x="${X(t.x)}" y="${H - 6}" text-anchor="${t.anchor || "middle"}">${t.label}</text>`; });
  for (let i = n - 1; i >= 0; i--) {
    const c = cssVar(o.colors[i]), upper = line(i);
    if (o.stack) s += `<path d="${path(upper)}${path(line(i - 1).reverse()).replace(/M/g, "L")}Z" fill="${c}" fill-opacity=".28" stroke="none"/>`;
    s += `<path d="${path(upper)}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" ${o.dash && o.dash[i] ? 'stroke-dasharray="5 4"' : ""}/>`;
  }
  const dot = (i, extra) => `<circle ${extra} r="4" fill="${cssVar(o.colors[i])}" stroke="${cssVar("--card")}" stroke-width="2"/>`;
  const last = o.rows.length - 1;
  for (let i = 0; i < n; i++) s += dot(i, `cx="${X(o.rows[last].x)}" cy="${Y(tops[last][i])}"`);
  s += `<g class="hv" visibility="hidden"><line y1="${top}" y2="${H - bottom}" stroke="${cssVar("--muted")}" stroke-width="1"/>${o.names.map((_, i) => dot(i, "")).join("")}</g>`;
  s += `<rect x="${left}" y="${top}" width="${W - left - right}" height="${H - top - bottom}" fill="transparent"/></svg><div class="tip" hidden></div>`;
  el.innerHTML = s;

  // hover: a vertical line, a dot per series, and a box with the values
  const hover = el.querySelector(".hv"), tip = el.querySelector(".tip"), svg = el.querySelector("svg");
  const move = e => {
    const box = svg.getBoundingClientRect(), px = (e.clientX - box.left) * W / box.width, xv = x0 + (px - left) / (W - left - right) * (x1 - x0);
    let j = 0;
    if (o.step) o.rows.forEach((r, i) => { if (r.x <= xv) j = i; });
    else { let best = Infinity; o.rows.forEach((r, i) => { const d = Math.abs(r.x - xv); if (d < best) { best = d; j = i; } }); }
    const cx = o.step ? Math.min(Math.max(px, left), W - right) : X(o.rows[j].x);
    hover.setAttribute("visibility", "visible");
    hover.querySelector("line").setAttribute("x1", cx); hover.querySelector("line").setAttribute("x2", cx);
    hover.querySelectorAll("circle").forEach((c, i) => { c.setAttribute("cx", cx); c.setAttribute("cy", Y(tops[j][i])); });
    const r = o.rows[j];
    tip.innerHTML = `<div><strong>${o.xLabel(o.step ? Math.max(x0, Math.min(xv, x1)) : r.x)}</strong></div>`
      + o.names.map((name, i) => `<div><i class="sw" style="background:var(${o.colors[i]})"></i>${name}<b>${money(r.vals[i])}</b></div>`).reverse().join("")
      + (o.stack && n > 1 ? `<div>${tr("total")}<b>${money(r.vals.reduce((a, b) => a + b, 0))}</b></div>` : "");
    tip.hidden = false;
    const w = tip.offsetWidth, sx = cx * box.width / W;
    tip.style.left = Math.max(0, Math.min(sx + 10 + w > box.width ? sx - 10 - w : sx + 10, box.width - w)) + "px";
  };
  svg.addEventListener("pointermove", move);
  svg.addEventListener("pointerdown", move);
  svg.addEventListener("pointerleave", () => { hover.setAttribute("visibility", "hidden"); tip.hidden = true; });
}

/** Savings and investments over time, from the first entry until today. */
export function drawHistory(kid) {
  const bank = state.bank, t = today(), showInv = bank.invest.on || kid.tx.some(x => x.t === "buy");
  const dates = [...new Set(kid.tx.map(x => x.d))].sort();
  const vals = (sav, inv) => (showInv ? [sav, inv] : [sav]);
  const rows = [{ x: ms(dates[0] || t) - 2 * 864e5, vals: vals(0, 0) }];
  for (const d of dates) { const b = balances({ tx: kid.tx.filter(x => x.d <= d) }); rows.push({ x: ms(d), vals: vals(b.sav, b.inv) }); }
  if (ms(t) > rows[rows.length - 1].x) rows.push({ x: ms(t), vals: rows[rows.length - 1].vals.slice() });

  // one label per month start, thinned out to at most six
  const x0 = rows[0].x, x1 = rows[rows.length - 1].x, span = x1 - x0, ticks = [];
  let y = new Date(x0).getUTCFullYear(), m = new Date(x0).getUTCMonth() + 1;
  for (; ; m++) { if (m > 11) { m = 0; y++; } const x = Date.UTC(y, m, 1); if (x > x1) break; ticks.push({ x, label: monthName(m) + (m === 0 ? " " + y : "") }); }
  const every = Math.ceil(ticks.length / 6);

  const names = showInv ? [tr("savings"), tr("invested")] : [tr("savings")], colors = ["--s1", "--s2"];
  legend($("#lg1"), names, colors);
  chart($("#c1"), { rows, names, colors, stack: true, step: true, aria: tr("ariaHist"),
    ticks: ticks.filter((q, j) => j % every === 0 && (q.x - x0) / span > .04 && (q.x - x0) / span < .97),
    xLabel: x => { const d = new Date(x); return d.getUTCDate() + " " + monthName(d.getUTCMonth()) + " " + d.getUTCFullYear(); } });
}

/** Five years ahead with today's rules, next to the same money kept at home. */
export function drawFuture(kid) {
  const bank = state.bank, b = balances(kid), el = $("#c2"), text = $("#p2");
  if (!(bank.interest.on || (bank.invest.on && b.inv > 0)) || b.total <= 0) {
    el.innerHTML = ""; $("#lg2").innerHTML = "";
    text.innerHTML = `<p class="sub">${tr(b.total <= 0 ? "futEmpty" : "futOff")}</p>`;
    return;
  }
  const grown = projection(bank, kid, 60), rows = grown.map((v, m) => ({ x: m, vals: [b.total, v] }));
  text.innerHTML = `<p class="sub">${tr("futText", { a: money(b.total), b: money(grown[60]) })}</p>`;
  const names = [tr("piggy"), tr("inBank")], colors = ["--s0", "--s1"];
  legend($("#lg2"), names, colors);
  chart(el, { rows, names, colors, stack: false, step: false, dash: [true, false], aria: tr("ariaFut"),
    ticks: [0, 12, 24, 36, 48, 60].map(x => ({ x, label: x ? x / 12 + " " + tr("yr") : tr("today"), anchor: x === 0 ? "start" : x === 60 ? "end" : "middle" })),
    xLabel: x => (x ? (x >= 12 ? Math.floor(x / 12) + " " + tr("yr") + " " : "") + (x % 12 ? x % 12 + " " + tr("mo") : "") : tr("today")) });
}
