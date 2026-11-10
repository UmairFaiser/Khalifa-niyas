# How the `/students` Table Works — From Database to Screen

A beginner-friendly walkthrough of every piece involved in showing your Supabase
student records inside the fast table on the `/students` page.

Files involved:

| File | Job |
| --- | --- |
| `app/students/page.tsx` | The React page. Fetches data, shapes it, mounts the table. |
| `utils/supabase/client.ts` | Creates the Supabase connection (the "phone line" to your DB). |
| `lib/fast-grid/grid.ts` | The table engine. Decides what is visible and renders it. |
| `lib/fast-grid/row.ts` | A single row on screen + its cells. Also touch scrolling. |
| `lib/fast-grid/cell.ts` | A single cell (`<div>`), plus the header & filter cells. |
| `lib/fast-grid/row-manager.ts` | Holds all data, runs search/sort in a background worker. |
| `lib/fast-grid/scrollbar.ts` | The custom vertical + horizontal scrollbars. |

---

## Table of Contents

1. [The big picture](#1-the-big-picture)
2. [Part 1 — Fetching rows from Supabase](#2-part-1--fetching-rows-from-supabase)
3. [Part 2 — Turning DB objects into grid "Rows"](#3-part-2--turning-db-objects-into-grid-rows)
4. [Part 3 — Creating the Grid](#4-part-3--creating-the-grid)
5. [Part 4 — The two header rows](#5-part-4--the-two-header-rows)
6. [Part 5 — Virtualization (the most important idea)](#6-part-5--virtualization-the-most-important-idea)
7. [Part 6 — Cells: how a value becomes a `<div>`](#7-part-6--cells-how-a-value-becomes-a-div)
8. [Part 7 — Positioning with `translate`](#8-part-7--positioning-with-translate)
9. [Part 8 — Scrolling](#9-part-8--scrolling)
10. [Part 9 — Search & filtering (the worker)](#10-part-9--search--filtering-the-worker)
11. [Part 10 — How the page wires search + institute chips](#11-part-10--how-the-page-wires-search--institute-chips)
12. [Part 11 — Refresh](#12-part-11--refresh)
13. [Key constants cheat sheet](#13-key-constants-cheat-sheet)
14. [Golden rules & gotchas](#14-golden-rules--gotchas)
15. [Loose ends you could tidy later](#15-loose-ends-you-could-tidy-later)

---

## 1. The big picture

Think of the whole thing as an assembly line:

```
 Supabase Postgres
      │  (1) SELECT id, index_number, name, phone_number, institute, created_at
      ▼
 supabase-js  ──►  an array of plain objects
                    [{ id, index_number, name, ... }, ...]
      │  (2) studentsToRows()  ── "translate" DB shape → grid shape
      ▼
 Rows  ──►  [{ id: 0, cells: [{id:0,v:"MX0001"}, {id:1,v:"Ahmed"}, ...] }, ...]
      │  (3) new Grid(container, rows, HEADERS)
      ▼
 Grid  ──►  only draws the rows/cells you can actually SEE (virtualization)
      │
      ▼
 DOM  ──►  plain <div>s positioned with CSS transform translate()
      │
      ▼
 The table you see on /students
```

The crucial mental shift: **the table does not exist as thousands of DOM
elements.** At any moment only ~20–30 rows and ~8 cells per row are real
`<div>`s. Everything else is just numbers in memory until you scroll to it.

---

## 2. Part 1 — Fetching rows from Supabase

`app/students/page.tsx` starts with `"use client"` (line 1). That matters: Supabase
browser calls must run in the browser, so this page is a Client Component.

The connection is created by `createClient()`:

```ts
// utils/supabase/client.ts
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
```

`createBrowserClient` comes from `@supabase/ssr` and reads two environment
variables — your project URL and the public ("publishable") key. Those values are
safe to ship to the browser because Row Level Security on the `students` table
controls what the public key is allowed to read.

The actual fetch happens inside a `useEffect` (`page.tsx` lines 127–175):

```ts
const { data, error } = await supabase
  .from("students")                                            // which table
  .select("id,index_number,name,phone_number,institute,created_at") // which columns
  .order("created_at", { ascending: false });                   // newest first
if (e) throw e;
```

Read it as English: *"From the `students` table, select these 6 columns, newest
first."* What comes back is:

```ts
{ data: [{ id: "...", index_number: "MX0001", name: "Ahmed", phone_number: "07...", institute: "maxicon", created_at: "2026-..." }, ...],
  error: null }
```

Then the page stores it:

```ts
studentsRef.current = rows;   // the raw list, kept in a ref for counts
setTotal(rows.length);        // drives the "49 students registered…" text
setVisibleCount(rows.length); // drives the "49 / 49" badge
```

> **Why a `ref` and not `useState`?** Storing the list in a ref means changing it
> doesn't trigger a React re-render. The table is DOM-managed by fast-grid, not by
> React, so we deliberately keep React out of the loop for the heavy data.

If the request fails, `setError(...)` is called and the page shows the red
"Failed to load students" block instead of the table.

---

## 3. Part 2 — Turning DB objects into grid "Rows"

The table engine (`fast-grid`) knows nothing about Supabase, `index_number`, or
phone formats. It only understands **one extremely simple shape**, defined in
`lib/fast-grid/row.ts` (lines 18–26):

```ts
export type Cell = { id: number; v: string | number };
export interface Row { id: number; cells: Cell[] }
```

- `v` = the **value** (text) shown in the cell.
- `id` = a **number** the engine uses as a handle (see the golden rules below —
  this must be a number, not a UUID string).
- A `Row` is just a number + an array of cells.

So we need a **translator**: `studentsToRows` (`page.tsx` lines 46–60):

```ts
const studentsToRows = (students: StudentRow[]): Rows =>
  students.map((s, idx) => ({
    id: idx,                       // 0,1,2,3… simple sequential handle
    cells: [
      { id: 0, v: s.index_number },              // column 0 → "Index"
      { id: 1, v: s.name },                      // column 1 → "Name"
      { id: 2, v: s.phone_number },              // column 2 → "Phone Number"
      { id: 3, v: INSTITUTE_LABEL[s.institute] },// column 3 → "Institute"
      { id: 4, v: formatDate(s.created_at) },    // column 4 → "Registered"
    ],
  } satisfies Row));
```

Two things to notice:

1. **Order is everything.** The `cells` array order must match the `HEADERS`
   array order exactly. Cell index 3 *is* the Institute column. There is no name
   binding — it is pure positional.
2. **We clean the data while translating.** `institute` is stored as `"maxicon"`
   but we show `"Maxicon"` via `INSTITUTE_LABEL` (lines 18–24); `created_at` is an
   ISO string that we reformat with `formatDate` into `2026-09-22 14:30`. The
   database never changes — only the display copy does.

`HEADERS` (line 34) is what the header row prints:

```ts
const HEADERS = ["Index", "Name", "Phone Number", "Institute", "Registered"];
```

The `satisfies Row` at the end is a TypeScript check that says "trust me, this
object matches the `Row` type" without widening the type.

---

## 4. Part 3 — Creating the Grid

Still in that `useEffect`, once we have `rows`:

```ts
const g = new Grid(containerRef.current, studentsToRows(rows), HEADERS);
gridRef.current = g;
```

`containerRef` points at the empty `<div>` in the JSX (lines 349–358):

```tsx
<div ref={containerRef} className="w-full relative"
  style={{ height: "clamp(420px, 72vh, 760px)", contain: "strict", background: "..." }} />
```

That div is the **viewport** — the window through which you see the table. It has
a fixed height (that `clamp`), which is essential: virtualization needs to know
"how tall is the visible window?".

Now `new Grid(...)` runs. Inside the constructor (`grid.ts` lines 45–70):

| Step | What happens |
| --- | --- |
| 1 | Measure `container.clientWidth` / `clientHeight` → viewport size. |
| 2 | Create the **RowManager** — this owns ALL rows and spawns the background worker. |
| 3 | Create the two header rows (`createHeader`). |
| 4 | Compute the initial **state** (`getState()`) — which rows/cells are visible right now. |
| 5 | Create the **Scrollbar** and attach it to the container. |
| 6 | Attach **TouchScrolling** for phones. |
| 7 | Attach a **ResizeObserver** so the table re-renders when the window resizes. |
| 8 | `renderViewportRows()` — draw the first screenful. |

When the component unmounts, the cleanup (lines 166–173) calls `grid.destroy()`,
which removes the DOM and terminates the worker. Skipping this leaks memory across
navigations.

---

## 5. Part 4 — The two header rows

`createHeader` (`grid.ts` lines 72–97) builds **two** rows, not one:

```ts
const toolsRow  = new RowComponent(this, HEADER_ID, headers.map((_, i) => ({ id: i, v: "" })), 0,
                                   FilterCell);          // row 1: filter inputs + sort arrows
const headerRow = new RowComponent(this, HEADER_ID, headers.map((h, i) => ({ id: i, v: h })), ROW_HEIGHT,
                                   HeaderCell);          // row 2: the labels
```

- `FilterCell` = the little rounded search box + sort arrow above each column.
- `HeaderCell` = the bold-ish label ("Index", "Name", …).
- Both are pinned because every data row's Y position is offset by
  `ROW_HEIGHT * headerRows.length` (2 × 44 = 88px) — see `getState`, line 152.

That 88px is also why the container's CSS `background` is a `linear-gradient` that
covers exactly the top `88px`: it paints the header strip so there is no visual gap
before the first real row is drawn.

`FilterCell` (`cell.ts` lines 127–291) is where the per-column search input lives.
When you type in it:

```ts
this.grid.rowManager.view.filter[this.index] = this.input.value;
this.grid.rowManager.runFilter();
```

…it writes into the shared `view` object and asks the manager to recompute (Part 9).

`HeaderID` is a single magic number `99999999999999` (`grid.ts` line 27) shared by
both header rows, so they never collide with real data row ids.

---

## 6. Part 5 — Virtualization (the most important idea)

**Problem:** 800 students now, potentially many thousands later. If you create one
`<div>` per cell, that's `rows × columns` DOM nodes. At 10,000 rows × 5 columns =
50,000 nodes. The browser would crawl.

**Solution:** only ever create the nodes that are visible, and *recycle* them as you
scroll. This is called **virtualization** (or windowing).

The math lives in `getState()` (`grid.ts` lines 99–186). Given the scroll offset and
the viewport size:

```ts
const ROW_HEIGHT = 44;
const CELL_WIDTH = 230;

const startRow = Math.floor(this.offsetY / ROW_HEIGHT);
const endRow   = Math.min(startRow + rowsPerViewport, numRows);
```

`startRow` is the first row currently at the top of the window; `endRow` is the last
one. If the window fits ~15 rows, we render rows `startRow … startRow+15` — nothing
more. The same idea happens horizontally with `startCell`/`endCell`.

It also computes the totals used by the scrollbar:

```ts
const tableHeight = numRows * ROW_HEIGHT;   // the "pretend" full height
const scrollableHeight = Math.max(tableHeight - viewportHeight, 0);
```

`tableHeight` is the height the table *would* be if fully drawn. The scrollbar thumb
size/position is derived from it, so scrolling feels normal even though the rows
aren't really there.

`renderViewportRows()` (lines 188–248) then does the drawing, in three phases:

1. **Mark** every row id that should be visible (`renderRows`).
2. **Reuse** — pull a `RowComponent` from the `removeRows` pool and repoint it at the
   new data (`reuseRow.cells = row.cells`). This is why scrolling is cheap: no new
   DOM nodes, just new text in existing nodes.
3. **Destroy** — any pooled row left over is removed.

The identical three-phase pattern appears for cells in `RowComponent.renderCells()`
(`row.ts` lines 72–117).

> **Analogy:** it's a theatre with 15 seats and 10,000 actors. Only 15 actors are on
> stage at once; as the show scrolls, actors walk off, change costume, and walk back
> on. You never build a bigger stage.

---

## 7. Part 6 — Cells: how a value becomes a `<div>`

`StringCell` (`cell.ts` lines 37–78) is the class that turns `{ id: 0, v: "MX0001" }`
into an actual element. Key points:

```ts
this.el = document.createElement("div");       // a plain div — NOT React
this.el.style.width = `${CELL_WIDTH}px`;       // 230px fixed
this.el.style.lineHeight = "43px";             // vertically centres text in a 44px row
this.el.style.fontVariantNumeric = "tabular-nums";  // digits have equal width
this.el.style.whiteSpace = "nowrap";
this.el.style.textOverflow = "ellipsis";       // long names get "…"
```

Three deliberate choices:

- **It's raw DOM, not React JSX.** React reconciliation is overkill for tens of
  thousands of nodes; direct `document.createElement` + `textContent` is far faster.
  This is why the "table" is invisible to React.
- **Column 0 is special.** `fontFor(id)` / `sizeFor(id)` (lines 34–35) give the Index
  column the monospace font and 13px size, so index numbers look like codes.
- **`setContent` only writes when the text actually changed:**

  ```ts
  if (this.el.textContent !== String(text)) this.el.textContent = String(text);
  ```

  During scrolling the same element is reused for many rows; skipping no-op writes
  avoids pointless layout work.

`setOffset` and `reuse` are how the recycler moves and re-labels a cell without
rebuilding it.

---

## 8. Part 7 — Positioning with `translate`

No cell or row uses `top`/`left` in a flow layout. Everything is absolutely
positioned and then moved with **CSS `transform`**:

```ts
// row.ts
this.el.style.transform = `translateY(${offset}px)`;   // vertical position
// cell.ts
this.el.style.transform = `translateX(${offset}px)`;   // horizontal position
```

Why? `transform` is handled by the GPU compositor and does **not** trigger layout or
paint recalculations the way changing `top`/`left` does. Moving 20 rows with
`translateY` is essentially free; moving them with `top` would force the browser to
re-layout every time.

So a visible cell's final position is roughly:

```
X = cellOffset  + (cellIndexInView − startCell) * 230
Y = rowOffset   + (rowIndexInView  − startRow)  * 44   (+ 88 for headers)
```

…and each element just carries its own slice of that formula as a `translate`.

---

## 9. Part 8 — Scrolling

There is **no native scrollbar**. The container's wheel/touch events are captured
and turned into number changes, then the viewport is redrawn. Why? Because the real
DOM only contains ~15 rows, so there is no tall element for the browser to scroll.

`Scrollbar` (`scrollbar.ts`) draws two tracks (`trackY`, `trackX`) and two thumbs, and
sizes the thumbs from the numbers `getState()` produced:

```ts
this.thumbY.style.height    = `${thumbSizeY}px`;      // proportional to content
this.thumbY.style.transform = `translateY(${offset}px)`;  // where you are
```

The wheel handler (`scrollbar.ts`, `onContainerWheel`) batches deltas:

```ts
this.transientScrollOffsetY += deltaY;
if (this.isScrolling) return;
this.isScrolling = true;
window.requestAnimationFrame(() => {          // at most one repaint per frame
  this.scrollBy(undefined, this.transientScrollOffsetY);
  ...
});
```

`scrollBy` updates `offsetY`/`offsetX` and calls `renderViewportRows()` /
`renderViewportCells()` — the same recycle-and-reposition machinery from Part 5.
So "scrolling" literally means "recompute which row ids are visible and re-label the
existing divs".

`TouchScrolling` (`row.ts` lines 120–208) does the same for touch devices: it reads
`touchmove`, converts the drag into synthetic `wheel` events, and even simulates
momentum by shrinking the delta by a factor of `0.95` per frame after you lift your
finger.

---

## 10. Part 9 — Search & filtering (the worker)

Each row's data lives in `RowManager.rows` (`row-manager.ts`). Filtering and sorting
are expressed in a small object called the **view**:

```ts
export type View = {
  filter: Record<number, string>;                                  // columnIndex → text
  sort:   { direction: "ascending" | "descending"; column: number }[];
  version: number;                                                 // bumped to cancel stale jobs
};
```

### Why a worker?

Matching text across, say, 100,000 rows must not freeze the UI. So `RowManager`
spawns a **Web Worker** from a `Blob` (`createWorker`, lines 466–469) — a background
thread with no access to the page.

The worker's job is to answer one question: *"Given this filter, which row ids
match, and in what order?"* It writes the answer (a list of row ids) into a shared
typed array called the **view buffer**.

```ts
// row-manager.ts — the worker writes matching row ids here
if (matches) { Atomics.store(buffer, offset, row.id); offset++; }
```

The main thread then reads it to know which real row to show at each visible slot:

```ts
// grid.ts, renderViewportRows
row = rowsArr[Atomics.load(viewBuffer.buffer, i)];
```

So the grid shows `rows[ viewBuffer[i] ]` at screen slot `i`. Search changes only the
*map* (buffer → real row), never the row data itself.

### Shared memory & the fallback

```ts
this.hasSAB = typeof SharedArrayBuffer !== "undefined";
```

`SharedArrayBuffer` lets the worker and the page literally share the same memory
(the view buffer), so no copying is needed. The buffer is `4 * 500_000` bytes =
`500,000` slots of 4-byte ints (`Int32Array`), i.e. room for 500k matched rows.

But `SharedArrayBuffer` is only available when the page sets special cross-origin
headers (COOP/COEP). If it isn't available, `runFilter`/`runSort` fall back to
`computeMainThread()` (lines 547–594), which does the exact same filtering/sorting
with plain JS on the main thread. Same result, just less parallel — which is why the
code has two paths.

### Fake cancellation

Because typing produces a new filter every keystroke, the worker needs to abandon
old work:

```ts
this.view.version = Date.now();                 // new job = new version
const shouldCancel = () => msg.viewConfig.version !== currentFilterId[0];
```

If a newer version arrived while the old one was running, the old one bails out. It
also `await letOtherEventsThrough()` (a `setTimeout(0)`) periodically so it can even
*see* the cancel message.

### When nothing is filtered

```ts
isViewEmpty = () => isEmptyFast(this.view.filter) && isEmptyFast(this.view.sort);
```

If the view is empty (no filter, no sort), `isViewResult` is set back to `false` and
`getViewBuffer()` returns `null`. In that state `getNumRows()` returns
`this.rows.length` and the grid renders directly from `rowsArr[i]` — the fast path
with zero filtering overhead.

---

## 11. Part 10 — How the page wires search + institute chips

The global search box and the institute buttons both funnel into `applyFilters()`
(`page.tsx` lines 88–113):

```ts
const view = gridRef.current.rowManager.view;
view.filter = {};                                   // start clean

if (search) {
  for (let i = 0; i < HEADERS.length; i++) view.filter[i] = search;  // search ALL columns
}
if (instituteFilter !== "all") {
  view.filter[3] = INSTITUTE_LABEL[instituteFilter];  // column 3 = Institute
}
gridRef.current.rowManager.runFilter();             // recompute
```

Notes:

- **"Search all columns" is just writing the same term into every column key.**
  Since `filterRows` requires a row to match *every* entry in the filter object, and
  every column shares the term, this works logically.
- **The institute chip is a single-column filter** (`filter[3]`). It's the same
  mechanism the per-column header inputs use.
- **Typing is debounced 80ms** (`onSearchInput`, lines 115–118) so we don't fire a
  recompute on every single keystroke:

  ```ts
  debounceRef.current = setTimeout(() => applyFilters(val), 80);
  ```

- **The "x / y" badge** is React state (`visibleCount` / `total`), refreshed right
  after the filter runs by reading `rowManager.getNumRows()`.
- **Institute counts** on the chips come from `instituteCounts` (lines 78–86), a
  `useMemo` that tallies `studentsRef.current` by `institute`.

---

## 12. Part 11 — Refresh

The refresh button calls `handleRefresh()` (lines 182–208). It re-runs the same
`select(...)` query and hands the new data to the existing grid:

```ts
gridRef.current.rowManager.setRows(studentsToRows(rows));
```

`setRows` (`row-manager.ts` lines 534–543) swaps `this.rows`, tells the worker the new
row set (`set-rows` message, which also clears its sort cache), and re-renders. It
does **not** rebuild the worker or the grid — that's the point of keeping the
manager alive.

---

## 13. Key constants cheat sheet

| Name | Value | Where | Meaning |
| --- | --- | --- | --- |
| `ROW_HEIGHT` | `44` | `grid.ts:6` | Height of one data row, in px. |
| `CELL_WIDTH` | `230` | `cell.ts:1` | Width of every column, in px. |
| `HEADER_ID` | `99999999999999` | `grid.ts:27` | Fake row id shared by header rows. |
| header rows | `2` | `createHeader` | Filter row + label row → 88px total. |
| view buffer | `4 * 500_000` bytes | `row-manager.ts:492` | Room for 500,000 matched row ids. |
| `HEADERS` | 5 names | `page.tsx:34` | Must stay in sync with `cells` order. |

---

## 14. Golden rules & gotchas

1. **`Row.id` and `Cell.id` must be numbers.** The engine indexes internal maps and
   the `Int32Array` buffer by them. A UUID string will not work — that's why
   `studentsToRows` uses the array index, not `student.id`.
2. **Cell order must match `HEADERS` order.** There is no key-based binding; column 3
   *is* the 4th cell.
3. **Ids must be unique within a render pass.** Row ids must be unique across rows,
   cell ids unique across columns (0…4 is fine).
4. **Always `destroy()` the grid on unmount**, or the worker and DOM listeners leak.
5. **The data doesn't change when you filter.** Filtering changes the *view buffer*
   (a map of which row is shown where); the underlying `rows` array is untouched.
6. **`SharedArrayBuffer` is optional.** Without COOP/COEP headers the code
   transparently falls back to main-thread computation.
7. **Non-string values are fine** (`Cell.v` is `string | number`) — `setContent`
   calls `String(text)` before writing.

---

## 15. Loose ends you could tidy later

These are harmless but worth knowing about when you read the file:

- In `applyFilters` (`page.tsx` lines 96–98) there's a `for` loop that finds a sort
  entry and assigns it to `header`, but `header` is never used. It's leftover — safe
  to delete.
- `(g.container as any).__onRowsRendered = refreshVisibleCountSoon` (line 154) is
  assigned but the grid never calls it, so `visibleCount` is actually updated by the
  `setTimeout` reads instead. Either wire it up or remove it.
- `studentsToRows` uses the array index as `Row.id`. That's fine for a full reload
  (`setRows` replaces everything), but if you ever want to *update a single row in
  place*, you'd want a stable id derived from `student.id`.

---

### One-sentence summary

Supabase returns plain objects → `studentsToRows` translates them into the grid's
`{ id, cells[] }` shape → `Grid` computes which rows/cells fit in the viewport and
renders only those as absolutely-positioned `<div>`s moved with `translate`, while a
background worker recomputes a row-id "view buffer" whenever you search, sort, or
filter.
