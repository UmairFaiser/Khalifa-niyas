"use client";

import { useEffect, useRef } from "react";
import type { Row } from "../shared";
import { CompactTicker } from "./compact";

// Axis: pixel dither. The heading is drawn on a canvas with an ordered (Bayer)
// dither and revealed by a sweep with static at the front, like the noise-pixel
// reference. A halftone bar fills in underneath like the dotted-bar reference.
const TEXT = "What students say";
const CELL = 2; // CSS px per dither pixel
const SWEEP = 0.7; // how soft the sweep front is
const DURATION = 1100;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(
  (v) => (v + 0.5) / 16,
);

const CSS = `
@keyframes hd-sweep { from { clip-path: inset(0 100% 0 0); } }
@media (prefers-reduced-motion: no-preference) {
  .hd-sweep { animation: hd-sweep ${DURATION}ms cubic-bezier(0.23, 1, 0.32, 1) both; }
}
`;

function DitherHeading() {
  const wrap = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current;
    const probeEl = probe.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!wrapEl || !probeEl || !cv || !ctx) return;

    let alive = true;
    let started = false;
    let raf = 0;
    let progress = 0;
    let ink = "#000";
    let grid: {
      gw: number;
      gh: number;
      w: number;
      h: number;
      alpha: Float32Array;
    } | null = null;

    function build() {
      const style = getComputedStyle(probeEl!);
      const w = wrapEl!.clientWidth;
      const size = w < 640 ? 32 : 44;
      const h = Math.round(size * 1.4);
      const dpr = window.devicePixelRatio || 1;
      cv!.width = Math.round(w * dpr);
      cv!.height = Math.round(h * dpr);
      cv!.style.width = `${w}px`;
      cv!.style.height = `${h}px`;

      const gw = Math.ceil(w / CELL);
      const gh = Math.ceil(h / CELL);
      const off = document.createElement("canvas");
      off.width = gw;
      off.height = gh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.font = `500 ${size / CELL}px ${style.fontFamily}`;
      octx.textAlign = "center";
      octx.textBaseline = "middle";
      octx.fillStyle = "#000";
      octx.fillText(TEXT, gw / 2, gh / 2 + 1);

      const { data } = octx.getImageData(0, 0, gw, gh);
      const alpha = new Float32Array(gw * gh);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
      ink = style.color;
      grid = { gw, gh, w, h, alpha };
    }

    function draw(p: number) {
      if (!grid) return;
      const { gw, gh, w, h, alpha } = grid;
      const dpr = window.devicePixelRatio || 1;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = ink;

      for (let x = 0; x < gw; x++) {
        const L = Math.min(1, Math.max(0, p * (1 + SWEEP) - (x / gw) * SWEEP));
        if (L <= 0) continue;
        const noise = 0.06 * L * (1 - L) * 4; // static only near the front
        for (let y = 0; y < gh; y++) {
          const a = alpha[y * gw + x];
          if (a > 0.04) {
            if (Math.min(1, a * 1.35) * L > BAYER[(y & 3) * 4 + (x & 3)]) {
              ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
          } else if (noise > 0 && Math.random() < noise) {
            ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
    }

    function start() {
      if (!alive) return;
      started = true;
      build();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        progress = 1;
        draw(1);
        return;
      }
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / DURATION);
        progress = 1 - Math.pow(1 - t, 3);
        draw(progress);
        if (t < 1 && alive) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    document.fonts.ready.then(start);
    const ro = new ResizeObserver(() => {
      if (!started) return;
      build();
      draw(progress);
    });
    ro.observe(wrapEl);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-3xl">
      <h1 className="sr-only">{TEXT}</h1>
      {/* Only used to read the real font and colour for the canvas. */}
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute opacity-0 font-medium text-gray-1200"
      >
        {TEXT}
      </span>
      <canvas ref={canvas} aria-hidden className="mx-auto block" />
    </div>
  );
}

// Three dot sizes in three bands, then a solid end: a halftone ramp.
function HalftoneBar() {
  const dots = (r: number) =>
    `radial-gradient(circle, currentColor ${r}px, transparent ${r + 0.5}px)`;
  const band = (from: number, to: number) =>
    `linear-gradient(to right, transparent ${from}%, #000 ${from}% ${to}%, transparent ${to}%)`;
  const layer = (r: number, from: number, to: number) => ({
    backgroundImage: dots(r),
    backgroundSize: "4px 4px",
    maskImage: band(from, to),
    WebkitMaskImage: band(from, to),
  });

  return (
    <div
      aria-hidden
      className="hd-sweep relative mx-auto mt-6 h-3 w-60 text-gray-1200"
    >
      <div className="absolute inset-0" style={layer(0.5, 0, 30)} />
      <div className="absolute inset-0" style={layer(0.9, 30, 60)} />
      <div className="absolute inset-0" style={layer(1.4, 60, 86)} />
      <div className="absolute inset-y-0 right-0 w-[14%] bg-gray-1200" />
    </div>
  );
}

export function Dither({ rows }: { rows: Row[] }) {
  return (
    <CompactTicker
      rows={rows}
      header={
        <header className="text-center">
          <style>{CSS}</style>
          <p className="font-mono text-xs font-semibold uppercase tracking-tight text-gray-1000">
            Testimonials
          </p>
          <div className="mt-3">
            <DitherHeading />
          </div>
          <HalftoneBar />
          <p
            className="proto-rise mx-auto mt-5 max-w-xl text-sm leading-6 text-text-paragraph text-wrap-pretty"
            style={{ "--i": 16 } as React.CSSProperties}
          >
            See what students say about our classes.
          </p>
        </header>
      }
    />
  );
}