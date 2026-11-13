
"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import {
  AnimatePresence,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import type { Transition } from "motion/react";
import { Eraser, Play, Redo2, Square, Undo2 } from "lucide-react";
import { useTheme } from "next-themes";
import { motionTokens } from "../lib/motion-tokens";
import styles from "./signature-pad.module.css";

export interface InkPoint {
  x: number;
  y: number;
  p: number;
  t: number;
}

export type InkColor = "black" | "blue" | "violet" | "white";
export type InkWidth = "fine" | "medium" | "bold";

export interface InkStroke {
  id: string;
  points: InkPoint[];
  color: InkColor;
  width: InkWidth;
  at: number;
}

export interface OutlineOptions {
  size: number;
  thinning?: number;
  streamline?: number;
  simulatePressure?: boolean;
  taperStart?: number;
  taperEnd?: number;
  last?: boolean;
}

export const PAD_WIDTH = 600;
export const PAD_HEIGHT = 260;

const INK: Record<InkColor, { label: string; export: string }> = {
  black: { label: "Black ink", export: "#17171a" },
  blue: { label: "Blue ink", export: "#1d3fae" },
  violet: { label: "Violet ink", export: "#5b35c8" },
  white: { label: "White ink", export: "#ffffff" },
};

/** Returns the actual colour used for drawing and confirmation. */
export function inkColorValue(color: InkColor) {
  return INK[color].export;
}

const WIDTHS: Record<InkWidth, { label: string; size: number }> = {
  fine: { label: "Fine", size: 3.4 },
  medium: { label: "Medium", size: 5.6 },
  bold: { label: "Bold", size: 8.4 },
};

type Vec = [number, number];

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const mul = (a: Vec, n: number): Vec => [a[0] * n, a[1] * n];
const lerp = (a: Vec, b: Vec, t: number): Vec => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];
const dist = (a: Vec, b: Vec) =>
  Math.hypot(a[0] - b[0], a[1] - b[1]);

const norm = (a: Vec): Vec => {
  const l = Math.hypot(a[0], a[1]);
  return l ? [a[0] / l, a[1] / l] : [0, 0];
};

const perp = (a: Vec): Vec => [a[1], -a[0]];
const dot = (a: Vec, b: Vec) => a[0] * b[0] + a[1] * b[1];

const rotAround = (p: Vec, c: Vec, r: number): Vec => {
  const s = Math.sin(r);
  const co = Math.cos(r);
  const px = p[0] - c[0];
  const py = p[1] - c[1];

  return [
    px * co - py * s + c[0],
    px * s + py * co + c[1],
  ];
};

const easeOut = (t: number) => t * (2 - t);

export function getStrokeOutline(
  input: InkPoint[],
  options: OutlineOptions,
): Vec[] {
  const {
    size,
    thinning = 0.62,
    streamline = 0.42,
    simulatePressure = true,
    taperStart = 0,
    taperEnd = 0,
    last = true,
  } = options;

  const [head] = input;
  if (!head) return [];

  const usePen = !simulatePressure && input.some((point) => point.p > 0);

  const pts: {
    at: Vec;
    pressure: number;
    length: number;
    vector: Vec;
  }[] = [];

  let prev: Vec = [head.x, head.y];
  let length = 0;

  const start = {
    at: prev,
    pressure: usePen ? head.p : 0.5,
    length: 0,
    vector: [1, 0] as Vec,
  };

  pts.push(start);

  for (let i = 1; i < input.length; i++) {
    const sample = input[i]!;
    const raw: Vec = [sample.x, sample.y];

    const at =
      i === input.length - 1 && last
        ? raw
        : lerp(prev, raw, 1 - streamline);

    const d = dist(at, prev);
    if (d < 0.4) continue;

    length += d;

    pts.push({
      at,
      pressure: usePen ? sample.p : 0.5,
      length,
      vector: norm(sub(prev, at)),
    });

    prev = at;
  }

  const second = pts[1];
  if (second) start.vector = second.vector;

  const total = length;

  if (pts.length === 1) {
    const r = Math.max(
      0.6,
      size * (0.5 - thinning * (0.5 - start.pressure)) * 0.9,
    );

    return Array.from({ length: 18 }, (_, i) =>
      add(
        start.at,
        mul(
          [
            Math.cos((i / 18) * Math.PI * 2),
            Math.sin((i / 18) * Math.PI * 2),
          ],
          r,
        ),
      ),
    );
  }

  const left: Vec[] = [];
  const right: Vec[] = [];

  let pressure = start.pressure;
  let prevVector = start.vector;

  for (let i = 0; i < pts.length; i++) {
    const point = pts[i]!;

    if (!usePen) {
      const step =
        i === 0 ? 0 : dist(point.at, pts[i - 1]!.at);

      const speed = Math.min(1, step / size);
      const target = Math.min(1, 1 - speed);

      pressure = Math.min(
        1,
        pressure + (target - pressure) * speed * 0.3,
      );
    } else {
      pressure = point.pressure;
    }

    let radius = Math.max(
      0.25,
      size * (0.5 - thinning * (0.5 - pressure)),
    );

    const ts = taperStart
      ? easeOut(Math.min(1, point.length / taperStart))
      : 1;

    const te =
      taperEnd && last
        ? easeOut(Math.min(1, (total - point.length) / taperEnd))
        : 1;

    radius = Math.max(0.12 * size, radius * Math.min(ts, te));

    const next = pts[i + 1]?.vector ?? point.vector;
    const offset = mul(perp(lerp(next, point.vector, 0.5)), radius);

    if (
      i > 0 &&
      i < pts.length - 1 &&
      dot(point.vector, next) < -0.2
    ) {
      const corner = mul(perp(prevVector), radius);

      for (let t = 0; t <= 1; t += 1 / 12) {
        left.push(
          rotAround(
            sub(point.at, corner),
            point.at,
            Math.PI * t,
          ),
        );

        right.push(
          rotAround(
            add(point.at, corner),
            point.at,
            -Math.PI * t,
          ),
        );
      }
    } else {
      left.push(sub(point.at, offset));
      right.push(add(point.at, offset));
    }

    prevVector = point.vector;
  }

  const cap = (
    center: Vec,
    from: Vec,
    to: Vec,
    away: Vec,
  ) => {
    const out: Vec[] = [];
    const r = dist(center, from);
    const startAngle = Math.atan2(
      from[1] - center[1],
      from[0] - center[0],
    );

    const mid = startAngle + Math.PI / 2;
    const sign =
      dot([Math.cos(mid), Math.sin(mid)], away) >= 0 ? 1 : -1;

    for (let k = 1; k < 12; k++) {
      const a = startAngle + sign * Math.PI * k / 12;

      out.push([
        center[0] + Math.cos(a) * r,
        center[1] + Math.sin(a) * r,
      ]);
    }

    out.push(to);
    return out;
  };

  const end = pts[pts.length - 1]!;

  const endCap = cap(
    end.at,
    left[left.length - 1]!,
    right[right.length - 1]!,
    mul(end.vector, -1),
  );

  const startCap = cap(
    start.at,
    right[0]!,
    left[0]!,
    start.vector,
  );

  return [
    ...left,
    ...endCap,
    ...right.reverse(),
    ...startCap,
  ];
}

const round = (value: number) => Math.round(value * 100) / 100;

export function outlineToPath(points: Vec[]) {
  if (points.length < 3) return "";

  let d = `M${round(points[0]![0])} ${round(points[0]![1])} Q`;

  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i]!;
    const [x1, y1] = points[(i + 1) % points.length]!;

    d += `${round(x0)} ${round(y0)} ${round((x0 + x1) / 2)} ${round(
      (y0 + y1) / 2,
    )} `;
  }

  return `${d}Z`;
}

function strokeOptions(
  stroke: Pick<InkStroke, "width" | "points">,
  last: boolean,
): OutlineOptions {
  const size = WIDTHS[stroke.width].size;
  const pen = stroke.points.some((point) => point.p > 0);

  return {
    size,
    simulatePressure: !pen,
    taperStart: size * 1.5,
    taperEnd: pen ? 0 : size * 5,
    last,
  };
}

export function strokePath(
  stroke: Pick<InkStroke, "width" | "points">,
  upTo = Infinity,
) {
  const all = stroke.points;
  const done = upTo >= all[all.length - 1]!.t;

  const points = done
    ? all
    : all.filter((point) => point.t <= upTo);

  return outlineToPath(
    getStrokeOutline(points, strokeOptions(stroke, done)),
  );
}

function inkBounds(strokes: InkStroke[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const stroke of strokes) {
    for (const point of stroke.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  const pad = 16;

  return {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    width: Math.ceil(maxX - minX + pad * 2),
    height: Math.ceil(maxY - minY + pad * 2),
  };
}

export function signatureToSvg(strokes: InkStroke[]) {
  if (!strokes.length) return "";

  const box = inkBounds(strokes);

  const paths = strokes
    .map(
      (stroke) =>
        `<path d="${strokePath(stroke)}" fill="${INK[stroke.color].export}"/>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${box.width}" height="${box.height}">${paths}</svg>`;
}

export interface SignaturePadProps {
  signer?: string;
  hint?: string;
  defaultColor?: InkColor;
  defaultWidth?: InkWidth;
  onChange?: (strokes: InkStroke[]) => void;
  fileName?: string;
  label?: string;
  className?: string;
}

interface History {
  past: InkStroke[][];
  present: InkStroke[];
  future: InkStroke[][];
  fresh: string | null;
}

const { spring, duration, ease, blur } = motionTokens;

const subscribe = () => () => {};

function useReducedFlag() {
  const hydrated = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  return !!useReducedMotion() && hydrated;
}

export function SignaturePad({
  signer,
  hint = "Sign here",
  defaultColor = "black",
  defaultWidth = "medium",
  onChange,
  label = "Signature pad",
  className,
}: SignaturePadProps) {
  const uid = useId().replace(/[^a-zA-Z0-9-]/g, "");
  const reduced = useReducedFlag();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  const [history, setHistory] = useState<History>({
    past: [],
    present: [],
    future: [],
    fresh: null,
  });

  const [color, setColor] = useState<InkColor>(defaultColor);
  const [drawing, setDrawing] = useState(false);
  const [wiping, setWiping] = useState(false);

  const [replay, setReplay] = useState<{
    at: number;
    offsets: number[];
  } | null>(null);

  const padRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLDivElement>(null);
  const liveRef = useRef<SVGPathElement>(null);

  const live = useRef<{
    id: number;
    stroke: InkStroke;
    stamp: number;
  } | null>(null);

  const replayFrame = useRef(0);

  const wipeAnimation = useRef<{
    stop: () => void;
    complete: () => void;
  } | null>(null);

  const counter = useRef(0);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const strokes = history.present;
  const empty = strokes.length === 0;
  const replaying = replay !== null;

  // Width remains fixed. The width selector has been removed.
  const fixedWidth: InkWidth = defaultWidth;

  // Black ink is invisible on the dark pad and white on the light one, so only
  // the ink that reads on the current theme is offered.
  const inks = (Object.keys(INK) as InkColor[]).filter((ink) =>
    dark ? ink !== "black" : ink !== "white",
  );

  useEffect(() => {
    onChangeRef.current?.(strokes);
  }, [strokes]);

  // The default ink follows the theme, and flipping the theme re-homes an ink
  // that would otherwise vanish (black in dark, white in light).
  useEffect(() => {
    if (dark && color === "black") setColor("white");
    else if (!dark && color === "white") setColor("black");
  }, [dark, color]);

  useEffect(
    () => () => cancelAnimationFrame(replayFrame.current),
    [],
  );

  const commit = useCallback(
    (next: InkStroke[], fresh: string | null = null) => {
      setHistory((current) => ({
        past: [...current.past, current.present].slice(-60),
        present: next,
        future: [],
        fresh,
      }));
    },
    [],
  );

  const stopReplay = useCallback(() => {
    cancelAnimationFrame(replayFrame.current);
    setReplay(null);
  }, []);

  const settleWipe = useCallback(() => {
    wipeAnimation.current?.complete();
  }, []);

  function toPad(event: { clientX: number; clientY: number }) {
    const box = padRef.current!.getBoundingClientRect();

    return {
      x: ((event.clientX - box.left) / box.width) * PAD_WIDTH,
      y: ((event.clientY - box.top) / box.height) * PAD_HEIGHT,
    };
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (live.current || (event.pointerType === "mouse" && event.button !== 0)) {
      return;
    }

    event.preventDefault();
    settleWipe();

    if (replaying) stopReplay();

    padRef.current?.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture(event.pointerId);

    const { x, y } = toPad(event);
    const now = event.nativeEvent.timeStamp;

    counter.current += 1;

    const pen = event.pointerType === "pen" && event.pressure > 0;

    live.current = {
      id: event.pointerId,
      stamp: now,
      stroke: {
        id: `${uid}-${counter.current}`,
        color,
        width: fixedWidth,
        at: now,
        points: [
          {
            x,
            y,
            p: pen ? event.pressure : -1,
            t: 0,
          },
        ],
      },
    };

    setDrawing(true);
    paintLive();
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const current = live.current;

    if (!current || current.id !== event.pointerId) return;

    const samples =
      typeof event.nativeEvent.getCoalescedEvents === "function"
        ? event.nativeEvent.getCoalescedEvents()
        : [];

    const list = samples.length ? samples : [event.nativeEvent];

    for (const sample of list) {
      const { x, y } = toPad(sample);

      const pen =
        sample.pointerType === "pen" && sample.pressure > 0;

      current.stroke.points.push({
        x,
        y,
        p: pen ? sample.pressure : -1,
        t: Math.max(
          current.stroke.points[current.stroke.points.length - 1]!.t,
          sample.timeStamp - current.stamp,
        ),
      });
    }

    paintLive();
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const current = live.current;

    if (!current || current.id !== event.pointerId) return;

    live.current = null;

    commit([...strokes, current.stroke], current.stroke.id);

    liveRef.current?.setAttribute("d", "");
    setDrawing(false);

    setStatus(`Stroke added. ${strokes.length + 1} in the signature.`);
  }

  function paintLive() {
    const current = live.current;

    if (!current || !liveRef.current) return;

    liveRef.current.setAttribute(
      "d",
      outlineToPath(
        getStrokeOutline(
          current.stroke.points,
          strokeOptions(current.stroke, false),
        ),
      ),
    );
  }

  function setStatus(message: string) {
    statusRef.current = message;
    forceStatusUpdate((value) => value + 1);
  }

  const statusRef = useRef("");
  const [, forceStatusUpdate] = useState(0);

  function undo() {
    if (!history.past.length || live.current) return;

    settleWipe();
    stopReplay();

    setHistory((current) =>
      current.past.length
        ? {
            past: current.past.slice(0, -1),
            present: current.past[current.past.length - 1]!,
            future: [current.present, ...current.future],
            fresh: null,
          }
        : current,
    );

    setStatus("Undone");
  }

  function redo() {
    if (!history.future.length || live.current) return;

    settleWipe();
    stopReplay();

    setHistory((current) =>
      current.future.length
        ? {
            past: [...current.past, current.present],
            present: current.future[0]!,
            future: current.future.slice(1),
            fresh: null,
          }
        : current,
    );

    setStatus("Redone");
  }

  function clear() {
    if (empty || wiping || live.current) return;

    stopReplay();

    const node = inkRef.current;

    const finish = () => {
      wipeAnimation.current = null;
      commit([]);
      setWiping(false);
      setStatus("Signature cleared. Undo brings it back.");

      if (node) {
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            node.style.clipPath = "";
          }),
        );
      }
    };

    if (!node || reduced) {
      finish();
      return;
    }

    setWiping(true);

    const controls = animate(
      node,
      {
        clipPath: [
          "inset(0% 0% 0% 0%)",
          "inset(0% 0% 0% 100%)",
        ],
      },
      {
        duration: 0.56,
        ease: [...ease.inOut],
      },
    );

    wipeAnimation.current = {
      stop: () => controls.stop(),
      complete: () => {
        controls.complete();
      },
    };

    controls.then(finish);
  }

  function toggleReplay() {
    if (replaying) {
      stopReplay();
      setStatus("Replay stopped");
      return;
    }

    if (empty || live.current) return;

    settleWipe();

    const offsets: number[] = [];
    let cursor = 0;

    strokes.forEach((stroke, index) => {
      if (index > 0) {
        const previous = strokes[index - 1]!;

        const gap =
          stroke.at -
          (previous.at + previous.points[previous.points.length - 1]!.t);

        cursor += Math.min(260, Math.max(90, gap));
      }

      offsets.push(cursor);
      cursor += stroke.points[stroke.points.length - 1]!.t;
    });

    const speed = Math.max(1, cursor / 3200);
    const total = cursor + 120;
    const begin = performance.now();

    const tick = (now: number) => {
      const at = (now - begin) * speed;

      if (at >= total) {
        setReplay(null);
        setStatus("Replay finished");
        return;
      }

      setReplay({ at, offsets });
      replayFrame.current = requestAnimationFrame(tick);
    };

    setReplay({ at: 0, offsets });
    setStatus("Replaying signature");

    replayFrame.current = requestAnimationFrame(tick);
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const mod = event.metaKey || event.ctrlKey;
    const key = event.key.toLowerCase();

    if (mod && key === "z") {
      event.preventDefault();
      if (event.shiftKey) redo();
      else undo();
    } else if (mod && key === "y") {
      event.preventDefault();
      redo();
    } else if (
      !mod &&
      (event.key === "Delete" || event.key === "Backspace") &&
      event.currentTarget === event.target
    ) {
      event.preventDefault();
      clear();
    } else if (event.key === "Escape" && replaying) {
      stopReplay();
    }
  }

  let nib: InkPoint | null = null;
  let nibColor: InkColor = color;

  const visible: {
    stroke: InkStroke;
    d: string | null;
  }[] = [];

  for (let index = 0; index < strokes.length; index++) {
    const stroke = strokes[index]!;

    if (replay === null) {
      visible.push({ stroke, d: null });
      continue;
    }

    const local = replay.at - (replay.offsets[index] ?? 0);
    const lastT = stroke.points[stroke.points.length - 1]!.t;

    if (local < 0) {
      visible.push({ stroke, d: "" });
      continue;
    }

    if (local >= lastT) {
      visible.push({ stroke, d: null });
      continue;
    }

    nib =
      stroke.points.findLast((point) => point.t <= local) ??
      stroke.points[0]!;

    nibColor = stroke.color;

    visible.push({
      stroke,
      d: strokePath(stroke, local),
    });
  }

  const showHint = empty && !drawing && !wiping;

  const hintHidden = reduced
    ? { opacity: 0 }
    : {
        opacity: 0,
        y: 6,
        scale: 0.97,
        filter: `blur(${blur.soft}px)`,
      };

  const t: Transition = reduced
    ? { duration: duration.instant }
    : spring.snappy;

  return (
    <div
      className={[styles.root, className].filter(Boolean).join(" ")}
      data-ink={color}
    >
      <div
        ref={padRef}
        className={styles.pad}
        tabIndex={0}
        role="img"
        aria-roledescription="signature pad"
        aria-label={`${label}. ${
          empty ? "Empty." : `${strokes.length} strokes.`
        } Draw with a pointer, pen, or finger.`}
        aria-describedby={`${uid}-keys`}
        data-drawing={drawing ? "" : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div className={styles.guide} aria-hidden="true">
          <span className={styles.baseline} />

          {signer && (
            <span className={styles.signer}>{signer}</span>
          )}

          <AnimatePresence initial={false}>
            {showHint && (
              <motion.span
                key="hint"
                className={styles.hint}
                initial={hintHidden}
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                }}
                exit={{
                  ...hintHidden,
                  transition: {
                    duration: duration.fast,
                    ease: [...ease.standard],
                  },
                }}
                transition={
                  reduced
                    ? { duration: duration.instant }
                    : {
                        duration: duration.standard,
                        ease: [...ease.enter],
                      }
                }
              >
                {hint}
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <div ref={inkRef} className={styles.ink}>
          <svg
            viewBox={`0 0 ${PAD_WIDTH} ${PAD_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <AnimatePresence initial={false}>
              {visible.map(({ stroke, d }) => (
                <motion.path
                  key={stroke.id}
                  className={styles.stroke}
                  data-color={stroke.color}
                  style={{ fill: INK[stroke.color].export }}
                  d={d ?? strokePath(stroke)}
                  initial={
                    history.fresh === stroke.id
                      ? false
                      : { opacity: 0 }
                  }
                  animate={{ opacity: 1 }}
                  exit={{
                    opacity: 0,
                    transition: {
                      duration: wiping ? 0 : duration.standard,
                      ease: [...ease.standard],
                    },
                  }}
                  transition={{
                    duration: duration.standard,
                    ease: [...ease.standard],
                  }}
                />
              ))}
            </AnimatePresence>

            <path
              ref={liveRef}
              className={styles.stroke}
              data-color={color}
              style={{ fill: INK[color].export }}
            />

            {nib && (
              <circle
                className={styles.nib}
                data-color={nibColor}
                cx={nib.x}
                cy={nib.y}
                r={WIDTHS[fixedWidth].size * 0.9}
                style={{ fill: INK[nibColor].export }}
              />
            )}
          </svg>
        </div>

        {wiping && (
          <motion.span
            className={styles.sweep}
            aria-hidden="true"
            initial={{ x: "0%", opacity: 0 }}
            animate={{
              x: "100%",
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: 0.56,
              ease: [...ease.inOut],
              opacity: {
                duration: 0.56,
                times: [0, 0.12, 0.85, 1],
              },
            }}
          />
        )}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.group}>
          <Choice
            label="Ink color"
            options={inks}
            value={color}
            onChange={(next) => {
              setColor(next);
              setStatus(`${INK[next].label} selected`);
            }}
            layoutId={`${uid}-color`}
            reduced={reduced}
            render={(option) => (
              <span
                className={styles.swatch}
                data-color={option}
                style={{
                  backgroundColor: INK[option].export,
                  border:
                    option === "white"
                      ? "1px solid #a1a1aa"
                      : undefined,
                }}
              />
            )}
            name={(option) => INK[option].label}
          />
        </div>

        <div className={styles.group}>
          <IconButton
            label="Undo"
            onClick={undo}
            disabled={!history.past.length || wiping}
          >
            <Undo2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>

          <IconButton
            label="Redo"
            onClick={redo}
            disabled={!history.future.length || wiping}
          >
            <Redo2 size={18} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>

          <IconButton
            label={replaying ? "Stop replay" : "Replay signature"}
            onClick={toggleReplay}
            disabled={empty || wiping}
            pressed={replaying}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={replaying ? "stop" : "play"}
                className={styles.swap}
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={t}
              >
                {replaying ? (
                  <Square
                    size={15}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                ) : (
                  <Play
                    size={17}
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                )}
              </motion.span>
            </AnimatePresence>
          </IconButton>

          <IconButton
            label="Clear signature"
            onClick={clear}
            disabled={empty || wiping}
          >
            <Eraser
              size={18}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          </IconButton>
        </div>
      </div>

      <p id={`${uid}-keys`} className={styles.srOnly}>
        Press Control or Command Z to undo, add Shift to redo, and
        Delete to clear.
      </p>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {statusRef.current}
      </p>
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={styles.iconButton}
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </button>
  );
}

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  name,
  layoutId,
  reduced,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  render: (option: T) => ReactNode;
  name: (option: T) => string;
  layoutId: string;
  reduced: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;

    if (!step) return;

    event.preventDefault();

    const index =
      (options.indexOf(value) + step + options.length) %
      options.length;

    onChange(options[index]!);
    refs.current[index]?.focus();
  }

  return (
    <div
      className={styles.choice}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {options.map((option, index) => (
        <button
          key={option}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={option === value}
          aria-label={name(option)}
          title={name(option)}
          tabIndex={option === value ? 0 : -1}
          className={styles.option}
          onClick={() => onChange(option)}
        >
          {option === value && (
            <motion.span
              layoutId={layoutId}
              className={styles.selected}
              transition={reduced ? { duration: 0 } : spring.morph}
            />
          )}

          {render(option)}
        </button>
      ))}
    </div>
  );
}

export default SignaturePad;
