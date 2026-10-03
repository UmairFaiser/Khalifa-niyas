import type { Grid } from "./grid";
import { CELL_WIDTH, StringCell } from "./cell";

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export type Result<T = undefined, E = string> =
  | { ok: true; value: T }
  | { ok: false; error?: E };

export const isEmptyFast = (obj: any) => {
  for (const _ in obj) {
    return false;
  }
  return true;
};

export type Cell = {
  id: number;
  v: string | number;
};

export interface Row {
  id: number;
  cells: Cell[];
}

export class RowComponent {
  id: number;
  el: HTMLDivElement;
  cells: Cell[];
  _offset: number;
  CellRenderer:
    | typeof import("./cell").StringCell
    | typeof import("./cell").HeaderCell
    | typeof import("./cell").FilterCell;
  cellComponentMap: Record<string, any>;
  grid: Grid;
  constructor(
    grid: Grid,
    id: number,
    cells: Cell[],
    offset: number,
    CellRenderer: any,
  ) {
    this.grid = grid;
    this.id = id;
    this.cells = cells;
    this._offset = offset;
    this.cellComponentMap = {};
    this.el = document.createElement("div");
    this.el.className = "absolute top-0";
    this.el.style.height = "44px";
    if (CellRenderer !== StringCell) {
      this.el.style.zIndex = "1";
    }
    this.CellRenderer = CellRenderer;
    this.setOffset(this._offset, true);
    this.renderCells();
  }
  destroy() {
    if (this.grid.container.contains(this.el)) {
      this.grid.container.removeChild(this.el);
    }
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset != this._offset) {
      this.el.style.transform = `translateY(${offset}px)`;
    }
    this._offset = offset;
  }
  renderCells() {
    const state = this.grid.getState();
    const renderCells: Record<string, true> = {};
    for (let i = state.startCell; i < state.endCell; i++) {
      const cell = this.cells[i];
      renderCells[cell.id] = true;
    }
    const removeCells: any[] = [];
    for (const id in this.cellComponentMap) {
      if (id in renderCells) {
        continue;
      }
      const cell = this.cellComponentMap[id]!;
      removeCells.push(cell);
    }
    for (let i = state.startCell; i < state.endCell; i++) {
      const cell = this.cells[i]!;
      const offset = state.cellOffset + (i - state.startCell) * CELL_WIDTH;
      const existingCell = this.cellComponentMap[cell.id];
      if (existingCell != null) {
        existingCell.setOffset(offset);
        existingCell.setContent(cell.v);
        continue;
      }
      const reuseCell = removeCells.pop();
      if (reuseCell != null) {
        delete this.cellComponentMap[reuseCell.id];
        reuseCell.reuse(cell.id, offset, cell.v, i);
        this.cellComponentMap[reuseCell.id] = reuseCell;
        continue;
      }
      const newCell = new this.CellRenderer(
        cell.id,
        offset,
        cell.v,
        this.grid,
        i,
      );
      this.el.appendChild(newCell.el);
      this.cellComponentMap[newCell.id] = newCell;
    }
    for (const cell of removeCells) {
      delete this.cellComponentMap[cell.id];
      this.el.removeChild(cell.el);
    }
  }
}

export class TouchScrolling {
  el: HTMLDivElement;
  decelerationId: number | null;
  touchScrollState?: {
    lastOffsetY: number;
    lastDeltaY: number;
    lastOffsetX: number;
    lastDeltaX: number;
  };
  constructor(el: HTMLDivElement) {
    this.el = el;
    this.el.addEventListener("touchstart", this.onTouchStart, {
      passive: true,
    });
    this.el.addEventListener("touchend", this.onTouchEnd);
    this.el.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.decelerationId = null;
  }
  dispatchWheelEvent(deltaY: number, deltaX: number) {
    const wheelEvent = new WheelEvent("wheel", {
      deltaY: deltaY,
      deltaX: deltaX,
      deltaMode: 0,
    });
    this.el.dispatchEvent(wheelEvent);
  }
  simulateDeceleratedScrolling(decelerationId: number) {
    if (this.touchScrollState == null) {
      return;
    }
    const decelerationFactor = 0.95;
    let currentDeltaY = this.touchScrollState.lastDeltaY;
    let currentDeltaX = this.touchScrollState.lastDeltaX;
    const step = () => {
      currentDeltaY *= decelerationFactor;
      currentDeltaX *= decelerationFactor;
      if (
        (Math.abs(currentDeltaY) < 0.1 && Math.abs(currentDeltaX) < 0.1) ||
        decelerationId !== this.decelerationId
      ) {
        return;
      }
      this.dispatchWheelEvent(currentDeltaY, currentDeltaX);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  onTouchStart = (event: TouchEvent) => {
    if (event.touches.length === 1) {
      this.touchScrollState = {
        lastOffsetY: event.touches[0].clientY,
        lastDeltaY: 0,
        lastOffsetX: event.touches[0].clientX,
        lastDeltaX: 0,
      };
      this.decelerationId = Date.now();
    }
  };
  onTouchEnd = () => {
    if (this.touchScrollState != null && this.decelerationId != null) {
      this.simulateDeceleratedScrolling(this.decelerationId);
    }
    delete this.touchScrollState;
  };
  onTouchMove = (event: TouchEvent) => {
    if (this.touchScrollState == null || event.touches.length !== 1) {
      return;
    }
    event.preventDefault();
    const currentTouchY = event.touches[0].clientY;
    const currentTouchX = event.touches[0].clientX;
    const deltaY = this.touchScrollState.lastOffsetY - currentTouchY;
    const deltaX = this.touchScrollState.lastOffsetX - currentTouchX;
    this.dispatchWheelEvent(deltaY, deltaX);
    if (this.touchScrollState != null) {
      this.touchScrollState.lastOffsetY = currentTouchY;
      this.touchScrollState.lastDeltaY = deltaY;
      this.touchScrollState.lastOffsetX = currentTouchX;
      this.touchScrollState.lastDeltaX = deltaX;
      return;
    }
    this.touchScrollState = {
      lastOffsetY: currentTouchY,
      lastDeltaY: deltaY,
      lastOffsetX: currentTouchX,
      lastDeltaX: deltaX,
    };
  };
}
