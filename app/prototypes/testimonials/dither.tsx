"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
 * Dither engine. Text is drawn to a low-res bitmap and turned into pixels by
 * comparing its coverage against an interleaved-gradient-noise threshold, so
 * tone becomes grain (dense = solid, sparse = faint). The reveal front is
 * warped by value noise and the "static" lives in noise blobs that fade out
 * vertically, so nothing is ever a clean rectangle.
 *
 *   mode "grain": dithered reveal; hovering dissolves the title and re-forms it
 *   mode "glyph": letters start as dim binary glyphs and lock into solid letters;
 *                 hovering a letter re-scrambles it and its neighbours
 *   mode "lens" : reveal, then the pointer dithers the text away around it
 * ------------------------------------------------------------------------ */

const CELL = 2; // CSS px per dither pixel
const SWEEP = 0.7; // softness of the reveal front
const WARP = 0.5; // how ragged the front is
const NOISE = 0.22; // static density
const BIT_ALPHA = 0.55; // tone of unresolved binary glyphs
const LENS_R = 22; // lens radius in cells

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

function hash(x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Interleaved gradient noise: film-grain-like, no visible grid.
export function ign(x: number, y: number) {
  const f = (v: number) => v - Math.floor(v);
  return f(52.9829189 * f(0.06711056 * x + 0.00583715 * y));
}

export type DitherMode = "grain" | "glyph" | "lens";

type Grid = {
  gw: number;
  gh: number;
  w: number;
  h: number;
  alpha: Float32Array;
  thr: Float32Array;
  gF: Float32Array;
  blob: Float32Array;
  vf: Float32Array;
  slotLeft: number[];
  slotW: number[];
  font: string;
  off: HTMLCanvasElement;
  octx: CanvasRenderingContext2D;
};

type Timeline = {
  from: number;
  to: number;
  t0: number;
  dur: number;
  then?: () => void;
};

export function DitherHeading({
  text,
  mode,
}: {
  text: string;
  mode: DitherMode;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current;
    const probeEl = probe.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    if (!wrapEl || !probeEl || !cv || !ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = text.length;

    let alive = true;
    let raf = 0;
    let frameNo = 0;
    let p = 0;
    let ink = "#000";
    let tl: Timeline | null = null;
    let g: Grid | null = null;

    // lens
    let lensTarget = 0;
    let lensAmt = 0;
    let lx = -999;
    let ly = -999;
    let tx = -999;
    let ty = -999;

    // glyph
    const resolveAt: number[] = new Array(n).fill(0);
    const bits: string[] = new Array(n).fill("0");
    let lastBits = 0;
    let layerKey = "";
    let lastSlot = -1;

    function build() {
      const style = getComputedStyle(probeEl!);
      const w = wrapEl!.clientWidth;
      const size = w < 640 ? 32 : 44;
      const h = Math.round(size * 1.5);
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
      const font = `500 ${size / CELL}px ${style.fontFamily}`;
      octx.font = font;

      const total = octx.measureText(text).width;
      const start = gw / 2 - total / 2;
      const slotLeft: number[] = [];
      const slotW: number[] = [];
      for (let i = 0; i < n; i++) {
        const pre = octx.measureText(text.slice(0, i)).width;
        const upto = octx.measureText(text.slice(0, i + 1)).width;
        slotLeft.push(start + pre);
        slotW.push(upto - pre);
      }

      const N = gw * gh;
      const thr = new Float32Array(N);
      const gF = new Float32Array(N);
      const blob = new Float32Array(N);
      const vf = new Float32Array(gh);
      for (let y = 0; y < gh; y++) {
        const dy = (y - gh / 2) / (gh * 0.5);
        vf[y] = Math.exp(-dy * dy * 1.6);
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          thr[i] = ign(x, y);
          const raw = x / gw + (vnoise(x * 0.07, y * 0.12) - 0.5) * WARP;
          gF[i] = clamp((raw + WARP / 2) / (1 + WARP));
          blob[i] = smooth(0.35, 0.65, vnoise(x * 0.05 + 11.3, y * 0.1 + 4.7));
        }
      }

      ink = style.color;
      g = {
        gw,
        gh,
        w,
        h,
        alpha: new Float32Array(N),
        thr,
        gF,
        blob,
        vf,
        slotLeft,
        slotW,
        font,
        off,
        octx,
      };
      layerKey = "";
      renderLayer(performance.now());
    }

    // Rebuilds the text bitmap when what is on screen changed.
    function renderLayer(now: number) {
      if (!g) return;
      const { octx, gw, gh, slotLeft, slotW, font, alpha } = g;
      let key = "static";
      if (mode === "glyph") {
        key = "";
        for (let i = 0; i < n; i++) key += resolveAt[i] <= now ? "1" : bits[i];
      }
      if (key === layerKey) return;
      layerKey = key;

      octx.clearRect(0, 0, gw, gh);
      octx.font = font;
      octx.textBaseline = "middle";
      const cy = gh / 2 + 1;
      if (mode === "glyph") {
        for (let i = 0; i < n; i++) {
          const ch = text[i];
          if (ch === " ") continue;
          if (resolveAt[i] <= now) {
            octx.fillStyle = "#000";
            octx.textAlign = "left";
            octx.fillText(ch, slotLeft[i], cy);
          } else {
            octx.fillStyle = `rgba(0,0,0,${BIT_ALPHA})`;
            octx.textAlign = "center";
            octx.fillText(bits[i], slotLeft[i] + slotW[i] / 2, cy);
          }
        }
      } else {
        octx.fillStyle = "#000";
        octx.textAlign = "center";
        octx.fillText(text, gw / 2, cy);
      }
      const { data } = octx.getImageData(0, 0, gw, gh);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
    }

    function draw(animating: boolean) {
      if (!g) return;
      const { gw, gh, w, h, alpha, thr, gF, blob, vf } = g;
      const dpr = window.devicePixelRatio || 1;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = ink;

      const lensOn = mode === "lens" && lensAmt > 0.005;
      // Grain shimmers at ~20fps while moving; the resting frame is stable.
      const shift = animating || lensOn ? ((Math.floor(frameNo / 3) * 0.618) % 1) : 0;

      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          let L = clamp(p * (1 + SWEEP) - gF[i] * SWEEP);
          if (lensOn) {
            const dx = x - lx;
            const dy = y - ly;
            const d = Math.sqrt(dx * dx + dy * dy) / LENS_R;
            if (d < 1) L *= 1 - (1 - d) * (1 - d) * lensAmt;
          }
          if (L <= 0) continue;

          let t = thr[i] + shift;
          if (t >= 1) t -= 1;
          const a = alpha[i];
          if (a > 0.04) {
            if (Math.min(1, a * 1.35) * L > t) {
              ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
          } else {
            const band = 4 * L * (1 - L);
            if (band > 0 && t < NOISE * band * blob[i] * vf[y]) {
              ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
            }
          }
        }
      }
    }

    function loop(now: number) {
      raf = 0;
      if (!alive) return;
      frameNo++;

      if (tl) {
        const t = clamp((now - tl.t0) / tl.dur);
        p = tl.from + (tl.to - tl.from) * easeOut(t);
        if (t >= 1) {
          const then = tl.then;
          tl = null;
          then?.();
        }
      }

      let glyphActive = false;
      if (mode === "glyph") {
        for (let i = 0; i < n; i++) {
          if (text[i] !== " " && resolveAt[i] > now) glyphActive = true;
        }
        if (glyphActive && now - lastBits > 45) {
          for (let i = 0; i < n; i++) {
            if (resolveAt[i] > now) bits[i] = Math.random() < 0.5 ? "0" : "1";
          }
          lastBits = now;
        }
        renderLayer(now);
      }

      if (mode === "lens") {
        lensAmt += (lensTarget - lensAmt) * 0.18;
        if (Math.abs(lensTarget - lensAmt) < 0.004) lensAmt = lensTarget;
        lx += (tx - lx) * 0.35;
        ly += (ty - ly) * 0.35;
      }

      draw(!!tl || glyphActive);

      const lensActive = mode === "lens" && (lensTarget > 0 || lensAmt > 0);
      if (tl || glyphActive || lensActive) raf = requestAnimationFrame(loop);
    }

    function kick() {
      if (!raf && alive) raf = requestAnimationFrame(loop);
    }

    function tween(to: number, dur: number, then?: () => void) {
      tl = { from: p, to, t0: performance.now(), dur, then };
      kick();
    }

    function start() {
      if (!alive) return;
      build();
      const now = performance.now();
      if (mode === "glyph") {
        for (let i = 0; i < n; i++) {
          resolveAt[i] = reduce ? 0 : now + 250 + i * 45 + 350;
        }
      }
      if (reduce) {
        p = 1;
        renderLayer(now);
        draw(false);
        return;
      }
      p = 0;
      tween(1, mode === "glyph" ? 650 : 1100);
    }

    /* ---- pointer ---- */
    function toGrid(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      return [(e.clientX - r.left) / CELL, (e.clientY - r.top) / CELL] as const;
    }

    function onEnter(e: PointerEvent) {
      if (reduce || !g) return;
      if (mode === "grain" && !tl) {
        tween(0, 220, () => tween(1, 900));
      }
      if (mode === "lens") {
        const [x, y] = toGrid(e);
        tx = lx = x;
        ty = ly = y;
        lensTarget = 1;
        kick();
      }
    }

    function onMove(e: PointerEvent) {
      if (reduce || !g) return;
      const [x, y] = toGrid(e);
      if (mode === "lens") {
        tx = x;
        ty = y;
        lensTarget = 1;
        kick();
      }
      if (mode === "glyph") {
        let hit = -1;
        for (let i = 0; i < n; i++) {
          if (text[i] !== " " && x >= g.slotLeft[i] && x < g.slotLeft[i] + g.slotW[i]) {
            hit = i;
            break;
          }
        }
        if (hit !== -1 && hit !== lastSlot) {
          lastSlot = hit;
          const t = performance.now();
          for (const j of [hit - 1, hit, hit + 1]) {
            if (j >= 0 && j < n && text[j] !== " ") {
              resolveAt[j] = Math.max(resolveAt[j], t + 240 + Math.abs(j - hit) * 80);
            }
          }
          kick();
        }
      }
    }

    function onLeave() {
      lastSlot = -1;
      if (mode === "lens") {
        lensTarget = 0;
        kick();
      }
    }

    wrapEl.addEventListener("pointerenter", onEnter);
    wrapEl.addEventListener("pointermove", onMove);
    wrapEl.addEventListener("pointerleave", onLeave);

    let ready = false;
    document.fonts.ready.then(() => {
      ready = true;
      start();
    });
    const ro = new ResizeObserver(() => {
      if (!ready) return;
      build();
      draw(false);
    });
    ro.observe(wrapEl);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrapEl.removeEventListener("pointerenter", onEnter);
      wrapEl.removeEventListener("pointermove", onMove);
      wrapEl.removeEventListener("pointerleave", onLeave);
    };
  }, [text, mode]);

  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-3xl">
      <h1 className="sr-only">{text}</h1>
      {/* Only used to read the real font and colour for the canvas. */}
      <span
        ref={probe}
        aria-hidden
        className="pointer-events-none absolute opacity-0 font-medium text-gray-1200"
      >
        {text}
      </span>
      <canvas ref={canvas} aria-hidden className="mx-auto block" />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * DitherBar: a progress bar made of grain. Sparse on the left, denser toward
 * a solid, ragged leading edge, with a faint speckled track ahead of it.
 * Pass `progress` (0–1) to control it, or `duration` (ms) to let it fill itself.
 * ------------------------------------------------------------------------ */
export function DitherBar({
  progress,
  duration,
  width = 240,
  height = 14,
  className = "text-gray-1200",
}: {
  progress?: number;
  duration?: number;
  width?: number;
  height?: number;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(width * dpr);
    cv.height = Math.round(height * dpr);
    const ink = getComputedStyle(cv).color;
    const gw = Math.floor(width / CELL);
    const gh = Math.floor(height / CELL);

    function paint(pr: number) {
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, width, height);
      ctx!.fillStyle = ink;
      const front = pr * (gw + 4);
      const ragged = 8 * Math.min(1, pr * 4);
      for (let y = 0; y < gh; y++) {
        const edge = front + (vnoise(y * 0.9 + 2, 7) - 0.5) * ragged;
        for (let x = 0; x < gw; x++) {
          const t = ign(x, y);
          if (x <= edge) {
            const d =
              x >= edge - 3
                ? 1
                : Math.pow(clamp(x / Math.max(edge - 3, 1)), 1.6);
            if (d > t) ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
          } else if (t < 0.05) {
            ctx!.globalAlpha = 0.35;
            ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
            ctx!.globalAlpha = 1;
          }
        }
      }
    }

    if (duration === undefined) {
      paint(clamp(progress ?? 0));
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      paint(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - t0) / duration);
      paint(easeOut(t));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress, duration, width, height]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={`block ${className}`}
      style={{ width, height }}
    />
  );
}