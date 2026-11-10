import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import ModerationList, { type ModerationItem } from "./ModerationList";

export const metadata: Metadata = {
  title: "Review testimonials | ICT Khalifa Niyas",
};

type Row = {
  id: string;
  testimonial: string;
  signature_strokes: unknown;
  status: string;
  created_at: string;
  student_name: string;
  index_number: string | null;
  institute: string;
  school: string | null;
};

const INSTITUTE_LABEL: Record<string, string> = {
  maxicon: "Maxicon",
  sigma: "Sigma",
  sasik: "Sasik",
  farade: "Farade",
  online: "Online",
};

const STATUSES = ["pending", "approved", "rejected"] as const;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function ManageTestimonialsPage() {
  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase.rpc("list_testimonials");

  const items: ModerationItem[] = ((data ?? []) as Row[]).map((row) => ({
    id: row.id,
    testimonial: row.testimonial,
    signatureStrokes: row.signature_strokes,
    status: STATUSES.includes(row.status as never)
      ? (row.status as ModerationItem["status"])
      : "pending",
    createdLabel: formatDate(row.created_at),
    studentName: row.student_name,
    indexNumber: row.index_number,
    institute: INSTITUTE_LABEL[row.institute] ?? row.institute,
    school: row.school,
  }));

  return (
    <main className="min-h-screen px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-4xl">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-tight text-gray-1200 sm:text-3xl">
              Review testimonials
            </h1>
            <p className="mt-1.5 text-sm leading-6 text-text-paragraph">
              Approve a testimonial to publish it on the public page.
            </p>
          </div>

          <Link
            href="/testimonials"
            className="inline-flex h-9 items-center rounded-full border border-gray-400 px-4 text-sm font-medium text-gray-1200 transition-colors hover:bg-gray-200"
          >
            View public page
          </Link>
        </header>

        {error ? (
          <div
            role="alert"
            className="mt-6 rounded-3xl border border-gray-400 bg-gray-100 p-6"
            style={{ boxShadow: "var(--shadow-custom)" }}
          >
            <p className="text-sm font-semibold text-gray-1200">
              Could not load testimonials
            </p>
            <p className="mt-1 text-sm leading-6 text-text-paragraph">
              {error.message}
            </p>
            <p className="mt-3 text-xs leading-5 text-gray-1000">
              If the function is missing, run{" "}
              <code className="rounded bg-gray-200 px-1.5 py-0.5">
                supabase/migrations/20261110180000_testimonials_public_and_moderation.sql
              </code>{" "}
              in the Supabase SQL editor.
            </p>
          </div>
        ) : (
          <ModerationList items={items} />
        )}
      </div>
    </main>
  );
}
