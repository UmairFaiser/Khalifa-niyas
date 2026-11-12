"use client";

import type { CSSProperties } from "react";
import type { Row } from "../shared";
import { DitherBar, DitherHeading } from "../dither";
import { CompactTicker } from "./compact";

// Axis: interaction. The title dithers in, then the pointer becomes a lens:
// text under it breaks into grain and static and re-forms behind it, so you
// can "scrub" through the heading. Local, continuous, and recovers on leave.
export function Lens({ rows }: { rows: Row[] }) {
  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
            Testimonials
          </p>
          <div className="mt-3">
            <DitherHeading text="What students say" mode="lens" />
          </div>
          <div className="mt-6 flex justify-center">
            <DitherBar duration={1100} width={160} />
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
            move your cursor across the title
          </p>
        </header>
      }
    />
  );
}