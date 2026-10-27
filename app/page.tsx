"use client";

import { useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type Institute = "maxicon" | "sigma" | "sasik" | "farade" | "online";

const INSTITUTE_OPTIONS: { value: Institute; label: string }[] = [
  { value: "maxicon", label: "Maxicon" },
  { value: "sigma", label: "Sigma" },
  { value: "sasik", label: "Sasik" },
  { value: "farade", label: "Farade" },
  { value: "online", label: "Online" },
];

type FormErrors = {
  name?: string;
  phoneNumber?: string;
  institute?: string;
};

type FormState = "form" | "submitting" | "success" | "error";

/* ---------- shared styles (same colours and tokens as before) ---------- */

const label = "block text-sm font-medium text-gray-1200 mb-1.5";

const inputBase =
  "w-full px-5 py-3 rounded-full bg-gray-100 text-gray-1200 text-base min-h-[48px] " +
  "placeholder:text-gray-900 placeholder:tracking-wide focus:outline-none " +
  "transition-shadow duration-200 disabled:opacity-60 " +
  "[box-shadow:var(--shadow-border)] " +
  "focus:[box-shadow:0_0_0_2px_oklch(0.6_0.15_260_/_0.25),0_0_0_1px_oklch(0.6_0.15_260_/_0.35)]";

const inputError =
  "[box-shadow:0_0_0_1px_oklch(0.55_0.22_27_/_0.55)] " +
  "focus:[box-shadow:0_0_0_2px_oklch(0.55_0.22_27_/_0.35),0_0_0_1px_oklch(0.55_0.22_27_/_0.6)]";

const buttonBase =
  "w-full min-h-[48px] py-3 rounded-full font-medium cursor-pointer " +
  "flex items-center justify-center " +
  "transition-[transform,background-color,box-shadow] duration-150 " +
  "active:scale-[0.97] disabled:active:scale-100 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-1200/30 focus-visible:ring-offset-2";

const fieldError = "mt-1.5 text-sm text-red-600 leading-snug";

export default function Home() {
  const supabase = createClient();
  const nameRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [institute, setInstitute] = useState<Institute | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formState, setFormState] = useState<FormState>("form");
  const [indexNumber, setIndexNumber] = useState("");
  const [studentName, setStudentName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isSubmitting = formState === "submitting";

  const cleanPhone = (value: string) => value.replace(/\s|-/g, "");
  const validatePhone = (value: string) => /^07\d{8}$/.test(cleanPhone(value));

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (!name.trim()) next.name = "Enter the full name";

    if (!phoneNumber.trim()) {
      next.phoneNumber = "Enter the phone number";
    } else if (!validatePhone(phoneNumber)) {
      next.phoneNumber = "Enter a valid mobile number, like 0771234567";
    }

    if (!institute) next.institute = "Choose an institute";

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setFormState("submitting");
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("students")
        .insert({
          name: name.trim(),
          phone_number: cleanPhone(phoneNumber),
          institute: institute as Institute,
        })
        .select("index_number, name")
        .single();

      if (error) throw error;

      setIndexNumber(String(data.index_number));
      setStudentName(data.name);
      setFormState("success");
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(
        err?.message ||
          "Something went wrong. Check your connection and try again.",
      );
      setFormState("error");
    }
  };

  const resetForm = () => {
    setFormState("form");
    setIndexNumber("");
    setStudentName("");
    setErrorMessage("");
    setErrors({});
    setName("");
    setPhoneNumber("");
    setInstitute("");
    // let the form render, then jump straight to the first field
    setTimeout(() => nameRef.current?.focus(), 0);
  };

  /* ------------------------------ success ------------------------------ */

  if (formState === "success") {
    return (
      <main className="min-h-dvh flex items-center justify-center px-5 py-6">
        <section
          aria-live="polite"
          className="w-full max-w-sm text-center motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
        >
          <h1 className="text-2xl font-bold text-gray-1200 leading-tight text-wrap-balance">
            {studentName} is registered
          </h1>

          <div
            className="mt-5 rounded-2xl bg-gray-100 px-6 py-7"
            style={{ boxShadow: "inset var(--shadow-border)" }}
          >
            <p className="text-sm font-medium text-gray-1100 mb-2">
              Index number
            </p>
            <p className="font-mono text-5xl font-bold text-gray-1200 tabular-nums leading-none select-all">
              {indexNumber}
            </p>
          </div>

          <div
            className="mt-3 rounded-2xl px-4 py-3 text-left text-amber-900"
            style={{
              backgroundColor: "oklch(0.975 0.04 95)",
              boxShadow:
                "inset 0 0 0 1px oklch(0.8 0.12 85 / 0.25), 0 1px 2px oklch(0.7 0.15 75 / 0.05)",
            }}
          >
            <p className="text-sm leading-snug text-wrap-pretty">
              <strong className="font-semibold">Save this number.</strong>{" "}
              It&rsquo;s needed to submit every worksheet and get marks.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            autoFocus
            className={`${buttonBase} mt-5 bg-gray-1200 hover:bg-gray-1100 text-white`}
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            Register next student
          </button>
        </section>
      </main>
    );
  }

  /* ------------------------------- form -------------------------------- */

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-5">
      <h1 className="text-4xl tracking-tighter mb-10 font-[450] text-center text-gray-1200">
        Student registration
      </h1>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="w-full max-w-sm space-y-6 motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
      >
        {/* Name */}
        <div>
          <label htmlFor="name" className={label}>
            Full name
          </label>
          <input
            ref={nameRef}
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Khalifa Niyas"
            autoComplete="name"
            disabled={isSubmitting}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
            className={`${inputBase} ${errors.name ? inputError : ""}`}
          />
          {errors.name && (
            <p id="name-error" className={fieldError}>
              {errors.name}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phoneNumber" className={label}>
            Phone number
          </label>
          <input
            id="phoneNumber"
            type="tel"
            inputMode="numeric"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="0771234567"
            autoComplete="tel"
            disabled={isSubmitting}
            aria-invalid={!!errors.phoneNumber}
            aria-describedby="phone-help"
            className={`${inputBase} tabular-nums ${
              errors.phoneNumber ? inputError : ""
            }`}
          />

          <p id="phone-help" className={fieldError}>
            {errors.phoneNumber}
          </p>
        </div>

        {/* Institute */}
        <fieldset disabled={isSubmitting}>
          <legend className={label}>Institute</legend>
          <div className="flex flex-wrap gap-2">
            {INSTITUTE_OPTIONS.map((opt) => (
              <label key={opt.value} className="relative">
                <input
                  type="radio"
                  name="institute"
                  value={opt.value}
                  checked={institute === opt.value}
                  onChange={() => setInstitute(opt.value)}
                  className="peer sr-only"
                />
                <span
                  className={
                    "block cursor-pointer select-none rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-1200 " +
                    "[box-shadow:var(--shadow-border)] " +
                    "transition-[transform,background-color,color] duration-150 " +
                    "hover:bg-gray-200 active:scale-[0.96] " +
                    "peer-checked:bg-gray-1200 peer-checked:text-white peer-checked:[box-shadow:none] " +
                    "peer-focus-visible:ring-2 peer-focus-visible:ring-gray-1200/30 peer-focus-visible:ring-offset-2 " +
                    "peer-disabled:opacity-60 peer-disabled:cursor-not-allowed"
                  }
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
          {errors.institute && <p className={fieldError}>{errors.institute}</p>}
        </fieldset>

        {/* Submission error */}
        {formState === "error" && (
          <div
            role="alert"
            className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: "oklch(0.975 0.03 25)",
              boxShadow:
                "inset 0 0 0 1px oklch(0.6 0.22 27 / 0.22), 0 1px 2px oklch(0.6 0.22 27 / 0.05)",
            }}
          >
            <p className="text-sm font-semibold text-red-700">
              Registration didn&rsquo;t go through
            </p>
            <p className="mt-0.5 text-sm text-red-600 leading-snug">
              {errorMessage} Your details are still here, so you can try again.
            </p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className={`${buttonBase} bg-gray-1200 hover:bg-gray-1100 text-white disabled:opacity-60`}
          style={{
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {isSubmitting ? "Registering…" : "Register"}
        </button>
      </form>
    </main>
  );
}
