"use client";

import type { CSSProperties } from "react";
import type { Row } from "../shared";
import { CompactTicker } from "./compact";

// Axis: metaphor (networking). The heading arrives as three numbered packets,
// each word with its sequence number, followed by an ACK. A line of marching
// dashes with one packet in flight sits underneath (constant motion, so linear).
const WORDS = ["What", "students", "say"];
const STAGGER = 130;

const CSS = `
@keyframes hp-packet { from { opacity: 0; transform: translateX(-28px); } }
@keyframes hp-in { from { opacity: 0; transform: translateY(6px); } }
@keyframes hp-march { to { transform: translateX(-12px); } }
@keyframes hp-fly { from { transform: translateX(-6px); } to { transform: translateX(256px); } }
@media (prefers-reduced-motion: no-preference) {
  .hp-packet { animation: hp-packet 360ms cubic-bezier(0.23, 1, 0.32, 1) calc(var(--i) * ${STAGGER}ms + 150ms) both; }
  .hp-seq { animation: hp-in 240ms ease-out calc(var(--i) * ${STAGGER}ms + 300ms) both; }
  .hp-in { animation: hp-in 320ms cubic-bezier(0.23, 1, 0.32, 1) var(--d, 0ms) both; }
  .hp-march { animation: hp-march 600ms linear infinite; }
  .hp-fly { animation: hp-fly 1800ms linear var(--d, 0ms) infinite; }
}
`;

export function Packets({ rows }: { rows: Row[] }) {
  const last = WORDS.length * STAGGER + 450;

  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <style>{CSS}</style>
          <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
            Testimonials · TCP
          </p>

          <h1 className="flex flex-wrap items-end justify-center gap-x-4 gap-y-6 pt-8 text-4xl font-medium tracking-tight text-gray-1200 sm:text-5xl">
            {WORDS.map((word, i) => (
              <span
                key={word}
                className="hp-packet relative inline-block"
                style={{ "--i": i } as CSSProperties}
              >
                <span
                  aria-hidden
                  className="hp-seq absolute -top-5 left-0 font-mono text-[10px] font-normal tracking-normal text-gray-1000"
                  style={{ "--i": i } as CSSProperties}
                >
                  SEQ {i + 1}
                </span>
                {word}
              </span>
            ))}
          </h1>

          <div
            aria-hidden
            className="relative mx-auto mt-7 h-1.5 w-64 overflow-hidden text-gray-400"
          >
            <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 overflow-hidden">
              <div
                className="hp-march h-px w-[calc(100%+12px)]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, currentColor 0 6px, transparent 6px 12px)",
                }}
              />
            </div>
            <span
              className="hp-fly absolute left-0 top-0 size-1.5 bg-gray-1200"
              style={{ "--d": `${last}ms` } as CSSProperties}
            />
          </div>

          <p
            className="hp-in mx-auto mt-5 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
            style={{ "--d": `${last - 200}ms` } as CSSProperties}
          >
            See what students say about our classes.
          </p>

          <p
            className="hp-in mt-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] text-gray-1000"
            style={{
              "--d": `${last}ms`,
              boxShadow: "var(--shadow-border)",
            } as CSSProperties}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
              <path
                d="M2 5.2 4.2 7.4 8 2.8"
                className="stroke-gray-1200"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            ACK {WORDS.length}/{WORDS.length} · 0 lost
          </p>
        </header>
      }
    />
  );
}