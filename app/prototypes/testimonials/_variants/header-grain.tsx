"use client";

import type { CSSProperties } from "react";
import type { Row } from "../shared";
import { DitherBar, DitherHeading } from "../dither";
import { ScrambleText, useScramble } from "../scramble";
import { CompactTicker } from "./compact";

// Axis: texture. Dither, made organic: a ragged, noise-warped reveal front,
// static that clusters in blobs instead of a rectangle, film-grain threshold.
// Mix: the eyebrow decodes (Decode) while the title dithers in. Hover the
// title and it dissolves and re-forms, like the first load.
const EYEBROW = "TESTIMONIALS";

function GrainHeader() {
  const eyebrow = useScramble(EYEBROW, 100, 30, 300);
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
      <div className="mt-3">
        <DitherHeading text="What students say" mode="grain" />
      </div>
      <div className="mt-6 flex justify-center">
        <DitherBar duration={1100} />
      </div>
      <p
        className="proto-rise mx-auto mt-5 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
        style={{ "--i": 16 } as CSSProperties}
      >
        See what students say about our classes.
      </p>
      <p
        className="proto-rise mt-3 font-mono text-[11px] text-gray-1000"
        style={{ "--i": 22 } as CSSProperties}
      >
        hover the title
      </p>
    </header>
  );
}

export function Grain({ rows }: { rows: Row[] }) {
  return <CompactTicker rows={rows} header={<GrainHeader />} />;
}