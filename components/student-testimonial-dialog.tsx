"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog } from "@base-ui/react/dialog";
import { createClient } from "@/utils/supabase/client";
import {
  SignaturePad,
  signatureToSvg,
  strokePath,
} from "@/components/arc/signature-pad/signature-pad";
import type { InkStroke } from "@/components/arc/signature-pad/signature-pad";
import { inkFill } from "@/components/testimonial-signature";

type Student = {
  id: string;
  name: string;
};

type Props = {
  student: Student;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const buttonBase =
  "w-full min-h-[48px] py-3 rounded-full font-medium cursor-pointer " +
  "flex items-center justify-center transition-[transform,background-color,box-shadow] duration-150 " +
  "active:scale-[0.96] disabled:active:scale-100 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-1200/30 focus-visible:ring-offset-2";

const label = "block text-sm font-medium text-gray-1200 mb-1.5";

/** Replays the exact saved strokes in the confirmation view. */
function AnimatedSignature({
  strokes,
  signer,
}: {
  strokes: InkStroke[];
  signer: string;
}) {
  const [paths, setPaths] = useState<{ d: string; fill: string }[]>([]);

  useEffect(() => {
    if (!strokes.length) return;

    const offsets: number[] = [];
    let cursor = 0;

    strokes.forEach((stroke, index) => {
      if (index > 0) {
        const previous = strokes[index - 1]!;
        const previousEnd = previous.points[previous.points.length - 1]?.t ?? 0;
        const gap = stroke.at - (previous.at + previousEnd);
        cursor += Math.min(220, Math.max(80, gap));
      }

      offsets.push(cursor);
      cursor += stroke.points[stroke.points.length - 1]?.t ?? 0;
    });

    const speed = Math.max(1, cursor / 2600);
    const total = cursor + 120;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = (now - startedAt) * speed;

      setPaths(
        strokes.map((stroke, index) => {
          const localTime = elapsed - (offsets[index] ?? 0);
          return {
            d: localTime < 0 ? "" : strokePath(stroke, localTime),
            fill: inkFill(stroke.color),
          };
        }),
      );

      if (elapsed >= total) {
        cancelAnimationFrame(frame);
        return;
      }

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [strokes]);

  return (
    <div className="w-full max-w-60">
      <svg
        viewBox="0 0 600 260"
        role="img"
        aria-label={`Handwritten signature by ${signer}`}
        className="block h-auto w-full"
      >
        {paths.map((path, index) => (
          <path key={index} d={path.d} fill={path.fill} />
        ))}
      </svg>
      <p className="mt-1 text-xs text-gray-1100">{signer}</p>
    </div>
  );
}

export function StudentTestimonialDialog({
  student,
  open,
  onOpenChange,
}: Props) {
  const supabase = createClient();

  const [testimonial, setTestimonial] = useState("");
  const [signatureStrokes, setSignatureStrokes] = useState<InkStroke[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [animatedText, setAnimatedText] = useState("");
  const [submittedStrokes, setSubmittedStrokes] = useState<InkStroke[]>([]);
  const [showSignature, setShowSignature] = useState(false);

  useEffect(() => {
    if (!open || !submitted) return;

    let index = 0;
    let signatureTimer: number | undefined;

    const interval = window.setInterval(() => {
      index += 1;
      setAnimatedText(testimonial.slice(0, index));

      if (index >= testimonial.length) {
        window.clearInterval(interval);
        signatureTimer = window.setTimeout(() => setShowSignature(true), 450);
      }
    }, 24);

    return () => {
      window.clearInterval(interval);
      if (signatureTimer !== undefined) window.clearTimeout(signatureTimer);
    };
  }, [open, submitted, testimonial]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading) return;

    if (!nextOpen) {
      setTestimonial("");
      setSignatureStrokes([]);
      setSubmittedStrokes([]);
      setSubmitted(false);
      setAnimatedText("");
      setShowSignature(false);
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!student.id) {
      toast.error("Your student record could not be identified.");
      return;
    }

    const cleanTestimonial = testimonial.trim();

    if (cleanTestimonial.length < 10 || cleanTestimonial.length > 1000) {
      toast.error("Your testimonial must be between 10 and 1000 characters.");
      return;
    }

    if (!signatureStrokes.length) {
      toast.error("Please add your signature before submitting.");
      return;
    }

    setLoading(true);

    try {
      const signatureSvg = signatureToSvg(signatureStrokes);

      const { error } = await supabase.from("student_testimonials").insert({
        student_id: student.id,
        testimonial: cleanTestimonial,
        signature_svg: signatureSvg,
        signature_strokes: signatureStrokes,
        status: "pending",
      });

      if (error) throw error;

      setSubmittedStrokes(signatureStrokes);
      setAnimatedText("");
      setShowSignature(false);
      setSubmitted(true);
      toast.success("Your testimonial has been submitted.");
    } catch (error: unknown) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not submit your testimonial. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-transparent backdrop-blur-xs data-starting-style:opacity-0 data-ending-style:opacity-0" />

        <Dialog.Popup
          aria-labelledby="testimonial-title"
          className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(86dvh,760px)] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-gray-400 bg-gray-100 outline-none shadow-shadow-custom transition-[opacity,transform] duration-200 data-starting-style:translate-y-[calc(-50%+8px)] data-starting-style:opacity-0 data-ending-style:opacity-0"
        >
          <header className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-400 px-5 py-4 sm:px-7">
            <div>
              <Dialog.Title
                id="testimonial-title"
                className="text-xl font-medium tracking-tight text-gray-1200"
              >
                {submitted ? (
                  <>
                    Thank you,{" "}
                    <span className="text-gray-1000">{student.name}</span>
                  </>
                ) : (
                  "Share your experience"
                )}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-text-paragraph">
                {submitted
                  ? "Your testimonial has been received."
                  : "Write a few words about our classes"}
              </Dialog.Description>
            </div>

            <Dialog.Close
              disabled={loading}
              aria-label="Close testimonial form"
              className="grid size-9 shrink-0 place-items-center rounded-full text-2xl leading-none text-gray-1100 transition-colors hover:bg-gray-200 disabled:opacity-50"
            >
              ×
            </Dialog.Close>
          </header>

          {/* There is exactly one scrollable content region in this dialog. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-7">
            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="student-testimonial" className={label}>
                    Your testimonial
                  </label>
                  <textarea
                    id="student-testimonial"
                    value={testimonial}
                    onChange={(event) => setTestimonial(event.target.value)}
                    placeholder="Tell us about your experience..."
                    rows={4}
                    maxLength={1000}
                    required
                    disabled={loading}
                    className="min-h-28 w-full resize-none rounded-2xl bg-gray-200 px-4 py-3 text-sm leading-6 text-gray-1200 placeholder:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800"
                  />
                  <p className="mt-1 text-right text-xs text-gray-1000">
                    {testimonial.length}/1000
                  </p>
                </div>

                <div>
                  <div className="mb-3">
                    <p className={label}>Your signature</p>
                    <p className="text-xs text-text-paragraph">
                      Sign using your finger, mouse or stylus.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-gray-400 bg-preview-bg p-2">
                    <SignaturePad
                      key={
                        open ? "testimonial-pad-open" : "testimonial-pad-closed"
                      }
                      signer={student.name}
                      hint="Sign here"
                      defaultColor="black"
                      defaultWidth="medium"
                      onChange={setSignatureStrokes}
                      fileName="student-testimonial"
                      label="Draw your testimonial signature"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    loading ||
                    testimonial.trim().length < 10 ||
                    !signatureStrokes.length
                  }
                  className={`${buttonBase} bg-gray-1200 text-gray-background disabled:opacity-50`}
                  style={{ boxShadow: "var(--shadow-custom)" }}
                >
                  {loading ? "Submitting..." : "Submit testimonial"}
                </button>
              </form>
            ) : (
              <div className="py-1">
                <div className="rounded-2xl border border-gray-400 bg-preview-bg p-5">
                  <p className="min-h-16 whitespace-pre-wrap text-sm leading-7 text-gray-1200">
                    {animatedText}
                    {!showSignature && (
                      <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-gray-1200" />
                    )}
                  </p>

                  {showSignature && (
                    <div className="mt-6 border-t border-gray-400 pt-4 motion-safe:animate-[fadeInUp_0.35s_ease-out_both]">
                      <p className="mb-2 text-xs text-gray-1000">Signed by</p>
                      <AnimatedSignature
                        strokes={submittedStrokes}
                        signer={student.name}
                      />
                    </div>
                  )}
                </div>

                {showSignature && (
                  <button
                    type="button"
                    onClick={() => handleOpenChange(false)}
                    className={`${buttonBase} mt-5 bg-gray-1200 text-gray-background`}
                    style={{ boxShadow: "var(--shadow-custom)" }}
                  >
                    Done
                  </button>
                )}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
