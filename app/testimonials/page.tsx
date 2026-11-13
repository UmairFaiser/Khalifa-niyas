import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { TestimonialsBoard, type Row } from "./board";

export const metadata: Metadata = {
  title: "Testimonials | ICT with Khalifa Niyas",
  description: "What students say about our classes",
};

export default async function TestimonialsPage() {
  const supabase = createClient(await cookies());
  const { data } = await supabase.rpc("list_approved_testimonials");
  const rows = (data ?? []) as Row[];

  return <TestimonialsBoard rows={rows} />;
}
