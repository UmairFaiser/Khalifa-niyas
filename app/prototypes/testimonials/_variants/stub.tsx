"use client";

import { INSTITUTE_LABEL, formatDate, Sig, type Row } from "../shared";
import { QuoteMark, TickerShell, tilt } from "../shells";

// Axis: orientation. A landscape ticket with a tear-off stub on the right:
// the words on the left, the person (date, signature, name) on the stub.
function Card({ item, index }: { item: Row; index: number }) {
  return (
    <figure
      className="flex h-60 w-md overflow-hidden rounded-2xl bg-gray-100"
      style={{
        boxShadow: "var(--shadow-custom)",
        transform: `rotate(${tilt(`${item.id}-${index}`)}deg)`,
      }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-400 px-5 py-3 font-mono text-[11px] uppercase tracking-tight">
          <span className="font-semibold text-gray-1200">
            {item.index_number ?? "—"}
          </span>
          <span className="text-gray-1000">
            {INSTITUTE_LABEL[item.institute] ?? item.institute}
          </span>
        </div>
        <div className="flex-1 px-5 pt-3">
          <QuoteMark small />
          <blockquote className="mt-1 line-clamp-5 text-[15px] leading-6 text-gray-1200">
            {item.testimonial}
          </blockquote>
        </div>
      </div>

      <figcaption className="flex w-32 shrink-0 flex-col justify-between border-l border-dashed border-gray-400 p-4">
        <p className="font-mono text-[11px] leading-4 text-gray-1000">
          {formatDate(item.created_at)}
        </p>
        <div className="min-w-0">
          <Sig item={item} className="h-11 w-auto max-w-full" />
          <p className="mt-2 line-clamp-2 text-sm font-medium leading-5 text-gray-1200">
            {item.student_name}
          </p>
        </div>
      </figcaption>
    </figure>
  );
}

export function Stub({ rows }: { rows: Row[] }) {
  return (
    <TickerShell
      rows={rows}
      spacing="gap-6 pr-6"
      renderCard={(item, i) => <Card item={item} index={i} />}
    />
  );
}