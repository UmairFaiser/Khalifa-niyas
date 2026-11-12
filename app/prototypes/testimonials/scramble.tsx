"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* ---------------------------------------------------------------------------
 * Scramble: the DOM version of the decode effect (crisp real type, not
 * canvas). Each letter flickers as a bit, then locks in. `rescramble(i)`
 * re-runs it for a letter and its neighbours, which is what hover uses.
 * Layout never shifts: every glyph is sized by its final character.
 * ------------------------------------------------------------------------ */

export type Scramble = {
  stateOf: (i: number) => { resolved: boolean; started: boolean; bit: string };
  rescramble: (i: number) => void;
  resolvedCount: number;
  total: number;
};

export function useScramble(
  text: string,
  delay: number,
  perChar: number,
  hold: number,
): Scramble {
  const n = text.length;
  const resolveAt = useRef<number[]>(new Array(n).fill(Infinity));
  const bits = useRef<string[]>(new Array(n).fill("0"));
  const timer = useRef<number | null>(null);
  const reduce = useRef(false);
  const [now, setNow] = useState<number | null>(null);

  const run = useCallback(() => {
    if (timer.current !== null) return;
    timer.current = window.setInterval(() => {
      const t = performance.now();
      let any = false;
      for (let i = 0; i < n; i++) {
        if (text[i] !== " " && resolveAt.current[i] > t) {
          any = true;
          bits.current[i] = Math.random() < 0.5 ? "0" : "1";
        }
      }
      setNow(t);
      if (!any && timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, 45);
  }, [n, text]);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const t0 = performance.now();
    for (let i = 0; i < n; i++) {
      resolveAt.current[i] = reduce.current ? 0 : t0 + delay + i * perChar + hold;
    }
    setNow(t0);
    if (!reduce.current) run();
    return () => {
      if (timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    };
  }, [n, delay, perChar, hold, run]);

  const rescramble = useCallback(
    (i: number) => {
      if (reduce.current) return;
      const t = performance.now();
      for (const j of [i - 1, i, i + 1]) {
        if (j >= 0 && j < n && text[j] !== " ") {
          resolveAt.current[j] = Math.max(
            resolveAt.current[j],
            t + 240 + Math.abs(j - i) * 80,
          );
        }
      }
      run();
    },
    [n, text, run],
  );

  const stateOf = (i: number) => {
    if (now === null) return { resolved: false, started: false, bit: "" };
    return {
      resolved: resolveAt.current[i] <= now,
      started: true,
      bit: bits.current[i] ?? "0",
    };
  };

  let resolvedCount = 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    if (text[i] === " ") continue;
    total++;
    if (now !== null && resolveAt.current[i] <= now) resolvedCount++;
  }

  return { stateOf, rescramble, resolvedCount, total };
}

export function ScrambleText({
  text,
  api,
  onCharEnter,
}: {
  text: string;
  api: Scramble;
  onCharEnter?: (index: number) => void;
}) {
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
              const index = offsets[w] + k;
              const s = api.stateOf(index);
              return (
                <span
                  key={k}
                  className="relative inline-block"
                  onPointerEnter={onCharEnter ? () => onCharEnter(index) : undefined}
                >
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