"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { SiteNav } from "@/components/site-nav";

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

export default function Home() {
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [institute, setInstitute] = useState<Institute | "">("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formState, setFormState] = useState<FormState>("form");
  const [indexNumber, setIndexNumber] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const validatePhone = (value: string): boolean => {
    const cleaned = value.replace(/\s|-/g, "");
    return /^07\d{8}$/.test(cleaned);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = "Phone number is required";
    } else if (!validatePhone(phoneNumber)) {
      newErrors.phoneNumber = "Enter a valid mobile number (e.g. 0771234567)";
    }

    if (!institute) {
      newErrors.institute = "Please select your institute";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const cleanedPhone = phoneNumber.replace(/\s|-/g, "");
    setFormState("submitting");
    setErrorMessage("");

    try {
      const { data, error } = await supabase
        .from("students")
        .insert({
          name: name.trim(),
          phone_number: cleanedPhone,
          institute: institute as Institute,
        })
        .select("index_number, name")
        .single();

      if (error) throw error;

      setIndexNumber(data.index_number);
      setStudentName(data.name);
      setFormState("success");
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMessage(
        err?.message || "Something went wrong. Please check your connection and try again."
      );
      setFormState("error");
    }
  };

  const resetForm = () => {
    setFormState("form");
    setIndexNumber("");
    setErrorMessage("");
    setErrors({});
    setName("");
    setPhoneNumber("");
    setInstitute("");
  };

  const inputBase =
    "w-full px-2 py-3.5 rounded-xl bg-gray-100 text-gray-1200 " +
    "placeholder:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-1200/20 " +
    "transition-colors transition-shadow duration-200 text-base min-h-[52px] " +
    "[box-shadow:var(--shadow-border)] " +
    "focus:[box-shadow:0_0_0_2px_oklch(0.6_0.15_260_/_0.25),0_0_0_1px_oklch(0.6_0.15_260_/_0.35)]";

  const errorInput =
    "[box-shadow:0_0_0_1px_oklch(0.55_0.22_27_/_0.55)] " +
    "focus:[box-shadow:0_0_0_2px_oklch(0.55_0.22_27_/_0.35),0_0_0_1px_oklch(0.55_0.22_27_/_0.6)]";

  const buttonBase =
    "w-full py-3.5 rounded-xl font-semibold transition-transform duration-150 " +
    "active:scale-[0.96] disabled:active:scale-100 " +
    "transition-colors duration-200 min-h-[52px] flex items-center justify-center gap-2";

  if (formState === "success") {
    return (
      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]"
          style={{ animationFillMode: "both" }}
        >
          <div className="rounded-3xl bg-preview-bg p-6 sm:p-8 text-center [box-shadow:var(--shadow-custom)] hover:[box-shadow:var(--shadow-custom-hover)] transition-shadow duration-300">
            <div
              className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-50 flex items-center justify-center"
              style={{
                boxShadow:
                  "inset 0 0 0 1px rgba(34,197,94,0.12), 0 1px 2px rgba(34,197,94,0.08)",
              }}
            >
              <svg
                className="w-10 h-10 text-green-600 animate-[checkPop_0.5s_cubic-bezier(0.2,0,0,1)_0.15s_both]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-gray-1200 mb-3 text-wrap-balance leading-tight">
              Registration Complete!
            </h1>
            <p className="text-text-paragraph mb-7 text-wrap-pretty leading-relaxed">
              Hi {studentName}, your registration was successful.
            </p>

            <div
              className="rounded-2xl p-6 sm:p-7 mb-6 bg-gray-100"
              style={{ boxShadow: "inset var(--shadow-border)" }}
            >
              <p className="text-xs font-semibold tracking-[0.14em] uppercase text-gray-1100 mb-3">
                Your Index Number
              </p>
              <p className="font-mono text-4xl sm:text-6xl font-bold text-gray-1200 tracking-[0.12em] select-all tabular-nums leading-none">
                {indexNumber}
              </p>
            </div>

            <div
              className="rounded-2xl p-4 sm:p-5 mb-6 text-left text-amber-900"
              style={{
                backgroundColor: "oklch(0.975 0.04 95)",
                boxShadow:
                  "inset 0 0 0 1px oklch(0.8 0.12 85 / 0.25), 0 1px 2px oklch(0.7 0.15 75 / 0.05)",
              }}
            >
              <p className="text-sm leading-relaxed text-wrap-pretty">
                <strong className="block mb-1.5 font-semibold">Important:</strong>
                Please save or screenshot this index number. You will need it to submit all your weekly worksheets and receive your marks.
              </p>
            </div>

            <button
              onClick={resetForm}
              className={`${buttonBase} bg-gray-100 hover:bg-gray-200 text-gray-1200 [box-shadow:var(--shadow-border)] hover:[box-shadow:var(--shadow-custom)]`}
            >
              Register Another Student
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div
          className="text-center mb-8 animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]"
          style={{ animationFillMode: "both" }}
        >
          <h1 className="text-3xl sm:text-4xl font-medium text-gray-1200 mb-3 text-wrap-balance leading-tight tracking-tighter">
            Student Registration
          </h1>
          <p className="text-text-paragraph text-base leading-relaxed text-wrap-pretty max-w-sm mx-auto">
            Fill in your details to receive your unique index number.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-preview-bg p-6 sm:p-8 space-y-5 animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_0.05s_both] [box-shadow:var(--shadow-custom)] hover:[box-shadow:var(--shadow-custom-hover)] transition-shadow duration-300"
          style={{ animationFillMode: "both" }}
        >
          <div className="animate-[fadeInUp_0.3s_cubic-bezier(0.2,0,0,1)_0.12s_both]" style={{ animationFillMode: "both" }}>
            <label htmlFor="name" className="block text-sm font-medium text-gray-1200 mb-2">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Khalifa Niyas"
              className={`${inputBase} ${errors.name ? errorInput : ""} h-2`}
              autoComplete="name"
              disabled={formState === "submitting"}
            />
            {errors.name && (
              <p className="mt-2.5 text-sm text-red-600 leading-snug">{errors.name}</p>
            )}
          </div>

          <div className="animate-[fadeInUp_0.3s_cubic-bezier(0.2,0,0,1)_0.2s_both]" style={{ animationFillMode: "both" }}>
            <label htmlFor="phoneNumber" className="block text-sm font-semibold text-gray-1200 mb-2">
              Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              id="phoneNumber"
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 0771234567"
              className={`${inputBase} tabular-nums ${errors.phoneNumber ? errorInput : ""}`}
              autoComplete="tel"
              inputMode="numeric"
              disabled={formState === "submitting"}
            />
            {errors.phoneNumber ? (
              <p className="mt-2.5 text-sm text-red-600 leading-snug">{errors.phoneNumber}</p>
            ) : (
              <p className="mt-2.5 text-xs text-gray-1000 leading-relaxed text-wrap-pretty">
                Used to add you to the WhatsApp class group. 10 digits starting with 07.
              </p>
            )}
          </div>

          <div className="animate-[fadeInUp_0.3s_cubic-bezier(0.2,0,0,1)_0.28s_both]" style={{ animationFillMode: "both" }}>
            <label htmlFor="institute" className="block text-sm font-semibold text-gray-1200 mb-2">
              Institute <span className="text-red-500">*</span>
            </label>
            <select
              id="institute"
              value={institute}
              onChange={(e) => setInstitute(e.target.value as Institute | "")}
              className={`${inputBase} appearance-none cursor-pointer ${errors.institute ? errorInput : ""}`}
              disabled={formState === "submitting"}
              style={{
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 1rem center",
                paddingRight: "3rem",
              }}
            >
              <option value="">Select your institute</option>
              {INSTITUTE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {errors.institute && (
              <p className="mt-2.5 text-sm text-red-600 leading-snug">{errors.institute}</p>
            )}
          </div>

          {formState === "error" && (
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                backgroundColor: "oklch(0.975 0.03 25)",
                boxShadow:
                  "inset 0 0 0 1px oklch(0.6 0.22 27 / 0.22), 0 1px 2px oklch(0.6 0.22 27 / 0.05)",
              }}
            >
              <p className="text-sm text-red-700 font-semibold mb-1.5">Submission Failed</p>
              <p className="text-sm text-red-600 leading-relaxed">{errorMessage}</p>
              <p className="text-xs text-red-500 mt-3 leading-snug">
                Your data has been saved — you can retry without retyping.
              </p>
            </div>
          )}

          <div className="animate-[fadeInUp_0.3s_cubic-bezier(0.2,0,0,1)_0.36s_both]" style={{ animationFillMode: "both" }}>
            <button
              type="submit"
              disabled={formState === "submitting"}
              className={`${buttonBase} bg-gray-1200 hover:bg-gray-1100 active:bg-gray-1200 text-white disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)" }}
            >
              {formState === "submitting" ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="opacity-95">Registering…</span>
                </>
              ) : (
                <span className="tracking-tight">Register & Get Index Number</span>
              )}
            </button>
          </div>

          <p className="text-xs text-center text-gray-1000 pt-1 leading-relaxed text-wrap-pretty">
            Your index number will be generated automatically on the next screen.
          </p>
        </form>
      </div>
    </main>
  );
}
