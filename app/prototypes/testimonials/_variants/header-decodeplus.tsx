"use client";

import { useState, type CSSProperties } from "react";
import type { Row } from "../shared";
import { ScrambleText, useScramble } from "../scramble";
import { CompactTicker } from "./compact";

// Axis: education. Decode, kept as crisp real type, now interactive: hover a
// letter and it (and its neighbours) flicker back to bits and re-lock, while
// the caption shows that letter's real ASCII code in binary.
const TITLE = "What students say";
const EYEBROW = "TESTIMONIALS";

function DecodePlusHeader() {
  const eyebrow = useScramble(EYEBROW, 100, 30, 300);
  const title = useScramble(TITLE, 250, 45, 400);
  const [active, setActive] = useState(0);

  const ch = TITLE[active] ?? "W";
  const code = ch.charCodeAt(0);
  const bin = code.toString(2).padStart(8, "0");

  return (
    <header className="text-center">
      <p
        aria-label="Testimonials"
        className="font-mono text-xs font-semibold tracking-tight text-gray-1000"
      >
        <span aria-hidden>
          <ScrambleText text={EYEBROW} api={eyebrow} />
        </span>
      </p>
      <h1
        aria-label={TITLE}
        className="mt-2 cursor-default select-none text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-5xl"
      >
        <span aria-hidden>
          <ScrambleText
            text={TITLE}
            api={title}
            onCharEnter={(i) => {
              setActive(i);
              title.rescramble(i);
            }}
          />
        </span>
      </h1>
      <p
        className="proto-rise mx-auto mt-3 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
        style={{ "--i": 18 } as CSSProperties}
      >
        See what students say about our classes.
      </p>
      <p
        className="proto-rise mt-4 font-mono text-[11px] text-gray-1000"
        style={{ "--i": 24 } as CSSProperties}
      >
        ASCII &lsquo;{ch}&rsquo; = <span className="text-gray-1200">{bin}</span>{" "}
        ({code}) · hover a letter
      </p>
    </header>
  );
}

export function DecodePlus({ rows }: { rows: Row[] }) {
  return <CompactTicker rows={rows} header={<DecodePlusHeader />} />;
}