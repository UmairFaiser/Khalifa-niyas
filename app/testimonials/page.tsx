import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TestimonialSignature } from "@/components/testimonial-signature";

export const metadata: Metadata = {
  title: "Testimonials | ICT with Khalifa Niyas",
  description: "What students say about our classes",
};

type Row = {
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

// Below this many testimonials a scrolling marquee looks sparse, so we show a
// plain grid instead.
const MARQUEE_MIN = 4;
// Seconds of scroll per card, so long lists don't whip past.
const SECONDS_PER_CARD = 9;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Repeats a short list so one loop is always taller than the viewport.
function fill(list: Row[], min = 4) {
  if (list.length === 0 || list.length >= min) return list;
  return Array.from({ length: Math.ceil(min / list.length) }).flatMap(
    () => list,
  );
}

function Card({ item }: { item: Row }) {
  return (
    <figure
      className="flex flex-col rounded-2xl bg-gray-100 p-5"
      style={{ boxShadow: "var(--shadow-custom)" }}
    >
      <blockquote className="flex-1 whitespace-pre-wrap text-[15px] leading-7 text-text-paragraph">
        {item.testimonial}
      </blockquote>

      <figcaption className="mt-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-1200">
            {item.student_name}
          </p>
          <p className="mt-0.5 text-xs text-gray-1000">
            {[
              item.index_number,
              INSTITUTE_LABEL[item.institute] ?? item.institute,
              formatDate(item.created_at),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>

        <TestimonialSignature
          strokes={item.signature_strokes}
          signer={item.student_name}
          className="h-11 w-auto shrink-0"
        />
      </figcaption>
    </figure>
  );
}

// One vertically scrolling column. The list is rendered twice and the track
// slides by exactly half its height, so the loop is seamless. Hovering pauses
// it. With reduced motion the animation stops, the copy is hidden and the
// column becomes a normal scrollable list.
function MarqueeColumn({
  items,
  reverse = false,
  className = "",
}: {
  items: Row[];
  reverse?: boolean;
  className?: string;
}) {
  const list = fill(items);
  if (list.length === 0) return null;

  const duration = `${list.length * SECONDS_PER_CARD}s`;

  return (
    <div
      className={`group/marquee h-160 overflow-hidden motion-reduce:overflow-y-auto mask-[linear-gradient(to_bottom,transparent,#000_12%,#000_88%,transparent)] scrollbar-none [&::-webkit-scrollbar]:hidden sm:h-180 ${className}`}
    >
      <div
        className={`flex flex-col animate-[marqueeY_var(--marquee-duration)_linear_infinite] group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none ${
          reverse ? "[animation-direction:reverse]" : ""
        }`}
        style={{ "--marquee-duration": duration } as React.CSSProperties}
      >
        {[0, 1].map((copy) => (
          <div
            key={copy}
            aria-hidden={copy === 1 || undefined}
            className={`flex flex-col gap-4 pb-4 ${
              copy === 1 ? "motion-reduce:hidden" : ""
            }`}
          >
            {list.map((item, i) => (
              <Card key={`${item.id}-${i}`} item={item} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function TestimonialsPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.rpc("list_approved_testimonials");
  const testimonials = (data ?? []) as Row[];

  const left = testimonials.filter((_, i) => i % 2 === 0);
  const right = testimonials.filter((_, i) => i % 2 === 1);

  return (
    <main className="min-h-dvh px-5 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="text-center">
          <p className="text-xs font-mono font-semibold uppercase tracking-tight text-gray-1000">
            Testimonials
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-4xl">
            What students say
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty">
            See what student says about our classes.
          </p>
        </header>

        {testimonials.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-gray-400 px-6 py-16 text-center">
            <p className="text-sm font-medium text-gray-1200">
              No testimonials yet
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-text-paragraph">
              Approved testimonials will appear here.
            </p>
          </div>
        ) : testimonials.length < MARQUEE_MIN ? (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {testimonials.map((item) => (
              <Card key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {/* Phones: one column with everything in it */}
            <MarqueeColumn items={testimonials} className="sm:hidden" />

            {/* sm and up: two columns drifting in opposite directions */}
            <MarqueeColumn items={left} className="hidden sm:block" />
            <MarqueeColumn items={right} reverse className="hidden sm:block" />
          </div>
        )}
      </div>
    </main>
  );
}