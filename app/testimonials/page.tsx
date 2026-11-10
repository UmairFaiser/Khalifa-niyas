import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TestimonialSignature } from "@/components/testimonial-signature";

export const metadata: Metadata = {
  title: "Testimonials | ICT Khalifa Niyas",
  description: "What students say about the weekly worksheet programme.",
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

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function TestimonialsPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.rpc("list_approved_testimonials");
  const testimonials = (data ?? []) as Row[];

  return (
    <main className="min-h-dvh px-5 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gray-1000">
            Testimonials
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance sm:text-4xl">
            What students say
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-paragraph">
            Signed notes from students who have been working through the weekly
            worksheets.
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
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {testimonials.map((item) => (
              <figure
                key={item.id}
                className="flex flex-col rounded-3xl border border-gray-400 bg-gray-100 p-6"
                style={{ boxShadow: "var(--shadow-custom)" }}
              >
                <blockquote className="flex-1 whitespace-pre-wrap text-[15px] leading-7 text-gray-1200">
                  {item.testimonial}
                </blockquote>

                <figcaption className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-gray-400 pt-5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-1200">
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
                    className="h-12 w-auto shrink-0"
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
