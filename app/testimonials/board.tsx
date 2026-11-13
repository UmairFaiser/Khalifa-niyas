"use client";

import type { CSSProperties } from "react";
import { TestimonialSignature } from "@/components/testimonial-signature";
import { DitherHeading } from "./dither";

export type Row = {
  id: string;
  testimonial: string;
  signature_strokes: unknown;
  created_at: string;
  student_name: string;
  index_number: string | null;
  institute: string;
};

const INSTITUTE_LABEL: Record<string, string> = {
  maxicon: "Maxicon",
  sigma: "Sigma",
  sasik: "Sasik",
  farade: "Farade",
  online: "Online",
};

// Deterministic "random" tilt in degrees (same on server and client, so no
// hydration mismatch, and a card keeps its angle in both loop copies).
function tilt(seed: string, max = 2) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  const steps = [-1, -0.7, -0.4, 0.4, 0.7, 1];
  return steps[Math.abs(h) % steps.length] * max;
}

// Repeats a short list so one loop is always wider than the viewport.
function fill(list: Row[], min = 6) {
  if (list.length === 0 || list.length >= min) return list;
  return Array.from({ length: Math.ceil(min / list.length) }).flatMap(
    () => list,
  );
}

// The oversized opening quote mark.
function QuoteMark({ small = false }: { small?: boolean }) {
  return (
    <span
      aria-hidden
      className={`block font-serif leading-none text-gray-400 ${
        small ? "h-6 text-4xl" : "h-7 text-5xl"
      }`}
    >
      “
    </span>
  );
}

function CompactCard({ item, index }: { item: Row; index: number }) {
  return (
    <figure
      className="flex h-56 w-64 flex-col overflow-hidden rounded-2xl bg-gray-100"
      style={{
        boxShadow: "var(--shadow-custom)",
        transform: `rotate(${tilt(`${item.id}-${index}`, 1.5)}deg)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-400 px-4 py-2 font-mono text-[10px] uppercase tracking-tight">
        <span className="font-semibold text-gray-1200">
          {item.index_number ?? "—"}
        </span>
        <span className="text-gray-1000">
          {INSTITUTE_LABEL[item.institute] ?? item.institute}
        </span>
      </div>

      <div className="flex-1 px-4 pt-2.5">
        <QuoteMark small />
        <blockquote className="mt-1 line-clamp-3 text-sm leading-6 text-gray-1200">
          {item.testimonial}
        </blockquote>
      </div>

      <figcaption className="mx-4 mb-3 mt-2 flex items-end justify-between gap-3 border-t border-dashed border-gray-400 pt-2.5">
        <p className="min-w-0 truncate text-[13px] font-medium text-gray-1200">
          {item.student_name}
        </p>
        <TestimonialSignature
          strokes={item.signature_strokes}
          signer={item.student_name}
          className="h-7 w-auto shrink-0"
        />
      </figcaption>
    </figure>
  );
}

const SECONDS_PER_CARD = 8;

// One horizontal lane. The list is rendered twice and the track slides by
// exactly half its width, so the loop is seamless. Hovering pauses it. With
// reduced motion the animation stops and the lane becomes scrollable.
function TickerRow({
  items,
  reverse = false,
  laneClassName = "py-5",
}: {
  items: Row[];
  reverse?: boolean;
  laneClassName?: string;
}) {
  const list = fill(items);
  if (list.length === 0) return null;

  const duration = `${list.length * SECONDS_PER_CARD}s`;

  return (
    // Vertical padding keeps box-shadows and tilted corners from being
    // clipped by overflow-hidden. The mask fades the left/right edges only.
    <div
      className={`board-ticker-wrap overflow-hidden mask-[linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] motion-reduce:overflow-x-auto motion-reduce:scrollbar-none ${laneClassName}`}
    >
      <div
        className="board-ticker flex w-max"
        data-reverse={reverse || undefined}
        style={{ "--dur": duration } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 || undefined}
            className={`flex gap-4 pr-4 ${copy === 1 ? "motion-reduce:hidden" : ""}`}
          >
            {list.map((item, i) => (
              <div key={`${item.id}-${i}`} className="shrink-0">
                <CompactCard item={item} index={i} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Axis: interaction. The mark and the title are drawn in air: run the pointer
// across either and the grain dissolves where you pass, then closes behind you.
// The mark thins instead of blinking, so the quote reads as something being said.
function TraceHeader() {
  return (
    <header className="text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
        Testimonials
      </p>
      <div className="mt-2">
        <DitherHeading
          text="“"
          mode="lens"
          font="serif"
          size={120}
          heightScale={0.85}
          heading={false}
          maxWidth="max-w-36"
        />
      </div>
      <div className="-mt-1">
        <DitherHeading text="What students say" mode="lens" />
      </div>
      <p
        className="board-rise mx-auto mt-4 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
        style={{ "--i": 16 } as CSSProperties}
      >
        See what students say about our classes.
      </p>
    </header>
  );
}

export function TestimonialsBoard({ rows }: { rows: Row[] }) {
  const lanes = Array.from({ length: 3 }, (_, lane) =>
    rows.filter((_, i) => i % 3 === lane),
  );

  return (
    <>
      <style>{CSS}</style>

      <main className="flex min-h-dvh flex-col justify-center overflow-hidden py-12 sm:py-16">
        <div className="px-5">
          <TraceHeader />
        </div>

        {rows.length === 0 ? (
          <div className="mx-auto mt-12 w-full max-w-4xl px-5">
            <div className="rounded-3xl border border-dashed border-gray-400 px-6 py-16 text-center">
              <p className="text-sm font-medium text-gray-1200">
                No testimonials yet
              </p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-text-paragraph">
                Approved testimonials will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col">
            {lanes.map((items, lane) => (
              <TickerRow key={lane} items={items} reverse={lane % 2 === 1} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}

const CSS = `
/* ---- board motion (transform/opacity only, strong ease-out) ---- */
@keyframes board-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@keyframes board-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

.board-rise { animation: board-rise 260ms cubic-bezier(0.23, 1, 0.32, 1) both; animation-delay: calc(var(--i, 0) * 45ms); }
.board-ticker { animation: board-ticker var(--dur, 60s) linear infinite; }
.board-ticker[data-reverse] { animation-direction: reverse; }
.board-ticker-wrap:hover .board-ticker { animation-play-state: paused; }

@media (prefers-reduced-motion: reduce) {
  .board-rise, .board-ticker { animation: none; }
}
`;
