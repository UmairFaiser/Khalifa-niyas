import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { Harness } from "./harness";
import { withSamples, type Row } from "./shared";

export const metadata: Metadata = {
  title: "Testimonial prototypes",
  robots: { index: false, follow: false },
};

// Prototype surface: delete this whole folder once a variant is promoted.
// Rounds and variants are registered in ./registry.ts (the only file to edit).
// ?round=<id> picks a round (default: the latest), ?v=<n> picks the variant.
// Keys 1–N or ←/→ switch variants, R replays.
export default async function TestimonialPrototypesPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; round?: string }>;
}) {
  const supabase = createClient(await cookies());
  const { data } = await supabase.rpc("list_approved_testimonials");
  const rows = withSamples((data ?? []) as Row[]);

  const { v, round } = await searchParams;
  const initial = (parseInt(v ?? "1", 10) || 1) - 1;

  return <Harness rows={rows} round={round} initial={initial} />;
}