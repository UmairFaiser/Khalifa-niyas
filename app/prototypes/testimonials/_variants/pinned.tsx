"use client";

import { INSTITUTE_LABEL, formatDate, Sig, type Row } from "../shared";
import { QuoteMark, WallShell, tilt } from "../shells";

// Axis: container. The same ticket pinned to a static wall: full text, no
// scrolling, each one slightly off-square like notes on a board.
function Card({ item, index }: { item: Row; index: number }) {
  return (
    <figure
      className="overflow-hidden rounded-2xl bg-gray-100"
      style={{
        boxShadow: "var(--shadow-custom)",
        transform: `rotate(${tilt(`${item.id}-${index}`, 1.5)}deg)`,
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

      <div className="px-5 pt-3">
        <QuoteMark />
        <blockquote className="mt-1 whitespace-pre-wrap text-base leading-7 text-gray-1200">
          {item.testimonial}
        </blockquote>
      </div>

      <figcaption className="mx-5 mb-4 mt-4 flex items-end justify-between gap-3 border-t border-dashed border-gray-400 pt-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-1200">
            {item.student_name}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-gray-1000">
            {formatDate(item.created_at)}
          </p>
        </div>
        <Sig item={item} className="h-10 w-auto shrink-0" />
      </figcaption>
    </figure>
  );
}

export function Pinned({ rows }: { rows: Row[] }) {
  return (
    <WallShell
      rows={rows}
      renderCard={(item, i) => <Card item={item} index={i} />}
    />
  );
}