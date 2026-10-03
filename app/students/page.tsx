"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Grid, type Rows, type Row } from "@/lib/fast-grid";

type StudentRow = {
  id: string;
  index_number: string;
  name: string;
  phone_number: string;
  institute: "maxicon" | "sigma" | "sasik" | "farade" | "online";
  created_at: string;
};

const INSTITUTE_LABEL: Record<StudentRow["institute"], string> = {
  maxicon: "Maxicon",
  sigma: "Sigma",
  sasik: "Sasik",
  farade: "Farade",
  online: "Online",
};

const INSTITUTE_OPTIONS = [
  { value: "maxicon", label: "Maxicon", prefix: "MX" },
  { value: "sigma", label: "Sigma", prefix: "SG" },
  { value: "sasik", label: "Sasik", prefix: "SK" },
  { value: "farade", label: "Farade", prefix: "FR" },
  { value: "online", label: "Online", prefix: "ON" },
] as const;

const HEADERS = ["Index", "Name", "Phone Number", "Institute", "Registered"];

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const studentsToRows = (students: StudentRow[]): Rows => {
  return students.map(
    (s, idx) =>
      ({
        id: idx,
        cells: [
          { id: 0, v: s.index_number },
          { id: 1, v: s.name },
          { id: 2, v: s.phone_number },
          { id: 3, v: INSTITUTE_LABEL[s.institute] },
          { id: 4, v: formatDate(s.created_at) },
        ],
      }) satisfies Row,
  );
};

export default function StudentsPage() {
  const supabase = createClient();

  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid | null>(null);
  const studentsRef = useRef<StudentRow[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [total, setTotal] = useState(0);
  const [instituteFilter, setInstituteFilter] = useState<string | "all">("all");
  const [visibleCount, setVisibleCount] = useState(0);
  const [, forceRerender] = useState(0);

  const instituteCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    for (const opt of INSTITUTE_OPTIONS) counts[opt.value] = 0;
    for (const s of studentsRef.current) {
      counts[s.institute] = (counts[s.institute] ?? 0) + 1;
      counts.all++;
    }
    return counts;
  }, [total]);

  const applyFilters = (nextSearch?: string) => {
    if (!gridRef.current) return;
    const search = (nextSearch ?? searchRef.current?.value ?? "")
      .trim()
      .toLowerCase();
    const view = gridRef.current.rowManager.view;
    view.filter = {};
    view.sort = [...view.sort];
    for (let i = 0; i < HEADERS.length; i++) {
      const header = view.sort.find((s: any) => s.column === i);
    }
    if (search) {
      for (let i = 0; i < HEADERS.length; i++) {
        view.filter[i] = search;
      }
    }
    if (instituteFilter !== "all") {
      view.filter[3] =
        INSTITUTE_LABEL[instituteFilter as StudentRow["institute"]];
    }
    gridRef.current.rowManager.runFilter();
    setTimeout(() => {
      const n = gridRef.current?.rowManager.getNumRows() ?? 0;
      if (n !== visibleCount) setVisibleCount(n);
    }, 0);
  };

  const onSearchInput = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters(val), 80);
  };

  const refreshVisibleCountSoon = () => {
    setTimeout(() => {
      if (!gridRef.current) return;
      setVisibleCount(gridRef.current.rowManager.getNumRows());
    }, 10);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data, error: e } = await supabase
          .from("students")
          .select("id,index_number,name,phone_number,institute,created_at")
          .order("created_at", { ascending: false });
        if (e) throw e;
        if (cancelled) return;
        const rows = (data as StudentRow[]) ?? [];
        studentsRef.current = rows;
        setTotal(rows.length);
        setVisibleCount(rows.length);
        if (containerRef.current) {
          if (gridRef.current) {
            gridRef.current.destroy();
            gridRef.current = null;
          }
          const g = new Grid(
            containerRef.current,
            studentsToRows(rows),
            HEADERS,
          );
          gridRef.current = g;
          (g.container as any).__onRowsRendered = refreshVisibleCountSoon;
          forceRerender((n) => n + 1);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Failed to load students");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (gridRef.current) {
        gridRef.current.destroy();
        gridRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instituteFilter]);

  const handleRefresh = async () => {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: e } = await supabase
        .from("students")
        .select("id,index_number,name,phone_number,institute,created_at")
        .order("created_at", { ascending: false });
      if (e) throw e;
      const rows = (data as StudentRow[]) ?? [];
      studentsRef.current = rows;
      setTotal(rows.length);
      if (gridRef.current) {
        gridRef.current.rowManager.setRows(studentsToRows(rows));
      } else if (containerRef.current) {
        const g = new Grid(containerRef.current, studentsToRows(rows), HEADERS);
        gridRef.current = g;
      }
      applyFilters();
      setVisibleCount(rows.length);
    } catch (err: any) {
      setError(err?.message || "Failed to refresh");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-8 sm:py-10">
      <div className="max-w-6xl mx-auto">
        <div
          className="flex flex-wrap items-start justify-between gap-3 mb-6 animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_both]"
          style={{ animationFillMode: "both" }}
        >
          <div className="min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-gray-1100 hover:text-gray-1200 transition-colors mb-3 group"
            >
              <svg
                className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Back to registration
            </Link>
            <h1 className="text-2xl tracking-tighter sm:text-3xl font-medium text-gray-1200 text-wrap-balance leading-tight">
              Student Database
            </h1>
            <p className="mt-2 text-text-paragraph text-sm sm:text-base leading-relaxed text-wrap-pretty">
              {loading
                ? "Loading students…"
                : error
                  ? "Could not load records."
                  : `${total.toLocaleString()} students registered across 5 institutes.`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 h-11 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-1200 font-medium active:scale-[0.96] disabled:opacity-60 disabled:active:scale-100 transition-transform duration-150 whitespace-nowrap"
              style={{ boxShadow: "var(--shadow-border)" }}
            >
              <svg
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-3-6.7" />
                <path d="M21 3v6h-6" />
              </svg>
              {loading ? "Loading…" : "Refresh"}
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 h-11 rounded-xl bg-gray-1200 hover:bg-gray-1100 active:bg-gray-1200 text-white font-semibold active:scale-[0.96] transition-transform duration-150 whitespace-nowrap"
              style={{
                boxShadow:
                  "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              + New Registration
            </Link>
          </div>
        </div>

        <div
          className="mb-4 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_0.05s_both]"
          style={{ animationFillMode: "both" }}
        >
          <div className="relative flex-1 max-w-xl">
            
            
          </div>
        </div>

        <div
          className="mb-4 flex flex-wrap items-center gap-2 animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_0.1s_both]"
          style={{ animationFillMode: "both" }}
        >
          {[
            { value: "all", label: "All", prefix: "" },
            ...INSTITUTE_OPTIONS,
          ].map((opt, i) => {
            const active = instituteFilter === opt.value;
            const count = instituteCounts[opt.value] ?? 0;
            return (
              <button
                key={opt.value}
                onClick={() => setInstituteFilter(opt.value)}
                className={`inline-flex items-center gap-2 h-9 px-3.5 rounded-xl text-sm font-medium transition-all duration-150 active:scale-[0.96] whitespace-nowrap ${
                  active ? "text-white" : "text-gray-1200 hover:bg-gray-200"
                }`}
                style={{
                  backgroundColor: active
                    ? "var(--color-gray-1200)"
                    : "var(--color-gray-100)",
                  boxShadow: active
                    ? "0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.06)"
                    : "var(--shadow-border)",
                }}
              >
                {opt.label}
                <span
                  className={`inline-flex items-center justify-center text-[11px] font-semibold tabular-nums rounded-full h-5 min-w-5.5 px-1.5 ${
                    active
                      ? "bg-white/18 text-white"
                      : "bg-gray-200 text-gray-1100"
                  }`}
                >
                  {count.toLocaleString()}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="w-full rounded-2xl bg-preview-bg overflow-hidden animate-[fadeInUp_0.4s_cubic-bezier(0.2,0,0,1)_0.15s_both]"
          style={{
            boxShadow: "var(--shadow-custom)",
            animationFillMode: "both",
          }}
        >
          {error ? (
            <div
              className="p-6 sm:p-8 rounded-2xl m-4 text-center"
              style={{
                backgroundColor: "oklch(0.975 0.03 25)",
                boxShadow: "inset 0 0 0 1px oklch(0.6 0.22 27 / 0.22)",
              }}
            >
              <p className="font-semibold text-red-700 mb-1">
                Failed to load students
              </p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-red-600 hover:bg-red-500 text-white text-sm font-semibold active:scale-[0.96] transition-all duration-150"
              >
                Try again
              </button>
            </div>
          ) : (
            <div
              ref={containerRef}
              className="w-full relative"
              style={{
                height: "clamp(420px, 72vh, 760px)",
                contain: "strict",
                background:
                  "linear-gradient(var(--color-gray-100), var(--color-gray-100)) top / 100% 88px no-repeat, var(--color-preview-bg)",
              }}
            />
          )}
        </div>

        <p className="mt-4 text-xs text-center text-gray-1000 leading-relaxed text-wrap-pretty max-w-xl mx-auto">
          Tip: use the Filter inputs above each column for per-column search, or
          the sort arrow ↕ next to them. Click the headers’ arrow buttons to
          sort ascending / descending.
        </p>
      </div>
    </main>
  );
}
