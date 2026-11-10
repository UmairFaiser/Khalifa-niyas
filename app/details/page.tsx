"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

type StudentDetails = {
  index_number: string;
  name: string;
  phone_number: string;
  school: string | null;
};

type FormErrors = {
  indexNumber?: string;
  name?: string;
  phoneNumber?: string;
  school?: string;
};

type Step = "lookup" | "form" | "submitting" | "success";

const label = "block text-sm font-medium text-gray-1200 mb-1.5";

const inputBase =
  "w-full px-5 py-3 rounded-full bg-gray-100 text-gray-1200 text-base min-h-[48px] " +
  "placeholder:text-gray-900 placeholder:tracking-wide focus:outline-none " +
  "transition-shadow duration-200 disabled:opacity-60 " +
  "[box-shadow:var(--shadow-border)] " +
  "focus:[box-shadow:0_0_0_2px_var(--color-focus-ring),0_0_0_1px_var(--color-gray-800)]";

const inputError =
  "[box-shadow:0_0_0_1px_oklch(0.55_0.22_27_/_0.55)] " +
  "focus:[box-shadow:0_0_0_2px_oklch(0.55_0.22_27_/_0.35),0_0_0_1px_oklch(0.55_0.22_27_/_0.6)]";

const buttonBase =
  "w-full min-h-[48px] py-3 rounded-full font-medium cursor-pointer " +
  "flex items-center justify-center " +
  "transition-[transform,background-color,box-shadow] duration-150 " +
  "active:scale-[0.96] disabled:active:scale-100 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-1200/30 focus-visible:ring-offset-2";

const fieldError = "mt-1.5 text-sm text-red-600 leading-snug";

/* ─────────────────────────── SQL window (read-only) ─────────────────────────── */

type Field = "index" | "name" | "phone" | "school";
type Kind = "kw" | "col" | "tbl" | "str" | "num" | "cmt" | "punc";
type Token = [Kind, string];
type Line = { tokens: Token[]; field?: Field };

const tokenStyle: Record<Kind, string> = {
  kw: "text-syntax-keyword font-medium",
  col: "text-syntax-column",
  tbl: "text-syntax-table",
  str: "text-syntax-string bg-gray-300 rounded px-1",
  num: "text-syntax-number",
  cmt: "text-gray-900 italic",
  punc: "text-gray-1000",
};

const TABLE = 'public.students-2027';
const q = (v: string) => `'${v.replace(/'/g, "''")}'`;
const cleanPhoneValue = (v: string) => v.replace(/\s|-/g, "");
const ln = (tokens: Token[], field?: Field): Line => ({ tokens, field });

function buildSql(
  step: Step,
  index: string,
  name: string,
  phone: string,
  school: string,
  done: boolean,
): Line[] {
  const db = ln([["cmt", "-- database: khalifa-niyas-ict"]]);

  if (step === "lookup" || (step === "submitting" && !name)) {
    return [
      db,
      ln([["kw", "SELECT"]]),
      ln([
        ["punc", "  "],
        ["col", "index_number"],
        ["punc", ","],
      ]),
      ln([
        ["punc", "  "],
        ["col", "name"],
        ["punc", ","],
      ]),
      ln([
        ["punc", "  "],
        ["col", "phone_number"],
        ["punc", ","],
      ]),
      ln([
        ["punc", "  "],
        ["col", "school"],
      ]),
      ln([
        ["kw", "FROM "],
        ["tbl", TABLE],
      ]),
      ln(
        [
          ["kw", "WHERE "],
          ["col", "index_number "],
          ["kw", "LIKE "],
          ["str", q(index.trim().toUpperCase())],
        ],
        "index",
      ),
      ln([
        ["kw", "LIMIT "],
        ["num", "1"],
        ["punc", ";"],
      ]),
    ];
  }

  const lines: Line[] = [
    db,
    ln([
      ["kw", "UPDATE "],
      ["tbl", TABLE],
    ]),
    ln([["kw", "SET"]]),
    ln(
      [
        ["punc", "  "],
        ["col", "name "],
        ["punc", "= "],
        ["str", q(name.trim())],
        ["punc", ","],
      ],
      "name",
    ),
    ln(
      [
        ["punc", "  "],
        ["col", "phone_number "],
        ["punc", "= "],
        ["str", q(cleanPhoneValue(phone))],
        ["punc", ","],
      ],
      "phone",
    ),
    ln(
      [
        ["punc", "  "],
        ["col", "school "],
        ["punc", "= "],
        ["str", q(school.trim())],
      ],
      "school",
    ),
    ln(
      [
        ["kw", "WHERE "],
        ["col", "index_number "],
        ["punc", "= "],
        ["str", q(index.trim())],
      ],
      "index",
    ),
    ln([
      ["kw", "RETURNING "],
      ["punc", "*;"],
    ]),
  ];
  if (done) lines.push(ln([["cmt", "-- UPDATE 1"]]));
  return lines;
}

function SqlWindow({
  lines,
  active,
  compact = false,
}: {
  lines: Line[];
  active: Field | null;
  compact?: boolean;
}) {
  const activeIdx = active ? lines.findIndex((l) => l.field === active) : -1;
  const cursorIdx = activeIdx >= 0 ? activeIdx : lines.length - 1;
  const filler = compact ? 0 : Math.max(0, 28 - lines.length);

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl bg-preview-bg"
      style={{ boxShadow: "var(--shadow-custom)" }}
    >
      {/* title bar */}
      <div className="flex items-center gap-1.5 border-b border-border-overlay bg-gray-200 px-5 py-3">
        <span className="size-2.5 rounded-full bg-gray-500" />
        <span className="size-2.5 rounded-full bg-gray-500" />
        <span className="size-2.5 rounded-full bg-gray-500" />
        <span
          className="ml-4 rounded-md bg-preview-bg px-2.5 py-1 font-mono text-xs text-gray-1200"
          style={{ boxShadow: "var(--shadow-border)" }}
        >
          students-2027.sql
        </span>
      </div>

      {/* editor body */}
      <div
        className={`flex-1 overflow-hidden py-5 font-mono ${
          compact ? "text-[11.5px] leading-6" : "text-[13px] leading-7"
        }`}
      >
        {lines.map((line, i) => {
          const isActive = activeIdx === i;
          const dim = activeIdx >= 0 && !isActive;
          return (
            <div
              key={i}
              className={`relative flex gap-5 px-5 transition-[background-color,opacity] duration-200 ${
                isActive ? "bg-gray-200" : ""
              } ${dim ? "opacity-40" : ""}`}
            >
              {isActive && (
                <span className="absolute inset-y-0 left-0 w-0.5 bg-gray-1200" />
              )}
              <span className="w-5 shrink-0 select-none text-right tabular-nums text-gray-800">
                {i + 1}
              </span>
              <code className="whitespace-pre-wrap break-all">
                {line.tokens.map(([kind, text], j) => (
                  <span key={j} className={tokenStyle[kind]}>
                    {text}
                  </span>
                ))}
                {i === cursorIdx && (
                  <span className="ml-1 inline-block h-4 w-[2px] translate-y-0.5 bg-gray-1200 motion-safe:animate-pulse" />
                )}
              </code>
            </div>
          );
        })}
        {Array.from({ length: filler }).map((_, i) => (
          <div key={`f${i}`} className="flex gap-5 px-5" aria-hidden="true">
            <span className="w-5 shrink-0 select-none text-right tabular-nums text-gray-600">
              {lines.length + i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* status bar */}
      <div className="flex items-center justify-between border-t border-border-overlay bg-gray-200 px-5 py-2.5 font-mono text-[11px] text-gray-1000">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-gray-1100 motion-safe:animate-pulse" />
          <span>khalifa-niyas-ict</span>
        </div>
        <div className="flex items-center gap-4">
          <span>read-only</span>
          <span>PostgreSQL</span>
          <span className="tabular-nums">Ln {cursorIdx + 1}</span>
        </div>
      </div>
    </div>
  );
}

/* Split layout: form left, SQL window fills the whole right side (desktop).
   On mobile the window collapses behind a small toggle. */
function Shell({
  lines,
  active,
  children,
}: {
  lines: Line[];
  active: Field | null;
  children: React.ReactNode;
}) {
  const [showQuery, setShowQuery] = useState(false);

  return (
    <main className="min-h-dvh lg:grid lg:grid-cols-2">
      <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-8">
        {children}

        <div className="mt-8 flex w-full max-w-sm flex-col items-center lg:hidden">
          <button
            type="button"
            onClick={() => setShowQuery((v) => !v)}
            aria-expanded={showQuery}
            className="min-h-[40px] cursor-pointer rounded-full bg-gray-100 px-4 text-sm text-gray-1100 transition-transform duration-150 active:scale-[0.96]"
            style={{ boxShadow: "var(--shadow-border)" }}
          >
            {showQuery ? "Hide query" : "View query"}
          </button>
          {showQuery && (
            <div
              aria-hidden="true"
              className="mt-4 w-full motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
            >
              <SqlWindow lines={lines} active={active} compact />
            </div>
          )}
        </div>
      </div>

      <div
        aria-hidden="true"
        className="sticky top-0 hidden h-dvh self-start p-4 lg:block"
      >
        <SqlWindow lines={lines} active={active} />
      </div>
    </main>
  );
}

/* ───────────────────────────────── Page ───────────────────────────────── */

export default function StudentDetailsPage() {
  const supabase = createClient();
  const indexRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("lookup");
  const [indexNumber, setIndexNumber] = useState("");
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [school, setSchool] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [saved, setSaved] = useState<StudentDetails | null>(null);
  const [active, setActive] = useState<Field | null>(null);

  const isBusy = step === "submitting";

  const lines = buildSql(
    step,
    indexNumber,
    name,
    phoneNumber,
    school,
    step === "success",
  );

  const focusProps = (field: Field) => ({
    onFocus: () => setActive(field),
    onBlur: () => setActive(null),
  });

  const cleanPhone = (value: string) => value.replace(/\s|-/g, "");
  const validatePhone = (value: string) => /^07\d{8}$/.test(cleanPhone(value));

  const resetToLookup = () => {
    setStep("lookup");
    setIndexNumber("");
    setName("");
    setPhoneNumber("");
    setSchool("");
    setErrors({});
    setSaved(null);
    setActive(null);
    setTimeout(() => indexRef.current?.focus(), 0);
  };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: FormErrors = {};
    const cleanedIndex = indexNumber.trim().toUpperCase();
    if (!cleanedIndex) next.indexNumber = "Enter your index number";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setStep("submitting");

    try {
      const { data, error } = await supabase
        .from("students")
        .select("index_number,name,phone_number,school")
        .ilike("index_number", cleanedIndex)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("No student found with that index number.");
        setStep("lookup");
        return;
      }

      const row = data as StudentDetails;
      setIndexNumber(row.index_number);
      setName(row.name ?? "");
      setPhoneNumber(row.phone_number ?? "");
      setSchool(row.school ?? "");
      setStep("form");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Something went wrong. Check your connection and try again.",
      );
      setStep("lookup");
    }
  };

  const validateDetails = () => {
    const next: FormErrors = {};
    if (!name.trim()) next.name = "Enter the full name";
    if (!phoneNumber.trim()) {
      next.phoneNumber = "Enter the phone number";
    } else if (!validatePhone(phoneNumber)) {
      next.phoneNumber = "Enter a valid mobile number, like 0771234567";
    }
    if (!school.trim()) next.school = "Enter the school name";
    else if (school.trim().length < 2)
      next.school = "Enter the full school name";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDetails()) return;

    setStep("submitting");

    try {
      const { data, error } = await supabase.rpc("update_student_details", {
        p_index: indexNumber.trim(),
        p_name: name.trim(),
        p_phone: cleanPhone(phoneNumber),
        p_school: school.trim(),
      });

      if (error) throw error;

      const row = data as StudentDetails;
      setSaved(row);
      setStep("success");
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Could not save your details. Try again.",
      );
      setStep("form");
    }
  };

  if (step === "success" && saved) {
    return (
      <Shell lines={lines} active={null}>
        <section
          aria-live="polite"
          className="w-full max-w-sm text-center motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
        >
          <h1 className="text-2xl font-[450] text-green-300 leading-tight text-wrap-balance">
            <span className="rounded-full bg-green-400/20 pb-1.5 border-shadow-border px-5 py-1">
              Details saved
            </span>
          </h1>
          <p className="mt-2 text-sm text-text-paragraph text-wrap-pretty">
            {saved.name} · {saved.index_number}
          </p>
          <div
            className="mt-5 rounded-2xl bg-gray-100 px-6 py-5 text-left"
            style={{ boxShadow: "inset var(--shadow-border)" }}
          >
            <p className="text-sm text-gray-1100">School</p>
            <p className="mt-1 text-base font-medium text-gray-1200 text-wrap-pretty">
              {saved.school}
            </p>
            <p className="mt-4 text-sm text-gray-1100">Phone</p>
            <p className="mt-1 text-base font-medium text-gray-1200 tabular-nums">
              {saved.phone_number}
            </p>
          </div>
        </section>
      </Shell>
    );
  }

  if (step === "form" || (step === "submitting" && Boolean(name))) {
    return (
      <Shell lines={lines} active={active}>
        <h1 className="text-4xl tracking-tighter mb-10 font-190 text-center text-gray-1200 text-wrap-balance">
          {name}'s <span className="text-gray-1000 font-[450]">details</span>
        </h1>
        <form
          onSubmit={handleSave}
          noValidate
          className="w-full max-w-sm space-y-6 motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
        >
          <div>
            <label htmlFor="name" className={label}>
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              {...focusProps("name")}
              autoComplete="name"
              disabled={isBusy}
              aria-invalid={!!errors.name}
              className={`${inputBase} ${errors.name ? inputError : ""}`}
            />
            {errors.name && <p className={fieldError}>{errors.name}</p>}
          </div>

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
              {...focusProps("phone")}
              autoComplete="tel"
              disabled={isBusy}
              className={`${inputBase} tabular-nums ${
                errors.phoneNumber ? inputError : ""
              }`}
            />
            {errors.phoneNumber && (
              <p className={fieldError}>{errors.phoneNumber}</p>
            )}
          </div>

          <div>
            <label htmlFor="school" className={label}>
              School
            </label>
            <input
              id="school"
              type="text"
              value={school}
              onChange={(e) => setSchool(e.target.value)}
              {...focusProps("school")}
              placeholder="Enter school name"
              autoComplete="organization"
              disabled={isBusy}
              aria-invalid={!!errors.school}
              className={`${inputBase} ${errors.school ? inputError : ""}`}
            />
            {errors.school && <p className={fieldError}>{errors.school}</p>}
          </div>

          <button
            type="submit"
            disabled={isBusy}
            className={`${buttonBase} bg-gray-1200 text-gray-background disabled:opacity-60`}
            style={{
              boxShadow:
                "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
            }}
          >
            {isBusy ? "Saving…" : "Save details"}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell lines={lines} active={active}>
      <h1 className="text-4xl tracking-tighter mb-3 font-[450] text-center text-gray-1200 text-wrap-balance">
        Find your record
      </h1>
      <p className="mb-8 text-sm text-text-paragraph text-center text-wrap-pretty max-w-sm">
        Enter the index number that was given to you. Then add your school,
        update your name and phone number if needed.
      </p>
      <form
        onSubmit={handleLookup}
        noValidate
        className="w-full max-w-sm space-y-6 motion-safe:animate-[fadeInUp_0.35s_cubic-bezier(0.2,0,0,1)_both]"
      >
        <div>
          <label htmlFor="indexNumber" className={label}>
            Index number
          </label>
          <input
            ref={indexRef}
            id="indexNumber"
            type="text"
            value={indexNumber}
            onChange={(e) => setIndexNumber(e.target.value.toUpperCase())}
            {...focusProps("index")}
            placeholder="Enter your index number"
            autoComplete="off"
            autoCapitalize="characters"
            disabled={isBusy}
            aria-invalid={!!errors.indexNumber}
            className={`${inputBase} font-mono tabular-nums ${
              errors.indexNumber ? inputError : ""
            }`}
          />
          {errors.indexNumber && (
            <p className={fieldError}>{errors.indexNumber}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isBusy}
          className={`${buttonBase} bg-gray-1200 text-gray-background disabled:opacity-60`}
          style={{
            boxShadow:
              "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {isBusy ? "Looking up…" : "Find record"}
        </button>
        <p className="text-center text-sm text-gray-1100">
          Record not showing up?{" "}
          <Link
            href="https://wa.me/94754710993?text=Hi%2C%20I%20searched%20my%20registration%20record%20on%20the%20site%2C%20it%27s%20not%20visible.%20Could%20you%20sort%20it%20out%20please"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-gray-1200 underline"
          >
            Contact team
          </Link>
        </p>
      </form>
    </Shell>
  );
}
