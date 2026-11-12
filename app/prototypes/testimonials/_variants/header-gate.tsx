"use client";

import { useEffect, useState } from "react";
import type { Row } from "../shared";
import { CompactTicker } from "./compact";

// Axis: metaphor (Boolean logic). A real AND gate: two switches (A, B) feed it;
// on load they flip on in sequence, the output wire powers up and the heading
// lights. It stays interactive: switch either off and the heading dims,
// because A AND B = 0. Straight out of the logic-gates syllabus.
function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex h-5 items-center justify-end gap-2">
      <span className="font-mono text-[11px] text-gray-1000">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none ${
          on ? "bg-gray-1200" : "bg-gray-100"
        }`}
        style={on ? undefined : { boxShadow: "var(--shadow-border)" }}
      >
        <span
          className={`absolute left-0.5 top-0.5 size-4 rounded-full transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none ${
            on ? "translate-x-4 bg-gray-100" : "bg-gray-1000"
          }`}
        />
      </button>
    </div>
  );
}

function Gate({ a, b, out }: { a: boolean; b: boolean; out: boolean }) {
  const wire = (on: boolean) =>
    `transition-[stroke] duration-200 motion-reduce:transition-none ${
      on ? "stroke-gray-1200" : "stroke-gray-400"
    }`;
  return (
    <svg
      width="120"
      height="56"
      viewBox="0 0 120 56"
      fill="none"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden
    >
      <path d="M0 14H44" className={wire(a)} />
      <path d="M0 42H44" className={wire(b)} />
      <path d="M84 28H120" className={wire(out)} />
      <path
        d="M44 6H62A22 22 0 0 1 62 50H44Z"
        className="stroke-gray-1000"
        strokeLinejoin="round"
      />
      <text
        x="58"
        y="31.5"
        textAnchor="middle"
        className="fill-gray-1000 font-mono text-[10px]"
        stroke="none"
      >
        AND
      </text>
    </svg>
  );
}

export function GateHeader({ rows }: { rows: Row[] }) {
  const [a, setA] = useState(false);
  const [b, setB] = useState(false);
  const out = a && b;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setA(true);
      setB(true);
      return;
    }
    const t1 = window.setTimeout(() => setA(true), 450);
    const t2 = window.setTimeout(() => setB(true), 900);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const lit = out
    ? "opacity-100"
    : "translate-y-1 opacity-30";

  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <div className="mx-auto flex w-fit items-center">
            <div className="flex flex-col gap-2 py-1">
              <Switch label="Attend" on={a} onChange={setA} />
              <Switch label="Practice" on={b} onChange={setB} />
            </div>
            <Gate a={a} b={b} out={out} />
            <span
              aria-hidden
              className={`size-5 shrink-0 rounded-full transition-[background-color,transform] duration-200 ease-out motion-reduce:transition-none ${
                out ? "scale-100 bg-gray-1200" : "scale-90 bg-gray-100"
              }`}
              style={out ? undefined : { boxShadow: "var(--shadow-border)" }}
            />
          </div>

          <p
            aria-live="polite"
            className="mt-3 font-mono text-[11px] text-gray-1000"
          >
            {a ? 1 : 0} AND {b ? 1 : 0} ={" "}
            <span className="text-gray-1200">{out ? 1 : 0}</span>
          </p>

          <h1
            className={`mt-5 text-3xl font-medium tracking-tight text-gray-1200 text-wrap-balance transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none sm:text-5xl ${lit}`}
          >
            What students say
          </h1>
          <p
            className={`mx-auto mt-3 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty transition-[opacity,transform] delay-75 duration-300 ease-out motion-reduce:transition-none ${lit}`}
          >
            See what students say about our classes.
          </p>
        </header>
      }
    />
  );
}