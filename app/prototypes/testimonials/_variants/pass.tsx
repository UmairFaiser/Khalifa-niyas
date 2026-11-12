"use client";

import { INSTITUTE_LABEL, formatDate, Sig, type Row } from "../shared";
import { QuoteMark, TickerShell, tilt } from "../shells";

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-4 py-2.5 first:pl-5 last:pr-5">
      <p className="font-mono text-[10px] uppercase tracking-tight text-gray-1000">
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-xs font-semibold text-gray-1200">
        {value}
      </p>
    </div>
  );
}

// Axis: header hierarchy. The strip becomes labelled fields (INDEX /
// INSTITUTE / DATE) like a boarding pass, so the details read as data.
function Card({ item, index }: { item: Row; index: number }) {
  return (
    <figure
      className="flex h-72 w-80 flex-col overflow-hidden rounded-2xl bg-gray-100"
      style={{
        boxShadow: "var(--shadow-custom)",
        transform: `rotate(${tilt(`${item.id}-${index}`)}deg)`,
      }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] divide-x divide-dashed divide-gray-400 border-b border-dashed border-gray-400">
        <Field label="Index" value={item.index_number ?? "—"} />
        <Field
          label="Institute"
          value={INSTITUTE_LABEL[item.institute] ?? item.institute}
        />
        <Field label="Date" value={formatDate(item.created_at)} />
      </div>

      <div className="flex-1 px-5 pt-3">
        <QuoteMark />
        <blockquote className="mt-1 line-clamp-4 text-base leading-7 text-gray-1200">
          {item.testimonial}
        </blockquote>
      </div>

      <figcaption className="mx-5 mb-4 mt-3 flex items-end justify-between gap-3 border-t border-dashed border-gray-400 pt-3">
        <p className="min-w-0 truncate text-sm font-medium text-gray-1200">
          {item.student_name}
        </p>
        <Sig item={item} className="h-9 w-auto shrink-0" />
      </figcaption>
    </figure>
  );
}

export function Pass({ rows }: { rows: Row[] }) {
  return (
    <TickerShell
      rows={rows}
      renderCard={(item, i) => <Card item={item} index={i} />}
    />
  );
}