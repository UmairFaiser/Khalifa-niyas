"use client";

import type { CSSProperties } from "react";
import type { Row } from "../shared";
import { DitherHeading } from "../dither";
import { CompactTicker } from "./compact";

// Axis: the mix itself. Decode drawn in dither: every letter starts as a dim
// binary glyph (sparse grain = faint) and locks into a solid letter (dense
// grain = solid). Hover a letter and it, plus its neighbours, drops back to
// bits and decodes again.
export function Glyph({ rows }: { rows: Row[] }) {
  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
            Testimonials
          </p>
          <div className="mt-3">
            <DitherHeading text="What students say" mode="glyph" />
          </div>
          <p
            className="proto-rise mx-auto mt-4 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
            style={{ "--i": 14 } as CSSProperties}
          >
            See what students say about our classes.
          </p>
          <p
            className="proto-rise mt-3 font-mono text-[11px] text-gray-1000"
            style={{ "--i": 20 } as CSSProperties}
          >
            hover a letter to decode it again
          </p>
        </header>
      }
    />
  );
}