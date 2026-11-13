"use client";

import { useEffect, useRef } from "react";

/* ---------------------------------------------------------------------------
 * Dither engine. Text is drawn to a low-res bitmap and turned into pixels by
 * comparing its coverage against an interleaved-gradient-noise threshold, so
 * tone becomes grain (dense = solid, sparse = faint). Grain only ever lives
 * INSIDE the shapes. The reveal front is warped by value noise, so it is
 * ragged, never a straight wipe.
 *
 * Modes
 *   grain: dithered reveal
 *   glyph: letters start as dim binary glyphs and lock into solid letters
 *   lens : reveal, then the pointer dithers the shape away around it
 *
 * Interaction (never blinks: grain thins to ~40%, it never goes to zero)
 *   hover  grain: a soft dither pulse sweeps across.  glyph: the letter under
 *          the pointer (and its neighbours) re-decode.
 *   click  pulse + (glyph) the whole title re-decodes
 *   idle   every few seconds a faint band of grain glides across (shimmer).
 *          Skipped while hovering, while animating, or in a hidden tab.
 * All motion is disabled under prefers-reduced-motion.
 * ------------------------------------------------------------------------ */

const CELL = 2; // CSS px per dither pixel
const SWEEP = 0.7; // softness of the reveal front
const WARP = 0.5; // how ragged the front is
const BIT_ALPHA = 0.55; // tone of unresolved binary glyphs
const LENS_R = 22; // lens radius in cells
const DIP = 0.6; // how far a pulse thins the grain (1 would be a blink)
const TYPING_MS = 1500;

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function hash(x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x: number, y: number) {
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
function ign(x: number, y: number) {
  const f = (v: number) => v - Math.floor(v);
  return f(52.9829189 * f(0.06711056 * x + 0.00583715 * y));
}

export type DitherMode = "grain" | "glyph" | "lens";

type Box = { x0: number; x1: number; y0: number; y1: number; r: number };

type Grid = {
  gw: number;
  gh: number;
  w: number;
  h: number;
  cy: number;
  tail: number;
  box: Box | null;
  alpha: Float32Array;
  thr: Float32Array;
  gF: Float32Array;
  slotLeft: number[];
  slotW: number[];
  font: string;
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
  size = [32, 44],
  font = "sans",
  bubble = false,
  heading = true,
  label,
  heightScale = 1.5,
  maxWidth = "max-w-3xl",
  typing = false,
  shimmer,
}: {
  text: string;
  mode: DitherMode;
  /** Font size in px, or [small screens, large screens]. Shrinks to fit. */
  size?: number | [number, number];
  font?: "sans" | "serif";
  /** Draw a speech-bubble outline (with tail) around the text. */
  bubble?: boolean;
  /** Render a real (screen-reader) <h1>. Turn off for decorative shapes. */
  heading?: boolean;
  /** Screen-reader text if it should differ from `text` (e.g. curly quotes). */
  label?: string;
  /** Non-bubble canvas height as a multiple of the font size. */
  heightScale?: number;
  maxWidth?: string;
  /** glyph + bubble only: show "typing…" dots first, then the message. */
  typing?: boolean;
  /** Idle shimmer. Default on (off for lens). */
  shimmer?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [sizeSm, sizeLg] = Array.isArray(size) ? size : [size, size];
  const idle = shimmer ?? mode !== "lens";

  useEffect(() => {
    const wrapEl = wrap.current;
    const probeEl = probe.current;
    const cv = canvas.current;
    const ctx = cv?.getContext("2d");
    const mctx = document.createElement("canvas").getContext("2d");
    if (!wrapEl || !probeEl || !cv || !ctx || !mctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = text.length;

    let alive = true;
    let raf = 0;
    let frameNo = 0;
    let p = 0; // reveal progress
    let dd = 0; // pulse amount (0 = none)
    let ink = "#000";
    let hovering = false;
    let tl: Timeline | null = null;
    let dtl: Timeline | null = null;
    let sh: { t0: number; dur: number } | null = null;
    let shTimer = 0;
    let typingEnd = 0;
    let popAnim: Animation | null = null;
    let g: Grid | null = null;

    // lens
    let lensTarget = 0;
    let lensAmt = 0;
    let lx = -999;
    let ly = -999;
    let tx = -999;
    let ty = -999;

    // glyph: letter i is "scrambling" while from[i] <= now < resolveAt[i]
    const from: number[] = new Array(n).fill(0);
    const resolveAt: number[] = new Array(n).fill(0);
    const bits: string[] = new Array(n).fill("0");
    let lastBits = 0;
    let layerKey = "";
    let lastSlot = -1;
    const isResolved = (i: number, now: number) =>
      now < from[i] || now >= resolveAt[i];

    if (bubble) cv.style.transformOrigin = "14% 100%";

    function build() {
      const style = getComputedStyle(probeEl!);
      const w = wrapEl!.clientWidth;
      const gw = Math.ceil(w / CELL);
      const base = w < 640 ? sizeSm : sizeLg;

      const metrics = (pxv: number) => {
        const fs = pxv / CELL;
        mctx!.font = `500 ${fs}px ${style.fontFamily}`;
        const m = mctx!.measureText(text);
        const cap = mctx!.measureText("H").actualBoundingBoxAscent || fs * 0.72;
        return {
          fs,
          total: m.width,
          cap,
          asc: m.actualBoundingBoxAscent,
          desc: m.actualBoundingBoxDescent,
        };
      };

      // Shrink the type on narrow screens so it (and the bubble) always fit.
      let px = base;
      let mt = metrics(px);
      const need = mt.total + (bubble ? 2 * mt.fs * 0.85 + 6 : 4);
      if (need > gw) {
        px = Math.max(14, Math.floor(px * (gw / need)));
        mt = metrics(px);
      }
      const fs = mt.fs;
      const fontStr = `500 ${fs}px ${style.fontFamily}`;

      let gh: number;
      let cy: number;
      let tail = 0;
      let box: Box | null = null;
      if (bubble) {
        // Equal-ish air around the capitals; a touch more on top so the
        // descenders and the tail don't make the text feel top-heavy.
        tail = 8;
        const padY = mt.cap * 0.75;
        const padTop = padY * 1.15;
        const padBot = padY * 0.95;
        const y0 = 2;
        const y1 = y0 + padTop + mt.cap + padBot;
        gh = Math.ceil(y1 + tail + 2);
        cy = y0 + padTop + mt.cap;
        const padX = fs * 0.85;
        box = {
          x0: Math.max(2, gw / 2 - mt.total / 2 - padX),
          x1: Math.min(gw - 2, gw / 2 + mt.total / 2 + padX),
          y0,
          y1,
          r: (y1 - y0) / 2,
        };
      } else {
        gh = Math.ceil((px * heightScale) / CELL);
        cy = gh / 2 + (mt.asc - mt.desc) / 2;
      }
      const h = gh * CELL;

      const dpr = window.devicePixelRatio || 1;
      cv!.width = Math.round(w * dpr);
      cv!.height = Math.round(h * dpr);
      cv!.style.width = `${w}px`;
      cv!.style.height = `${h}px`;

      const off = document.createElement("canvas");
      off.width = gw;
      off.height = gh;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;

      mctx!.font = fontStr;
      const start = gw / 2 - mt.total / 2;
      const slotLeft: number[] = [];
      const slotW: number[] = [];
      for (let i = 0; i < n; i++) {
        const pre = mctx!.measureText(text.slice(0, i)).width;
        const upto = mctx!.measureText(text.slice(0, i + 1)).width;
        slotLeft.push(start + pre);
        slotW.push(upto - pre);
      }

      const N = gw * gh;
      const thr = new Float32Array(N);
      const gF = new Float32Array(N);
      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          thr[i] = ign(x, y);
          const raw = x / gw + (vnoise(x * 0.07, y * 0.12) - 0.5) * WARP;
          gF[i] = clamp((raw + WARP / 2) / (1 + WARP));
        }
      }

      ink = style.color;
      g = {
        gw,
        gh,
        w,
        h,
        cy,
        tail,
        box,
        alpha: new Float32Array(N),
        thr,
        gF,
        slotLeft,
        slotW,
        font: fontStr,
        octx,
      };
      layerKey = "";
      renderLayer(performance.now());
    }

    // Rebuilds the bitmap whenever what is on screen has changed.
    function renderLayer(now: number) {
      if (!g) return;
      const { octx, gw, gh, slotLeft, slotW, font: f, alpha, cy, tail, box } = g;
      const typingOn = typingEnd > now;
      let key = "static";
      if (typingOn) {
        key = `t${Math.floor(now / 280) % 3}`;
      } else if (mode === "glyph") {
        key = "";
        for (let i = 0; i < n; i++) key += isResolved(i, now) ? "1" : bits[i];
      }
      if (key === layerKey) return;
      layerKey = key;

      octx.clearRect(0, 0, gw, gh);

      if (box) {
        octx.strokeStyle = "rgba(0,0,0,0.85)";
        octx.lineWidth = 1.3;
        octx.lineJoin = "round";
        octx.lineCap = "round";
        octx.beginPath();
        octx.moveTo(box.x0 + box.r, box.y0);
        octx.lineTo(box.x1 - box.r, box.y0);
        octx.arc(box.x1 - box.r, box.y0 + box.r, box.r, -Math.PI / 2, Math.PI / 2);
        octx.lineTo(box.x0 + box.r, box.y1);
        octx.arc(box.x0 + box.r, box.y0 + box.r, box.r, Math.PI / 2, (Math.PI * 3) / 2);
        octx.closePath();
        octx.stroke();
        // tail, bottom-left like a message bubble
        octx.beginPath();
        octx.moveTo(box.x0 + box.r + 8, box.y1);
        octx.lineTo(box.x0 + box.r + 4, box.y1 + tail - 2);
        octx.lineTo(box.x0 + box.r + 22, box.y1);
        octx.stroke();
      }

      if (typingOn && box) {
        const phase = Math.floor(now / 280) % 3;
        const midY = (box.y0 + box.y1) / 2;
        for (let k = 0; k < 3; k++) {
          octx.fillStyle = `rgba(0,0,0,${k === phase ? 0.95 : 0.4})`;
          octx.beginPath();
          octx.arc(gw / 2 + (k - 1) * 12, midY, 3.2, 0, Math.PI * 2);
          octx.fill();
        }
      } else {
        octx.font = f;
        octx.textBaseline = "alphabetic";
        if (mode === "glyph") {
          for (let i = 0; i < n; i++) {
            const ch = text[i];
            if (ch === " ") continue;
            if (isResolved(i, now)) {
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
      }
      const { data } = octx.getImageData(0, 0, gw, gh);
      for (let i = 0; i < alpha.length; i++) alpha[i] = data[i * 4 + 3] / 255;
    }

    function draw(now: number, animating: boolean) {
      if (!g) return;
      const { gw, gh, w, h, alpha, thr, gF } = g;
      const dpr = window.devicePixelRatio || 1;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, w, h);
      ctx!.fillStyle = ink;

      const lensOn = mode === "lens" && lensAmt > 0.005;
      const pulsing = dd > 0.002;
      // Grain shimmers at ~20fps while moving; the resting frame is stable.
      const shift = animating || lensOn ? (Math.floor(frameNo / 3) * 0.618) % 1 : 0;

      let shR = 0;
      let shCx = 0;
      if (sh) {
        const s = clamp((now - sh.t0) / sh.dur);
        shR = gw * 0.14;
        shCx = -shR + easeInOut(s) * (gw + gh * 0.9 + 2 * shR);
      }

      for (let y = 0; y < gh; y++) {
        for (let x = 0; x < gw; x++) {
          const i = y * gw + x;
          const a = alpha[i];
          if (a <= 0.04) continue;

          let L = clamp(p * (1 + SWEEP) - gF[i] * SWEEP);
          if (pulsing) {
            // a ragged wave of thinner grain, never fully empty
            L *= 1 - DIP * clamp(dd * (1 + SWEEP) - gF[i] * SWEEP);
          }
          if (sh) {
            let k = 1 - Math.abs(x + y * 0.9 - shCx) / shR;
            if (k > 0) {
              k = k * k * (3 - 2 * k);
              L *= 1 - 0.5 * k;
            }
          }
          if (lensOn) {
            const dx = x - lx;
            const dy = y - ly;
            const d = Math.sqrt(dx * dx + dy * dy) / LENS_R;
            if (d < 1) L *= 1 - (1 - d) * (1 - d) * lensAmt;
          }
          if (L <= 0) continue;

          let t = thr[i] + shift;
          if (t >= 1) t -= 1;
          if (Math.min(1, a * 1.35) * L > t) {
            ctx!.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
    }

    function isBusy(now: number) {
      if (document.hidden || hovering || tl || dtl || sh || typingEnd > now) return true;
      for (let i = 0; i < n; i++) if (text[i] !== " " && now < resolveAt[i]) return true;
      return false;
    }

    function scheduleShimmer(delay: number) {
      if (!idle || reduce || !alive) return;
      window.clearTimeout(shTimer);
      shTimer = window.setTimeout(() => {
        if (!alive) return;
        if (isBusy(performance.now())) {
          scheduleShimmer(1500);
          return;
        }
        sh = { t0: performance.now(), dur: 1300 };
        kick();
      }, delay);
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
      if (dtl) {
        const t = clamp((now - dtl.t0) / dtl.dur);
        dd = dtl.from + (dtl.to - dtl.from) * easeOut(t);
        if (t >= 1) {
          const then = dtl.then;
          dtl = null;
          then?.();
        }
      }
      if (sh && now - sh.t0 >= sh.dur) {
        sh = null;
        scheduleShimmer(4500 + Math.random() * 4500);
      }

      const typingOn = typingEnd > now;
      let glyphActive = false;
      if (mode === "glyph") {
        for (let i = 0; i < n; i++) {
          if (text[i] !== " " && now < resolveAt[i]) glyphActive = true;
        }
        if (glyphActive && now - lastBits > 45) {
          for (let i = 0; i < n; i++) {
            if (!isResolved(i, now)) bits[i] = Math.random() < 0.5 ? "0" : "1";
          }
          lastBits = now;
        }
      }
      renderLayer(now);

      if (mode === "lens") {
        lensAmt += (lensTarget - lensAmt) * 0.18;
        if (Math.abs(lensTarget - lensAmt) < 0.004) lensAmt = lensTarget;
        lx += (tx - lx) * 0.35;
        ly += (ty - ly) * 0.35;
      }

      draw(now, !!tl || !!dtl || glyphActive || typingOn);

      const lensActive = mode === "lens" && (lensTarget > 0 || lensAmt > 0);
      if (tl || dtl || sh || glyphActive || typingOn || lensActive) {
        raf = requestAnimationFrame(loop);
      }
    }

    function kick() {
      if (!raf && alive) raf = requestAnimationFrame(loop);
    }

    function tween(to: number, dur: number) {
      tl = { from: p, to, t0: performance.now(), dur };
      kick();
    }

    // Dither pulse: thins out then recovers. Retargets from the current
    // value, so rapid hovers/clicks flow into each other instead of blinking.
    function pulse() {
      dtl = {
        from: dd,
        to: 1,
        t0: performance.now(),
        dur: 170,
        then: () => {
          dtl = { from: 1, to: 0, t0: performance.now(), dur: 750 };
        },
      };
      kick();
    }

    function pop() {
      if (!bubble || reduce) return;
      popAnim?.cancel();
      popAnim = cv!.animate(
        [{ transform: "scale(0.965)" }, { transform: "scale(1)" }],
        { duration: 320, easing: "cubic-bezier(0.34, 1.56, 0.64, 1)" },
      );
    }

    function start() {
      if (!alive) return;
      build();
      const now = performance.now();
      if (mode === "glyph") {
        let base = now;
        if (typing && bubble && !reduce) {
          typingEnd = now + TYPING_MS;
          base = typingEnd;
        }
        for (let i = 0; i < n; i++) {
          from[i] = 0;
          resolveAt[i] = reduce ? 0 : base + 250 + i * 45 + 350;
        }
      }
      if (reduce) {
        p = 1;
        renderLayer(now);
        draw(now, false);
        return;
      }
      p = 0;
      tween(1, mode === "glyph" ? 650 : 1100);
      pop();
      scheduleShimmer(4200);
    }

    /* ---- pointer ---- */
    function toGrid(e: PointerEvent) {
      const r = cv!.getBoundingClientRect();
      return [(e.clientX - r.left) / CELL, (e.clientY - r.top) / CELL] as const;
    }

    function onEnter(e: PointerEvent) {
      hovering = true;
      if (reduce || !g) return;
      if (mode === "grain" && dd < 0.05) pulse();
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
            if (j < 0 || j >= n || text[j] === " ") continue;
            if (t >= from[j] && t < resolveAt[j]) {
              resolveAt[j] = Math.max(resolveAt[j], t + 260);
            } else {
              from[j] = t + Math.abs(j - hit) * 40;
              resolveAt[j] = from[j] + 260;
            }
          }
          kick();
        }
      }
    }

    function onDown() {
      if (reduce || !g || mode === "lens") return;
      pulse();
      if (mode === "glyph") {
        // whole title re-decodes as a left-to-right wave; letters go to dim
        // bits (never blank), then lock back in
        const t = performance.now();
        const base = Math.max(t, typingEnd);
        for (let i = 0; i < n; i++) {
          if (text[i] === " ") continue;
          from[i] = base + i * 22;
          resolveAt[i] = from[i] + 280;
        }
      }
      pop();
      kick();
    }

    function onLeave() {
      hovering = false;
      lastSlot = -1;
      if (mode === "lens") {
        lensTarget = 0;
        kick();
      }
    }

    wrapEl.addEventListener("pointerenter", onEnter);
    wrapEl.addEventListener("pointermove", onMove);
    wrapEl.addEventListener("pointerleave", onLeave);
    wrapEl.addEventListener("pointerdown", onDown);

    let ready = false;
    document.fonts.ready.then(() => {
      ready = true;
      start();
    });
    const ro = new ResizeObserver(() => {
      if (!ready) return;
      build();
      draw(performance.now(), false);
    });
    ro.observe(wrapEl);

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearTimeout(shTimer);
      popAnim?.cancel();
      ro.disconnect();
      wrapEl.removeEventListener("pointerenter", onEnter);
      wrapEl.removeEventListener("pointermove", onMove);
      wrapEl.removeEventListener("pointerleave", onLeave);
      wrapEl.removeEventListener("pointerdown", onDown);
    };
  }, [text, mode, sizeSm, sizeLg, font, bubble, heightScale, typing, idle]);

  return (
    <div
      ref={wrap}
      className={`relative mx-auto w-full select-none ${maxWidth}`}
    >
      {heading ? <h1 className="sr-only">{label ?? text}</h1> : null}
      {/* Only used to read the real font and colour for the canvas. */}
      <span
        ref={probe}
        aria-hidden
        className={`pointer-events-none absolute opacity-0 font-medium text-gray-1200 ${
          font === "serif" ? "font-serif" : ""
        }`}
      >
        {text}
      </span>
      <canvas ref={canvas} aria-hidden className="mx-auto block" />
    </div>
  );
}
