"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { formatDate, type Row } from "../shared";
import { CompactTicker } from "./compact";

// Axis: voice. A mono command line like the skills-site hero: a SQL query
// types itself out, the result count lands, stats count up. Left aligned.
const QUERY = "SELECT quote, signature FROM testimonials WHERE approved;";
const MS = 26; // per character
const START = 300;

const CSS = `
@keyframes ht-type { from { clip-path: inset(0 100% 0 0); } }
@keyframes ht-caret { from { transform: translateX(0); } }
@keyframes ht-blink { 50% { opacity: 0; } }
@keyframes ht-in { from { opacity: 0; transform: translateY(6px); } }
@media (prefers-reduced-motion: no-preference) {
  .ht-type {
    animation: ht-type calc(var(--n) * ${MS}ms) steps(var(--n), end) ${START}ms both;
  }
  .ht-caret {
    animation:
      ht-caret calc(var(--n) * ${MS}ms) steps(var(--n), end) ${START}ms both,
      ht-blink 1s steps(1) calc(var(--n) * ${MS}ms + ${START}ms) infinite;
  }
  .ht-in {
    animation: ht-in 320ms cubic-bezier(0.23, 1, 0.32, 1) var(--d, 0ms) both;
  }
}
`;

function Count({ to, delay }: { to: number; delay: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now() + delay;
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - t0) / 700));
      setN(Math.round(to * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, delay]);
  return <span className="tabular-nums">{n}</span>;
}

export function Terminal({ rows }: { rows: Row[] }) {
  const n = QUERY.length;
  const doneAt = START + n * MS;
  const institutes = new Set(rows.map((r) => r.institute)).size;
  const latest = rows.reduce(
    (a, r) => (r.created_at > a ? r.created_at : a),
    rows[0]?.created_at ?? "",
  );

  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="mx-auto w-full max-w-2xl text-left">
          <style>{CSS}</style>
          <p className="font-mono text-xs text-gray-1000">
            Last updated {formatDate(latest)}
          </p>
          <h1 className="ht-in mt-3 text-4xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-5xl">
            What students say
          </h1>
          <p
            className="ht-in mt-3 max-w-xl text-base leading-7 text-text-paragraph text-wrap-pretty"
            style={{ "--d": "120ms" } as CSSProperties}
          >
            See what students say about our classes.
          </p>

          <div
            className="mt-6 flex items-center gap-3 overflow-hidden rounded-xl bg-gray-100 px-4 py-3 font-mono text-[13px] leading-5"
            style={{ boxShadow: "var(--shadow-border)" }}
          >
            <span aria-hidden className="text-gray-1000">
              $
            </span>
            <span
              className="relative min-w-0 flex-1 truncate text-gray-1200"
              style={{ "--n": n } as CSSProperties}
            >
              <span className="ht-type inline-block whitespace-nowrap">
                {QUERY}
              </span>
              <span
                aria-hidden
                className="ht-caret absolute left-0 top-0.5 h-4 w-[1ch] bg-gray-1200"
                style={{ transform: `translateX(${n}ch)` }}
              />
            </span>
            <span
              className="ht-in hidden shrink-0 text-gray-1000 sm:inline"
              style={{ "--d": `${doneAt}ms` } as CSSProperties}
            >
              ({rows.length} rows)
            </span>
          </div>

          <dl
            className="ht-in mt-6 flex gap-10"
            style={{ "--d": `${doneAt + 150}ms` } as CSSProperties}
          >
            <div className="flex flex-col">
              <dt className="order-2 mt-1 font-mono text-xs text-gray-1000">
                testimonials
              </dt>
              <dd className="text-3xl font-medium tracking-tight text-gray-1200">
                <Count to={rows.length} delay={doneAt} />
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="order-2 mt-1 font-mono text-xs text-gray-1000">
                institutes
              </dt>
              <dd className="text-3xl font-medium tracking-tight text-gray-1200">
                <Count to={institutes} delay={doneAt} />
              </dd>
            </div>
          </dl>
        </header>
      }
    />
  );
}