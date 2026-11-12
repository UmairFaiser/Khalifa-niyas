"use client";

import type { CSSProperties } from "react";
import type { Row } from "../shared";
import { DitherBar } from "../dither";
import { ScrambleText, useScramble } from "../scramble";
import { CompactTicker } from "./compact";

// Axis: metaphor. "Decrypting": the title decodes while a dithered progress
// bar fills in step with the letters locking, with a live percentage. When it
// hits 100% the status flips to DECODED. Hover a letter to re-decode it and
// watch the bar dip.
const TITLE = "What students say";

function LoaderHeader() {
  const title = useScramble(TITLE, 250, 45, 400);
  const pct = title.total ? Math.round((title.resolvedCount / title.total) * 100) : 0;
  const done = pct >= 100;

  return (
    <header className="text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
        {done ? "Decoded" : "Decoding"} · testimonials
      </p>
      <h1
        aria-label={TITLE}
        className="mt-2 cursor-default select-none text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-5xl"
      >
        <span aria-hidden>
          <ScrambleText text={TITLE} api={title} onCharEnter={title.rescramble} />
        </span>
      </h1>
      <div className="mt-6 flex items-center justify-center gap-3">
        <DitherBar progress={pct / 100} />
        <span className="w-10 text-left font-mono text-[11px] tabular-nums text-gray-1000">
          {pct}%
        </span>
      </div>
      <p
        className="proto-rise mx-auto mt-5 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
        style={{ "--i": 18 } as CSSProperties}
      >
        See what students say about our classes.
      </p>
    </header>
  );
}

export function Loader({ rows }: { rows: Row[] }) {
  return <CompactTicker rows={rows} header={<LoaderHeader />} />;
}