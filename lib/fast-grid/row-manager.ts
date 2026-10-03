import { Grid } from "./grid";
import { Row } from "./row";
import { isEmptyFast, wait, Result } from "./row";

export type Rows = Row[];

type ColumnIndex = number;
export type View = {
  filter: Record<ColumnIndex, string>;
  sort: { direction: "ascending" | "descending"; column: ColumnIndex }[];
  version: number;
};

export type RowBuffer = {
  buffer: Int32Array;
  numRows: number;
};

export type ComputeViewEvent = {
  type: "compute-view";
  viewBuffer: Int32Array;
  viewConfig: View;
};
export type SetRowsEvent = { type: "set-rows"; rows: Rows };
type InEvent = { data: ComputeViewEvent | SetRowsEvent };

const WORKER_SRC = `
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const letOtherEventsThrough = () => wait(0);

const isEmptyFast = (obj) => {
  for (const _ in obj) return false;
  return true;
};

const MIN_MERGE = 32;
function minRunLength(n) {
  let r = 0;
  while (n >= MIN_MERGE) {
    r |= n & 1;
    n >>= 1;
  }
  return n + r;
}
function makeAscendingRun(arr, lo, hi, cmp) {
  let runHi = lo + 1;
  if (runHi === hi) return 1;
  if (cmp(arr[runHi++], arr[lo]) < 0) {
    while (runHi < hi && cmp(arr[runHi], arr[runHi - 1]) < 0) runHi++;
    reverseRun(arr, lo, runHi);
  } else {
    while (runHi < hi && cmp(arr[runHi], arr[runHi - 1]) >= 0) runHi++;
  }
  return runHi - lo;
}
function reverseRun(arr, lo, hi) {
  hi--;
  while (lo < hi) {
    const t = arr[lo]; arr[lo++] = arr[hi]; arr[hi--] = t;
  }
}
function binaryInsertionSort(arr, lo, hi, start, cmp) {
  if (start === lo) start++;
  for (; start < hi; start++) {
    const pivot = arr[start];
    let left = lo, right = start;
    while (left < right) {
      const mid = (left + right) >>> 1;
      if (cmp(pivot, arr[mid]) < 0) right = mid;
      else left = mid + 1;
    }
    let n = start - left;
    switch (n) {
      default: while (n > 0) { arr[left + n] = arr[left + n - 1]; n--; } break;
      case 3: arr[left + 3] = arr[left + 2];
      case 2: arr[left + 2] = arr[left + 1];
      case 1: arr[left + 1] = arr[left]; break;
    }
    arr[left] = pivot;
  }
}
function gallopLeft(value, arr, start, length, hint, cmp) {
  let lastOff = 0, maxOff = 0, off = 1;
  if (cmp(value, arr[start + hint]) > 0) {
    maxOff = length - hint;
    while (off < maxOff && cmp(value, arr[start + hint + off]) > 0) {
      lastOff = off; off = (off << 1) + 1;
      if (off <= 0) off = maxOff;
    }
    if (off > maxOff) off = maxOff;
    lastOff += hint; off += hint;
  } else {
    maxOff = hint + 1;
    while (off < maxOff && cmp(value, arr[start + hint - off]) <= 0) {
      lastOff = off; off = (off << 1) + 1;
      if (off <= 0) off = maxOff;
    }
    if (off > maxOff) off = maxOff;
    const t = lastOff; lastOff = hint - off; off = hint - t;
  }
  lastOff++;
  while (lastOff < off) {
    const m = lastOff + ((off - lastOff) >>> 1);
    if (cmp(value, arr[start + m]) > 0) lastOff = m + 1;
    else off = m;
  }
  return off;
}
function gallopRight(value, arr, start, length, hint, cmp) {
  let lastOff = 0, maxOff = 0, off = 1;
  if (cmp(value, arr[start + hint]) < 0) {
    maxOff = hint + 1;
    while (off < maxOff && cmp(value, arr[start + hint - off]) < 0) {
      lastOff = off; off = (off << 1) + 1;
      if (off <= 0) off = maxOff;
    }
    if (off > maxOff) off = maxOff;
    const t = lastOff; lastOff = hint - off; off = hint - t;
  } else {
    maxOff = length - hint;
    while (off < maxOff && cmp(value, arr[start + hint + off]) >= 0) {
      lastOff = off; off = (off << 1) + 1;
      if (off <= 0) off = maxOff;
    }
    if (off > maxOff) off = maxOff;
    lastOff += hint; off += hint;
  }
  lastOff++;
  while (lastOff < off) {
    const m = lastOff + ((off - lastOff) >>> 1);
    if (cmp(value, arr[start + m]) < 0) off = m;
    else lastOff = m + 1;
  }
  return off;
}
class TimSort {
  constructor(array, cmp) {
    this.array = array;
    this.cmp = cmp;
    this.length = array.length;
    this.tmpStorageLength =
      this.length < 512 ? this.length >>> 1 : 256;
    this.tmp = new Array(this.tmpStorageLength);
    this.stackLength =
      this.length < 120 ? 5 : this.length < 1542 ? 10 : this.length < 119151 ? 19 : 40;
    this.runStart = new Array(this.stackLength);
    this.runLength = new Array(this.stackLength);
    this.minGallop = 7;
    this.stackSize = 0;
  }
  pushRun(rs, rl) {
    this.runStart[this.stackSize] = rs;
    this.runLength[this.stackSize] = rl;
    this.stackSize++;
  }
  mergeRuns() {
    while (this.stackSize > 1) {
      let n = this.stackSize - 2;
      if (
        (n >= 1 && this.runLength[n - 1] <= this.runLength[n] + this.runLength[n + 1]) ||
        (n >= 2 && this.runLength[n - 2] <= this.runLength[n] + this.runLength[n + 1])
      ) {
        if (this.runLength[n - 1] < this.runLength[n + 1]) n--;
      } else if (this.runLength[n] > this.runLength[n + 1]) break;
      this.mergeAt(n);
    }
  }
  forceMergeRuns() {
    while (this.stackSize > 1) {
      let n = this.stackSize - 2;
      if (n > 0 && this.runLength[n - 1] < this.runLength[n + 1]) n--;
      this.mergeAt(n);
    }
  }
  mergeAt(i) {
    const cmp = this.cmp;
    const array = this.array;
    let s1 = this.runStart[i], l1 = this.runLength[i];
    let s2 = this.runStart[i + 1], l2 = this.runLength[i + 1];
    this.runLength[i] = l1 + l2;
    if (i === this.stackSize - 3) {
      this.runStart[i + 1] = this.runStart[i + 2];
      this.runLength[i + 1] = this.runLength[i + 2];
    }
    this.stackSize--;
    let k = gallopRight(array[s2], array, s1, l1, 0, cmp);
    s1 += k; l1 -= k;
    if (l1 === 0) return;
    l2 = gallopLeft(array[s1 + l1 - 1], array, s2, l2, l2 - 1, cmp);
    if (l2 === 0) return;
    if (l1 <= l2) this.mergeLow(s1, l1, s2, l2);
    else this.mergeHigh(s1, l1, s2, l2);
  }
  mergeLow(s1, l1, s2, l2) {
    const cmp = this.cmp, array = this.array, tmp = this.tmp;
    let i = 0;
    for (i = 0; i < l1; i++) tmp[i] = array[s1 + i];
    let c1 = 0, c2 = s2, dest = s1;
    array[dest++] = array[c2++];
    if (--l2 === 0) {
      for (i = 0; i < l1; i++) array[dest + i] = tmp[c1 + i];
      return;
    }
    if (l1 === 1) {
      for (i = 0; i < l2; i++) array[dest + i] = array[c2 + i];
      array[dest + l2] = tmp[c1];
      return;
    }
    let mg = this.minGallop;
    while (true) {
      let cc1 = 0, cc2 = 0, exit = false;
      do {
        if (cmp(array[c2], tmp[c1]) < 0) {
          array[dest++] = array[c2++]; cc2++; cc1 = 0;
          if (--l2 === 0) { exit = true; break; }
        } else {
          array[dest++] = tmp[c1++]; cc1++; cc2 = 0;
          if (--l1 === 1) { exit = true; break; }
        }
      } while ((cc1 | cc2) < mg);
      if (exit) break;
      do {
        cc1 = gallopRight(array[c2], tmp, c1, l1, 0, cmp);
        if (cc1 !== 0) {
          for (i = 0; i < cc1; i++) array[dest + i] = tmp[c1 + i];
          dest += cc1; c1 += cc1; l1 -= cc1;
          if (l1 <= 1) { exit = true; break; }
        }
        array[dest++] = array[c2++];
        if (--l2 === 0) { exit = true; break; }
        cc2 = gallopLeft(tmp[c1], array, c2, l2, 0, cmp);
        if (cc2 !== 0) {
          for (i = 0; i < cc2; i++) array[dest + i] = array[c2 + i];
          dest += cc2; c2 += cc2; l2 -= cc2;
          if (l2 === 0) { exit = true; break; }
        }
        array[dest++] = tmp[c1++];
        if (--l1 === 1) { exit = true; break; }
        mg--;
      } while (cc1 >= 7 || cc2 >= 7);
      if (mg < 0) mg = 0;
      mg += 2;
      if (exit) break;
    }
    this.minGallop = mg < 1 ? 1 : mg;
    if (l1 === 1 && l2 > 0) {
      for (i = 0; i < l2; i++) array[dest + i] = array[c2 + i];
      array[dest + l2] = tmp[c1];
    } else if (l1 > 0) {
      for (i = 0; i < l1; i++) array[dest + i] = tmp[c1 + i];
    }
  }
  mergeHigh(s1, l1, s2, l2) {
    const cmp = this.cmp, array = this.array, tmp = this.tmp;
    let i = 0;
    for (i = 0; i < l2; i++) tmp[i] = array[s2 + i];
    let c1 = s1 + l1 - 1, c2 = l2 - 1, dest = s2 + l2 - 1;
    const cursorCmp = (a, b) => cmp(a, b);
    if (--l1 === 0) {
      for (i = 0; i < l2; i++) array[dest - i] = tmp[c2 - i];
      return;
    }
    array[dest--] = array[c1--];
    if (l2 === 1) {
      for (i = 0; i < l1; i++) array[dest - i] = array[c1 - i];
      array[dest - l1] = tmp[c2];
      return;
    }
    let mg = this.minGallop;
    while (true) {
      let cc1 = 0, cc2 = 0, exit = false;
      do {
        if (cursorCmp(tmp[c2], array[c1]) < 0) {
          array[dest--] = array[c1--]; cc1++; cc2 = 0;
          if (--l1 === 0) { exit = true; break; }
        } else {
          array[dest--] = tmp[c2--]; cc2++; cc1 = 0;
          if (--l2 === 1) { exit = true; break; }
        }
      } while ((cc1 | cc2) < mg);
      if (exit) break;
      do {
        cc1 = gallopLeft(tmp[c2], array, s1, l1, l1 - 1, cmp) - (l1 - 0);
        cc1 = Math.min(cc1, l1);
        if (cc1 !== 0) {
          for (i = 0; i < cc1; i++) array[dest - i] = array[c1 - i];
          dest -= cc1; c1 -= cc1; l1 -= cc1;
          if (l1 === 0) { exit = true; break; }
        }
        array[dest--] = tmp[c2--];
        if (--l2 === 1) { exit = true; break; }
        cc2 = gallopRight(array[c1], tmp, 0, l2, l2 - 1, cmp);
        cc2 = Math.min(cc2, l2);
        if (cc2 !== 0) {
          for (i = 0; i < cc2; i++) array[dest - i] = tmp[c2 - i];
          dest -= cc2; c2 -= cc2; l2 -= cc2;
          if (l2 <= 1) { exit = true; break; }
        }
        array[dest--] = array[c1--];
        if (--l1 === 0) { exit = true; break; }
        mg--;
      } while (cc1 >= 7 || cc2 >= 7);
      if (mg < 0) mg = 0;
      mg += 2;
      if (exit) break;
    }
    this.minGallop = mg < 1 ? 1 : mg;
    if (l2 === 1 && l1 > 0) {
      for (i = 0; i < l1; i++) array[dest - i] = array[c1 - i];
      array[dest - l1] = tmp[c2];
    } else if (l2 > 0) {
      for (i = 0; i < l2; i++) array[dest - i] = tmp[c2 - i];
    }
  }
  sort(array, cmp, shouldCancel) {
    const n = array.length;
    if (n < 2) return Promise.resolve({ ok: true });
    return (async () => {
      let lo = 0;
      const remaining = n;
      let stack = this;
      const minRun = minRunLength(n);
      let chunkCount = 0;
      do {
        let runLen = makeAscendingRun(array, lo, n, cmp);
        if (runLen < minRun) {
          const force = Math.min(minRun, n - lo);
          binaryInsertionSort(array, lo, lo + force, lo + runLen, cmp);
          runLen = force;
        }
        stack.pushRun(lo, runLen);
        stack.mergeRuns();
        lo += runLen;
        chunkCount++;
        if (chunkCount % 128 === 0) {
          await letOtherEventsThrough();
          if (shouldCancel()) return { ok: false, error: "canceled" };
        }
      } while (lo < n);
      stack.forceMergeRuns();
      return { ok: true };
    })();
  }
}
async function timSort(arr, cmp, shouldCancel) {
  const ts = new TimSort(arr, cmp);
  return ts.sort(arr, cmp, shouldCancel);
}

const getSortComparisonFn = (config) => (a, b) => {
  for (let col = 0; col < config.length; col++) {
    const [direction, colIndex] = config[col];
    if (direction === null) continue;
    const av = a.cells[colIndex].v, bv = b.cells[colIndex].v;
    if (direction === "ascending") {
      if (av > bv) return 1;
      if (av < bv) return -1;
    } else {
      if (av < bv) return 1;
      if (av > bv) return -1;
    }
  }
  return 0;
};

let rowData = [];
let currentFilterId = [0];
const cache = { sort: null, sortKey: null };

const filterRows = async ({ filter, rowsArr, buffer, shouldCancel, onEarlyResults }) => {
  const lower = Object.fromEntries(Object.entries(filter).map(([k, v]) => [k, String(v).toLowerCase()]));
  const MIN_EARLY = 50;
  const CHUNK = 30000;
  const numChunks = Math.ceil(rowsArr.length / CHUNK);
  let sentEarly = false, offset = 0;
  for (let ci = 0; ci < numChunks; ci++) {
    const s = ci * CHUNK, e = Math.min(s + CHUNK, rowsArr.length);
    await letOtherEventsThrough();
    if (shouldCancel()) return { ok: false, error: "canceled" };
    if (!sentEarly && offset > MIN_EARLY && rowsArr.length > 70000 && s > 30000) {
      onEarlyResults(offset);
      sentEarly = true;
    }
    for (let i = s; i < e; i++) {
      const row = rowsArr[i];
      let matches = true;
      for (const column in lower) {
        if (String(row.cells[column].v).toLowerCase().indexOf(lower[column]) === -1) {
          matches = false; break;
        }
      }
      if (matches) { Atomics.store(buffer, offset, row.id); offset++; }
    }
  }
  return { ok: true, value: { numRows: offset } };
};

const computeView = async ({ rows, buffer, viewConfig, shouldCancel }) => {
  const sortConfig = viewConfig.sort;
  let rowsArr = rows;
  const sortKey = JSON.stringify(sortConfig);
  if (sortKey === cache.sortKey) {
    rowsArr = cache.sort ?? rows;
  } else if (!isEmptyFast(sortConfig)) {
    rowsArr = [...rows];
    const start = performance.now();
    const res = await timSort(
      rowsArr,
      getSortComparisonFn(sortConfig.map((c) => [c.direction, c.column])),
      shouldCancel
    );
    if (!res.ok) return "cancelled";
    cache.sort = rowsArr;
    cache.sortKey = sortKey;
  }
  await letOtherEventsThrough();
  if (shouldCancel()) return "cancelled";
  if (isEmptyFast(viewConfig.filter)) {
    for (let i = 0; i < rowsArr.length; i++) Atomics.store(buffer, i, rowsArr[i].id);
    return rowsArr.length;
  }
  const result = await filterRows({
    filter: viewConfig.filter,
    buffer,
    rowsArr,
    onEarlyResults: (n) => postMessage({ type: "compute-view-done", numRows: n, skipRefreshThumb: true }),
    shouldCancel,
  });
  await letOtherEventsThrough();
  if (shouldCancel() || !result.ok) return "cancelled";
  return result.value.numRows;
};

const handleEvent = async (event) => {
  const msg = event.data;
  switch (msg.type) {
    case "compute-view": {
      currentFilterId[0] = msg.viewConfig.version;
      const shouldCancel = () => msg.viewConfig.version !== currentFilterId[0];
      const numRows = await computeView({
        viewConfig: msg.viewConfig,
        buffer: msg.viewBuffer,
        rows: rowData,
        shouldCancel,
      });
      await letOtherEventsThrough();
      if (shouldCancel() || numRows === "cancelled") {
        postMessage({ type: "compute-view-cancelled" });
        return;
      }
      postMessage({ type: "compute-view-done", numRows });
      return;
    }
    case "set-rows": {
      rowData = msg.rows;
      cache.sort = null;
      cache.sortKey = null;
      return;
    }
  }
};

addEventListener("message", handleEvent);
`;

function createWorker(): Worker {
  const blob = new Blob([WORKER_SRC], { type: "text/javascript" });
  return new Worker(URL.createObjectURL(blob));
}

export class RowManager {
  rows: Rows;
  grid: Grid;
  view: View;
  isViewResult: boolean = false;
  currentFilterId: number;
  viewBuffer: RowBuffer;
  private worker: Worker;
  private hasSAB: boolean;
  private localViewIds: number[] | null = null;
  private destroyed = false;

  constructor(grid: Grid, rows: Rows) {
    this.grid = grid;
    this.rows = rows;
    this.currentFilterId = 0;
    this.view = { filter: {}, sort: [], version: Date.now() };
    this.hasSAB = typeof SharedArrayBuffer !== "undefined";
    this.worker = createWorker();
    this.worker.postMessage({ type: "set-rows", rows } satisfies SetRowsEvent);

    let bufferSizeBytes = 4 * 500_000;
    if (this.hasSAB) {
      const sab = new SharedArrayBuffer(bufferSizeBytes);
      this.viewBuffer = { buffer: new Int32Array(sab), numRows: -1 };
    } else {
      const ab = new ArrayBuffer(bufferSizeBytes);
      this.viewBuffer = { buffer: new Int32Array(ab), numRows: -1 };
    }

    this.worker.onmessage = (event: any) => {
      if (this.destroyed) return;
      switch (event.data.type) {
        case "compute-view-done": {
          const updateThumb = event.data.skipRefreshThumb !== true;
          this.viewBuffer.numRows = event.data.numRows;
          if (!this.hasSAB && event.data.viewIds) {
            this.localViewIds = event.data.viewIds;
          }
          this.isViewResult = true;
          this.grid.renderViewportRows();
          this.grid.renderViewportCells();
          if (updateThumb) {
            this.grid.scrollbar.clampThumbIfNeeded();
            this.grid.scrollbar.refreshThumb();
          }
          break;
        }
      }
    };
  }

  getViewBuffer = (): RowBuffer | null => {
    if (this.isViewResult) return this.viewBuffer;
    return null;
  };

  getNumRows = () => {
    const vb = this.getViewBuffer();
    if (vb == null) return this.rows.length;
    return vb.numRows;
  };

  setRows = (rows: Rows, skipSend = false) => {
    this.rows = rows;
    this.grid.scrollbar.setScrollOffsetY(this.grid.offsetY);
    this.grid.scrollbar.setScrollOffsetX(this.grid.offsetX);
    this.grid.renderViewportRows();
    this.grid.scrollbar.refreshThumb();
    if (!skipSend) {
      this.worker.postMessage({ type: "set-rows", rows } satisfies SetRowsEvent);
    }
  };

  isViewEmpty = () => isEmptyFast(this.view.filter) && isEmptyFast(this.view.sort);

  private computeMainThread = () => {
    const start = performance.now();
    let data = this.rows;
    if (!isEmptyFast(this.view.sort)) {
      data = [...data].sort((a, b) => {
        for (const s of this.view.sort) {
          const av = a.cells[s.column]?.v ?? "";
          const bv = b.cells[s.column]?.v ?? "";
          if (s.direction === "ascending") {
            if (av > bv) return 1;
            if (av < bv) return -1;
          } else {
            if (av < bv) return 1;
            if (av > bv) return -1;
          }
        }
        return 0;
      });
    }
    if (!isEmptyFast(this.view.filter)) {
      const lower = Object.fromEntries(
        Object.entries(this.view.filter).map(([k, v]) => [
          Number(k),
          String(v).toLowerCase(),
        ])
      );
      data = data.filter((row) => {
        for (const k in lower) {
          const col = Number(k);
          if (String(row.cells[col]?.v ?? "").toLowerCase().indexOf(lower[col]) === -1) {
            return false;
          }
        }
        return true;
      });
    }
    const buf = this.viewBuffer.buffer;
    const n = data.length;
    const cap = buf.length;
    for (let i = 0; i < n && i < cap; i++) buf[i] = data[i].id;
    this.viewBuffer.numRows = n;
    this.isViewResult = true;
    this.grid.renderViewportRows();
    this.grid.renderViewportCells();
    this.grid.scrollbar.clampThumbIfNeeded();
    this.grid.scrollbar.refreshThumb();
    console.debug("main-thread view compute took", Math.round(performance.now() - start), "ms for", n, "rows");
  };

  runFilter = async () => {
    this.view.version = Date.now();
    if (this.isViewEmpty()) {
      this.isViewResult = false;
      this.grid.renderViewportRows();
      this.grid.renderViewportCells();
      this.grid.scrollbar.refreshThumb();
    } else if (!this.hasSAB) {
      this.computeMainThread();
    } else {
      this.worker.postMessage({
        type: "compute-view",
        viewConfig: this.view,
        viewBuffer: this.viewBuffer.buffer,
      } as ComputeViewEvent);
    }
  };

  runSort = async () => {
    this.view.version = Date.now();
    if (this.isViewEmpty()) {
      this.isViewResult = false;
      this.grid.renderViewportRows();
      this.grid.renderViewportCells();
      this.grid.scrollbar.refreshThumb();
    } else if (!this.hasSAB) {
      this.computeMainThread();
    } else {
      this.worker.postMessage({
        type: "compute-view",
        viewConfig: this.view,
        viewBuffer: this.viewBuffer.buffer,
      } as ComputeViewEvent);
    }
  };

  destroy = () => {
    this.destroyed = true;
    try { this.worker.terminate(); } catch {}
    this.viewBuffer = null as any;
  };
}
