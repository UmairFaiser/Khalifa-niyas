// The Dock's Genie for a bottom Dock.
//
// The mesh is ported from raphaelsalaja/raphaelsalaja (packages/springboard,
// MIT), which ports the Dock's own function (macOS 27.0.1). The renderer draws
// one clipped copy of the window per mesh quad and projects it with matrix3d.
// Progress is linear: 0 is the open window, 1 is the window inside the icon.

export type Rect = { x: number; y: number; width: number; height: number };

type Mesh = { rows: number; points: Float32Array };

/* ───────────────────────────────── Mesh ───────────────────────────────── */

const f = Math.fround;
const PI = Math.PI;
const CAPACITY = 1200;
const TOLERANCE = 0.6;
const MAX_CALLS = 64;

const ease = (cosine: number) => cosine * -0.5 + 0.5;

type Counter = { calls: number };

function subdivide(
  buffer: Float32Array,
  offset: number,
  a: number,
  b: number,
  start: number,
  left: number,
  right: number,
  span: number,
  counter: Counter,
): number {
  const atB = ease(Math.cos(((b - start) * PI) / span));
  counter.calls += 1;
  if (counter.calls > MAX_CALLS) return 0;

  const rightB = f(right * atB);
  const leftB = f(left * atB);
  let written = 0;
  let from = a;
  let at = offset;

  for (;;) {
    const length = Math.abs(b - from);
    if (length < 8) return written;
    const mid = (b + from) * 0.5;
    const atFrom = Math.cos(((from - start) * PI) / span);
    const atMid = ease(Math.cos(((mid - start) * PI) / span));
    const leftMid = f(left * atMid);
    const rightMid = f(right * atMid);

    if (length < 128) {
      const eased = ease(atFrom);
      const leftFrom = f(left * eased);
      const leftChord = Math.abs(f(leftB + leftFrom) * 0.5 - leftMid);
      if (leftChord < TOLERANCE) {
        const rightFrom = f(right * eased);
        const rightChord = Math.abs(f(rightB + rightFrom) * 0.5 - rightMid);
        if (rightChord < TOLERANCE) return written;
      }
    }

    const count = subdivide(buffer, at, from, mid, start, left, right, span, counter);
    const index = count + at;
    if (index > CAPACITY - 1) return written;
    buffer[index] = mid;
    buffer[index + 1] = leftMid;
    buffer[index + 2] = rightMid;
    if (index > CAPACITY - 4) return written;
    at = index + 3;
    written += count + 3;
    counter.calls += 1;
    from = mid;
    if (counter.calls >= MAX_CALLS + 1) return written;
  }
}

function axis(window: Rect, icon: Rect) {
  const gap = icon.y - (window.y + window.height);
  const overlap = gap > 0 ? 0 : gap;
  return {
    far: window.y,
    length: window.height,
    near: icon.y,
    iconFar: icon.y + icon.height,
    left: icon.x - window.x,
    right: icon.x + icon.width - (window.x + window.width),
    overlap,
    travel: overlap >= 0 ? icon.y - window.y : window.height,
  };
}

type Axis = ReturnType<typeof axis>;

function timing(p: number, a: Axis) {
  const sides = (Math.abs(a.left) + Math.abs(a.right)) * 0.125;
  const squeeze = Math.abs(a.overlap + a.overlap);
  const bend = Math.abs(squeeze > sides ? squeeze : sides) * 0.5 + 1;
  const bendLength = Math.trunc(Math.log(bend)) * 50;
  const distance = Math.abs(a.travel);
  const slideLength = Math.trunc(Math.log(distance * 0.5 + 1)) * 50;
  const gap = Math.abs(a.travel - a.length);
  const ratio = (slideLength * gap) / distance / slideLength;
  const reach = slideLength * (Math.acos(ratio * -2 + 1) / PI);

  const narrow = bendLength > reach ? bendLength : reach;
  const lead = bendLength > reach ? bendLength - reach : 0;
  const along = (slideLength + lead) * p;
  const narrowAt = along > narrow ? narrow : along;
  const narrowed = (along < 0 ? 0 : narrowAt) / narrow;
  const slid = along - lead;
  const slideAt = slid > slideLength ? slideLength : slid;
  const slidden = (slid < 0 ? 0 : slideAt) / slideLength;

  return {
    bent: ease(Math.cos(narrowed * PI)),
    poured: ease(Math.cos(slidden * PI)),
    gap,
  };
}

function genieMesh(progress: number, window: Rect, icon: Rect): Mesh {
  const a = axis(window, icon);
  const { bent, poured, gap } = timing(f(progress), a);
  const left = a.left * bent;
  const right = a.right * bent;
  const moved = a.travel * poured;
  const span = Math.trunc(a.travel + 0.5);
  const start = a.far + a.overlap * bent;
  const top = start + moved;
  const bottom = a.length + top;
  const neck = poured <= 0 ? bottom : bottom <= a.near ? bottom : a.near;

  const buffer = new Float32Array(CAPACITY);
  const first = ease(Math.cos(((top - start) * PI) / span));
  buffer[0] = top;
  buffer[1] = left * first;
  buffer[2] = right * first;
  const count = subdivide(buffer, 3, top, neck, start, left, right, span, {
    calls: 0,
  });
  const atNeck = ease(Math.cos(((neck - start) * PI) / span));
  buffer[count + 3] = neck;
  buffer[count + 4] = left * atNeck;
  buffer[count + 5] = right * atNeck;
  let floats = count + 6;

  if (Math.abs(moved) > gap) {
    buffer[floats] = bottom > a.iconFar ? a.iconFar : bottom;
    buffer[floats + 1] = left;
    buffer[floats + 2] = right;
    floats += 3;
  }

  const rows = Math.trunc(floats / 3);
  const origin = buffer[0];
  const scale = f(window.height / (buffer[(rows - 1) * 3] - origin));
  const breadth = f(window.width);
  const points = new Float32Array(rows * 8);
  for (let n = 0; n < rows; n++) {
    const position = buffer[n * 3];
    const local = f((position - origin) * scale);
    const near = f(window.x + buffer[n * 3 + 1]);
    const far = f(window.x + window.width + buffer[n * 3 + 2]);
    points.set([0, local, near, position, breadth, local, far, position], n * 8);
  }
  return { rows, points };
}

/* ───────────────────────────────── Slices ───────────────────────────────── */

// The matrix3d taking the rect (0, 0, w, h) onto a quad given as
// [tlx, tly, trx, try, brx, bry, blx, bly] (Heckbert's square-to-quad).
function quadMatrix(q: number[], w: number, h: number) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = q;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dx3 = x0 - x1 + x2 - x3;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const dy3 = y0 - y1 + y2 - y3;
  let g = 0;
  let k = 0;
  if (Math.abs(dx3) > 1e-6 || Math.abs(dy3) > 1e-6) {
    const det = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(det) < 1e-9) return null;
    g = (dx3 * dy2 - dx2 * dy3) / det;
    k = (dx1 * dy3 - dx3 * dy1) / det;
  }
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + k * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + k * y3;
  const values = [a / w, d / w, 0, g / w, b / h, e / h, 0, k / h, 0, 0, 1, 0, x0, y0, 0, 1];
  if (values.some((v) => !Number.isFinite(v))) return null;
  return `matrix3d(${values.map((v) => +v.toFixed(8)).join(",")})`;
}

function cloneWindow(source: HTMLElement, width: number, height: number) {
  const copy = source.cloneNode(true) as HTMLElement;
  for (const node of [copy, ...copy.querySelectorAll<HTMLElement>("*")]) {
    node.removeAttribute("id");
    node.style.animation = "none";
    node.style.transition = "none";
  }
  copy.setAttribute("aria-hidden", "true");
  copy.inert = true;
  Object.assign(copy.style, {
    position: "absolute",
    inset: "auto",
    left: "0",
    top: "0",
    margin: "0",
    boxSizing: "border-box",
    width: `${width}px`,
    height: `${height}px`,
    transform: "none",
    translate: "none",
    opacity: "1",
    visibility: "visible",
    pointerEvents: "none",
  });
  return copy;
}

function createSlices(
  layer: HTMLElement,
  source: HTMLElement,
  width: number,
  height: number,
) {
  const template = cloneWindow(source, width, height);
  const pool: { strip: HTMLDivElement; copy: HTMLElement }[] = [];

  const slice = (index: number) => {
    let item = pool[index];
    if (!item) {
      const strip = document.createElement("div");
      Object.assign(strip.style, {
        position: "absolute",
        left: "0",
        top: "0",
        overflow: "hidden",
        transformOrigin: "0 0",
        pointerEvents: "none",
        backfaceVisibility: "hidden",
      });
      const copy = template.cloneNode(true) as HTMLElement;
      strip.append(copy);
      layer.append(strip);
      item = { strip, copy };
      pool[index] = item;
    }
    return item;
  };

  return {
    draw({ rows, points }: Mesh) {
      let used = 0;
      for (let i = 0; i < rows - 1; i++) {
        const tl = i * 8;
        const tr = tl + 4;
        const bl = tl + 8;
        const br = tl + 12;
        const u0 = points[tl];
        const v0 = points[tl + 1];
        const w = points[br] - u0;
        const h = points[br + 1] - v0;
        if (w < 0.01 || h < 0.01) continue;

        const screen = [tl, tr, br, bl].flatMap((k) => [points[k + 2], points[k + 3]]);
        const matrix = quadMatrix(screen, w, h);
        if (!matrix) continue;

        // Neighbours overlap by half a screen pixel so antialiased edges
        // don't leave hairlines between strips.
        const travelled = Math.hypot(screen[6] - screen[0], screen[7] - screen[1]);
        const pad = Math.min(h / 2, (0.5 * h) / Math.max(travelled, 0.5));

        const { strip, copy } = slice(used++);
        strip.style.display = "block";
        strip.style.width = `${w}px`;
        strip.style.height = `${h + pad * 2}px`;
        strip.style.transform = `${matrix} translate(0px, ${-pad}px)`;
        copy.style.translate = `${-u0}px ${pad - v0}px`;
      }
      for (let i = used; i < pool.length; i++) pool[i].strip.style.display = "none";
    },
    dispose() {
      for (const item of pool) item.strip.remove();
      pool.length = 0;
    },
  };
}

/* ───────────────────────────────── Layer ───────────────────────────────── */

// Progress 0 hides the layer, so a run in flight never draws below this.
const IN_FLIGHT = 1e-4;

// Below this progress the copies fade in over the real window, which stays
// visible underneath, so the switch from live window to copies is a blend.
const HANDOFF = 0.04;

function createLayer(source: HTMLElement, icon: Rect) {
  const computed = getComputedStyle(source);
  const width = Number.parseFloat(computed.width) || source.offsetWidth;
  const height = Number.parseFloat(computed.height) || source.offsetHeight;
  const box = source.getBoundingClientRect();
  const frame: Rect = { x: box.left, y: box.top, width, height };

  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, {
    position: "fixed",
    inset: "0",
    overflow: "hidden",
    pointerEvents: "none",
    // Under the Dock (z-50), so the window pours beneath its glass.
    zIndex: "40",
    display: "none",
  });
  document.body.append(layer);
  const slices = createSlices(layer, source, width, height);

  return {
    draw(progress: number) {
      const shown = progress > 0 && progress < 1;
      layer.style.display = shown ? "block" : "none";
      if (!shown) return;
      layer.style.opacity = progress < HANDOFF ? `${progress / HANDOFF}` : "";
      slices.draw(genieMesh(progress, frame, icon));
    },
    dispose() {
      slices.dispose();
      layer.remove();
    },
  };
}

/* ─────────────────────────────── Controller ─────────────────────────────── */

type ControllerOptions = {
  source: () => HTMLElement | null;
  icon: () => Rect | null;
  reduced: () => boolean;
  /** Seconds for the full 0 to 1 run. The Dock takes half a second. */
  seconds?: number;
};

// Plays the genie linearly between progress values. A run started while one
// is in flight picks up from where it is, so the window can be pulled back out
// of the icon halfway through minimising. The copies are made when a run
// starts, so they always match the window as it is then.
export function createGenie({ source, icon, reduced, seconds = 0.5 }: ControllerOptions) {
  let layer: ReturnType<typeof createLayer> | null = null;
  let progress = 0;
  let frame = 0;
  let run = 0;

  const drop = () => {
    layer?.dispose();
    layer = null;
  };

  const show = (value: number) => {
    progress = value;
    const element = source();
    if (element) element.style.visibility = value >= HANDOFF ? "hidden" : "";
    layer?.draw(value);
  };

  return {
    play(to: 0 | 1, done?: () => void) {
      const id = ++run;
      cancelAnimationFrame(frame);
      const from = progress;
      const length = Math.abs(to - from) * seconds * 1000;

      if (!layer && !reduced()) {
        const element = source();
        const target = icon();
        if (element && target) layer = createLayer(element, target);
      }
      if (!layer || length === 0) {
        show(to);
        drop();
        done?.();
        return;
      }

      const start = performance.now();
      const tick = (now: number) => {
        if (id !== run) return;
        const t = Math.min(Math.max(now - start, 0) / length, 1);
        const value = from + (to - from) * t;
        show(t < 1 ? Math.max(value, IN_FLIGHT) : value);
        if (t < 1) {
          frame = requestAnimationFrame(tick);
        } else {
          drop();
          done?.();
        }
      };
      tick(start);
    },
    dispose() {
      run++;
      cancelAnimationFrame(frame);
      drop();
      const element = source();
      if (element) element.style.visibility = "";
    },
  };
}