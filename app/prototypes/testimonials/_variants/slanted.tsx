"use client";

import { INSTITUTE_LABEL, formatDate, Sig, type Row } from "../shared";
import { QuoteMark, TickerShell, tilt } from "../shells";

// Axis: the merge. Ticket structure, Signed's random tilt, Open's quote mark
// and larger quote type. The reference point for the other four.
function Card({ item, index }: { item: Row; index: number }) {
  return (
    <figure
      className="flex h-72 w-80 flex-col overflow-hidden rounded-2xl bg-gray-100"
      style={{
        boxShadow: "var(--shadow-custom)",
        transform: `rotate(${tilt(`${item.id}-${index}`)}deg)`,
      }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-400 px-5 py-3 font-mono text-[11px] uppercase tracking-tight">
        <span className="font-semibold text-gray-1200">
          {item.index_number ?? "—"}
        </span>
        <span className="text-gray-1000">
          {INSTITUTE_LABEL[item.institute] ?? item.institute}
        </span>
      </div>

      <div className="flex-1 px-5 pt-3">
        <QuoteMark />
        <blockquote className="mt-1 line-clamp-4 text-base leading-7 text-gray-1200">
          {item.testimonial}
        </blockquote>
      </div>

      <figcaption className="mx-5 mb-4 mt-3 flex items-end justify-between gap-3 border-t border-dashed border-gray-400 pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-1200">
            {item.student_name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-gray-1000">
            {formatDate(item.created_at)}
          </p>
        </div>
        <Sig item={item} className="h-9 w-auto shrink-0" />
      </figcaption>
    </figure>
  );
}

export function Slanted({ rows }: { rows: Row[] }) {
  return (
    <TickerShell
      rows={rows}
      renderCard={(item, i) => <Card item={item} index={i} />}
    />
  );
}