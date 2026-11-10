"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { TestimonialSignature } from "@/components/testimonial-signature";
import { setTestimonialStatus, type TestimonialStatus } from "../actions";

export type ModerationItem = {
  id: string;
  testimonial: string;
  signatureStrokes: unknown;
  status: TestimonialStatus;
  createdLabel: string;
  studentName: string;
  indexNumber: string | null;
  institute: string;
  school: string | null;
};

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const BADGE: Record<
  TestimonialStatus,
  { label: string; background: string; color: string }
> = {
  pending: {
    label: "Pending",
    background: "oklch(0.95 0.05 85)",
    color: "oklch(0.44 0.1 62)",
  },
  approved: {
    label: "Approved",
    background: "oklch(0.95 0.05 150)",
    color: "oklch(0.4 0.1 152)",
  },
  rejected: {
    label: "Rejected",
    background: "oklch(0.95 0.04 25)",
    color: "oklch(0.48 0.16 25)",
  },
};

const buttonBase =
  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium " +
  "transition-[transform,background-color] duration-150 active:scale-[0.96] " +
  "disabled:opacity-40 disabled:active:scale-100 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring";

export default function ModerationList({
  items,
}: {
  items: ModerationItem[];
}) {
  const [filter, setFilter] = useState<FilterKey>("pending");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const counts = useMemo(
    () => ({
      pending: items.filter((item) => item.status === "pending").length,
      approved: items.filter((item) => item.status === "approved").length,
      rejected: items.filter((item) => item.status === "rejected").length,
      all: items.length,
    }),
    [items],
  );

  const shown =
    filter === "all" ? items : items.filter((item) => item.status === filter);

  function change(id: string, status: TestimonialStatus) {
    setBusyId(id);

    startTransition(async () => {
      const result = await setTestimonialStatus(id, status);
      setBusyId(null);

      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  return (
    <div>
      <div
        className="mt-6 flex flex-wrap gap-1.5 rounded-2xl p-1"
        style={{
          backgroundColor: "var(--color-gray-100)",
          boxShadow: "inset var(--shadow-border)",
        }}
      >
        {FILTERS.map((option) => {
          const active = option.key === filter;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={active}
              className={`inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-[transform,background-color,color] duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                active
                  ? "text-gray-background"
                  : "text-gray-1100 hover:text-gray-1200"
              }`}
              style={{
                backgroundColor: active ? "var(--color-gray-1200)" : "transparent",
              }}
            >
              {option.label}
              <span className={active ? "opacity-70" : "text-gray-1000"}>
                {counts[option.key]}
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="mt-10 text-center text-sm text-gray-1000">
          {filter === "all"
            ? "No testimonials yet."
            : `No ${filter} testimonials.`}
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {shown.map((item) => {
            const busy = busyId === item.id;
            const badge = BADGE[item.status];

            return (
              <li key={item.id}>
                <article
                  className="rounded-3xl border border-gray-400 bg-gray-100 p-5 sm:p-6"
                  style={{ boxShadow: "var(--shadow-custom)" }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-1200">
                        {item.studentName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-1000">
                        {[item.indexNumber, item.institute, item.school]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <span
                      className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor: badge.background,
                        color: badge.color,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-gray-1200">
                    {item.testimonial}
                  </p>

                  <TestimonialSignature
                    strokes={item.signatureStrokes}
                    signer={item.studentName}
                    className="mt-4 h-12 w-auto"
                  />

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-400 pt-4">
                    <button
                      type="button"
                      disabled={busy || item.status === "approved"}
                      onClick={() => change(item.id, "approved")}
                      className={`${buttonBase} bg-gray-1200 text-gray-background`}
                    >
                      Approve
                    </button>

                    <button
                      type="button"
                      disabled={busy || item.status === "rejected"}
                      onClick={() => change(item.id, "rejected")}
                      className={`${buttonBase} border border-gray-400 text-gray-1200 hover:bg-gray-200`}
                    >
                      Reject
                    </button>

                    {item.status !== "pending" && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => change(item.id, "pending")}
                        className={`${buttonBase} text-gray-1100 hover:text-gray-1200`}
                      >
                        Move to pending
                      </button>
                    )}

                    <span className="ml-auto text-xs text-gray-1000">
                      {item.createdLabel}
                    </span>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
