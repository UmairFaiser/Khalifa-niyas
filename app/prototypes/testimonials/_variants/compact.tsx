"use client";

import { INSTITUTE_LABEL, Sig, type Row } from "../shared";
import { QuoteMark, TickerShell, tilt } from "../shells";

// Axis: density. Narrow, short tickets on three lanes: more voices on screen
// at once, three lines of quote each.
function Card({ item, index }: { item: Row; index: number }) {
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
        <Sig item={item} className="h-7 w-auto shrink-0" />
      </figcaption>
    </figure>
  );
}

export function Compact({ rows }: { rows: Row[] }) {
  return (
    <TickerShell
      rows={rows}
      lanes={3}
      renderCard={(item, i) => <Card item={item} index={i} />}
    />
  );
}