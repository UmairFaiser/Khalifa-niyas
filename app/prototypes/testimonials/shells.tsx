"use client";

import type { CSSProperties, ReactNode } from "react";
import { Header, type Row } from "./shared";

/* ---------------------------------------------------------------------------
 * Shells: reusable page layouts for variants. A variant file should only
 * describe its CARD and hand it to a shell. Everything about the page around
 * it (header, spacing, scrolling, stagger) lives here and is configurable
 * through props, so adding a variant never requires editing this file.
 * Need a genuinely new layout? ADD a new shell below; don't change the
 * behaviour of the existing ones.
 * ------------------------------------------------------------------------ */

export type RenderCard = (item: Row, index: number) => ReactNode;

/* ---- helpers ------------------------------------------------------------ */

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

// Deterministic "random" tilt in degrees (same on server and client, so no
// hydration mismatch, and a card keeps its angle in both loop copies).
// Pass `${item.id}-${index}` as the seed.
export function tilt(seed: string, max = 2) {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
  const steps = [-1, -0.7, -0.4, 0.4, 0.7, 1];
  return steps[Math.abs(h) % steps.length] * max;
}

// The oversized opening quote mark.
export function QuoteMark({ small = false }: { small?: boolean }) {
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

// Repeats a short list so one loop is always wider than the viewport.
export function fill(list: Row[], min = 6) {
  if (list.length === 0 || list.length >= min) return list;
  return Array.from({ length: Math.ceil(min / list.length) }).flatMap(
    () => list,
  );
}

const rise = (i: number) => ({ "--i": Math.min(i, 8) }) as CSSProperties;

/* ---- PageShell: <main> + centred container + header --------------------- */

export function PageShell({
  children,
  maxWidth = "max-w-5xl",
  header,
  className = "",
}: {
  children: ReactNode;
  maxWidth?: string;
  /** Omit for the default <Header />. Pass null to hide it. */
  header?: ReactNode;
  className?: string;
}) {
  return (
    <main className={`min-h-dvh px-5 py-12 sm:py-16 ${className}`}>
      <div className={`mx-auto w-full ${maxWidth}`}>
        {header === undefined ? <Header /> : header}
        {children}
      </div>
    </main>
  );
}

/* ---- TickerShell: full-bleed horizontal rows drifting in opposite
 *      directions. Hover pauses. Reduced motion becomes a scrollable row. --- */

function TickerRow({
  items,
  reverse,
  renderCard,
  spacing,
  secondsPerCard,
  minPerLane,
  laneClassName,
}: {
  items: Row[];
  reverse?: boolean;
  renderCard: RenderCard;
  spacing: string;
  secondsPerCard: number;
  minPerLane: number;
  laneClassName: string;
}) {
  const list = fill(items, minPerLane);
  if (list.length === 0) return null;
  const dur = `${list.length * secondsPerCard}s`;

  return (
    // Vertical padding keeps box-shadows and tilted corners from being
    // clipped by overflow-hidden. The mask fades the left/right edges only.
    <div
      className={`proto-ticker-wrap overflow-hidden mask-[linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)] motion-reduce:overflow-x-auto motion-reduce:scrollbar-none ${laneClassName}`}
    >
      <div
        className="proto-ticker flex w-max"
        data-reverse={reverse || undefined}
        style={{ "--dur": dur } as CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 || undefined}
            className={`flex ${spacing} ${
              copy === 1 ? "motion-reduce:hidden" : ""
            }`}
          >
            {list.map((item, i) => (
              <div key={`${item.id}-${i}`} className="shrink-0">
                {renderCard(item, i)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TickerShell({
  rows,
  renderCard,
  lanes = 2,
  spacing = "gap-4 pr-4",
  secondsPerCard = 8,
  minPerLane = 6,
  laneClassName = "py-5",
  header,
}: {
  rows: Row[];
  renderCard: RenderCard;
  /** Number of rows. Odd lanes run in reverse. */
  lanes?: number;
  /** Gap between cards. Gap and trailing padding MUST match (seamless loop). */
  spacing?: string;
  /** Lower is faster. */
  secondsPerCard?: number;
  minPerLane?: number;
  /** Vertical breathing room inside each lane (keeps shadows from clipping). */
  laneClassName?: string;
  header?: ReactNode;
}) {
  const groups = Array.from({ length: lanes }, (_, lane) =>
    rows.filter((_, i) => i % lanes === lane),
  );

  return (
    <main className="flex min-h-dvh flex-col justify-center overflow-hidden py-12 sm:py-16">
      <div className="px-5">{header === undefined ? <Header /> : header}</div>
      <div className="mt-8 flex flex-col">
        {groups.map((items, lane) => (
          <TickerRow
            key={lane}
            items={items}
            reverse={lane % 2 === 1}
            renderCard={renderCard}
            spacing={spacing}
            secondsPerCard={secondsPerCard}
            minPerLane={minPerLane}
            laneClassName={laneClassName}
          />
        ))}
      </div>
    </main>
  );
}

/* ---- WallShell: static masonry columns with a short staggered rise ------- */

export function WallShell({
  rows,
  renderCard,
  columns = "columns-1 gap-4 sm:columns-2 lg:columns-3",
  itemGap = "mb-4",
  maxWidth = "max-w-5xl",
  header,
}: {
  rows: Row[];
  renderCard: RenderCard;
  columns?: string;
  /** Bottom margin between stacked cards. Match the column gap. */
  itemGap?: string;
  maxWidth?: string;
  header?: ReactNode;
}) {
  return (
    <PageShell maxWidth={maxWidth} header={header}>
      <div className={`mt-12 ${columns}`}>
        {rows.map((item, i) => (
          <div
            key={item.id}
            className={`proto-rise break-inside-avoid ${itemGap}`}
            style={rise(i)}
          >
            {renderCard(item, i)}
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/* ---- GridShell: equal-height rows (CSS grid) with the same rise ---------- */

export function GridShell({
  rows,
  renderCard,
  grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  maxWidth = "max-w-5xl",
  header,
}: {
  rows: Row[];
  renderCard: RenderCard;
  grid?: string;
  maxWidth?: string;
  header?: ReactNode;
}) {
  return (
    <PageShell maxWidth={maxWidth} header={header}>
      <div className={`mt-12 ${grid}`}>
        {rows.map((item, i) => (
          <div key={item.id} className="proto-rise" style={rise(i)}>
            {renderCard(item, i)}
          </div>
        ))}
      </div>
    </PageShell>
  );
}