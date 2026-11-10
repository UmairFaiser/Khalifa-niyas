"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export type TestimonialStatus = "pending" | "approved" | "rejected";

export type ModerationResult = { ok: boolean; message: string };

const DONE: Record<TestimonialStatus, string> = {
  approved: "Testimonial approved.",
  rejected: "Testimonial rejected.",
  pending: "Moved back to pending.",
};

export async function setTestimonialStatus(
  id: string,
  status: TestimonialStatus,
): Promise<ModerationResult> {
  if (!id) {
    return { ok: false, message: "That testimonial could not be identified." };
  }

  const supabase = createClient(await cookies());

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You are signed out. Log in again." };

  const { error } = await supabase.rpc("set_testimonial_status", {
    p_id: id,
    p_status: status,
  });
  if (error) return { ok: false, message: error.message };

  revalidatePath("/testimonials/manage");
  revalidatePath("/testimonials");

  return { ok: true, message: DONE[status] };
}
