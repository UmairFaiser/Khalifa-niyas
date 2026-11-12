"use client";

import { useEffect, useState } from "react";
import type { Row } from "../shared";
import { CompactTicker } from "./compact";

// Axis: character. Every letter starts as a flickering bit and locks in left
// to right (binary resolving to text), then the ASCII code of the first
// letter is shown as a small lesson. Layout never shifts: each glyph is
// measured by its final character.
const TITLE = "What students say";
const EYEBROW = "TESTIMONIALS";

type Tick = { t: number; bits: string[] } | null;

function useDecode(count: number, delay: number, perChar: number, hold: number) {
  const [tick, setTick] = useState<Tick>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTick({ t: Infinity, bits: [] });
      return;
    }
    const total = delay + count * perChar + hold;
    const t0 = performance.now();
    const id = window.setInterval(() => {
      const t = performance.now() - t0;
      setTick({
        t,
        bits: Array.from({ length: count }, () =>
          Math.random() < 0.5 ? "0" : "1",
        ),
      });
      if (t > total) window.clearInterval(id);
    }, 45);
    return () => window.clearInterval(id);
  }, [count, delay, perChar, hold]);

  return (i: number) => {
    if (!tick) return { resolved: false, started: false, bit: "" };
    const resolved = tick.t >= delay + i * perChar + hold;
    return { resolved, started: true, bit: tick.bits[i] ?? "0" };
  };
}

function Decode({
  text,
  delay,
  perChar,
  hold,
}: {
  text: string;
  delay: number;
  perChar: number;
  hold: number;
}) {
  const stateOf = useDecode(text.length, delay, perChar, hold);
  const words = text.split(" ");
  // Slot of each word's first character (spaces take a slot so timing is even).
  const offsets: number[] = [];
  let acc = 0;
  for (const word of words) {
    offsets.push(acc);
    acc += word.length + 1;
  }

  return (
    <>
      {words.map((word, w) => (
        <span key={w}>
          <span className="inline-block whitespace-nowrap">
            {word.split("").map((ch, k) => {
              const s = stateOf(offsets[w] + k);
              return (
                <span key={k} className="relative inline-block">
                  <span className={s.resolved ? "" : "opacity-0"}>{ch}</span>
                  {!s.resolved && s.started ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 text-center text-gray-1000"
                    >
                      {s.bit}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </span>
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}

export function DecodeHeader({ rows }: { rows: Row[] }) {
  const code = TITLE.charCodeAt(0);
  const bits = code.toString(2).padStart(8, "0");

  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <p
            aria-label="Testimonials"
            className="font-mono text-xs font-semibold tracking-tight text-gray-1000"
          >
            <span aria-hidden>
              <Decode text={EYEBROW} delay={100} perChar={30} hold={300} />
            </span>
          </p>
          <h1
            aria-label={TITLE}
            className="mt-2 text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-5xl"
          >
            <span aria-hidden>
              <Decode text={TITLE} delay={250} perChar={45} hold={400} />
            </span>
          </h1>
          <p
            className="proto-rise mx-auto mt-3 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
            style={{ "--i": 18 } as React.CSSProperties}
          >
            See what students say about our classes.
          </p>
          <p
            className="proto-rise mt-4 font-mono text-[11px] text-gray-1000"
            style={{ "--i": 24 } as React.CSSProperties}
          >
            ASCII &lsquo;{TITLE[0]}&rsquo; = <span className="text-gray-1200">{bits}</span>{" "}
            ({code})
          </p>
        </header>
      }
    />
  );
}