export const CELL_WIDTH = 230;

export type CellComponent = {
  id: number;
  el: HTMLDivElement;
  _offset: number;
  setContent: (text: string | number) => void;
  setOffset: (offset: number, force?: boolean) => void;
  reuse: (
    id: number,
    offset: number,
    text: string | number,
    index: number,
  ) => void;
};

const C = {
  text: "var(--color-gray-1200)",
  muted: "var(--color-gray-1100)",
  faint: "var(--color-gray-900)",
  rowBorder: "var(--color-gray-300)",
  headBorder: "var(--color-gray-400)",
  headBg: "var(--color-gray-100)",
  surface: "var(--color-preview-bg)",
  hover: "var(--color-gray-300)",
  accent: "oklch(0.62 0.17 240)",
  accentRing: "oklch(0.62 0.17 240 / 0.18)",
};

const FONT = "inherit";
const MONO = 'var(--font-mono), ui-monospace, "SF Mono", Menlo, monospace';

// Column 0 is the Index column
const fontFor = (id: number) => (id === 0 ? MONO : FONT);
const sizeFor = (id: number) => (id === 0 ? "13px" : "14px");

export class StringCell implements CellComponent {
  id: number;
  el: HTMLDivElement;
  _offset: number;
  constructor(id: number, offset: number, text: string | number) {
    this.id = id;
    this._offset = offset;
    this.el = document.createElement("div");
    this.el.className =
      "h-full box-border cursor-default absolute left-0 overflow-hidden";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.padding = "0 18px";
    this.el.style.borderBottom = `1px solid ${C.rowBorder}`;
    this.el.style.color = C.text;
    this.el.style.fontFamily = fontFor(id);
    this.el.style.fontSize = sizeFor(id);
    this.el.style.lineHeight = "43px";
    this.el.style.fontVariantNumeric = "tabular-nums";
    this.el.style.whiteSpace = "nowrap";
    this.el.style.textOverflow = "ellipsis";
    this.setOffset(this._offset, true);
    this.setContent(text);
  }
  setContent(text: string | number) {
    if (this.el.textContent !== String(text)) {
      this.el.textContent = String(text);
    }
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  }
  reuse(id: number, offset: number, text: string | number) {
    this.id = id;
    this.el.style.fontFamily = fontFor(id);
    this.el.style.fontSize = sizeFor(id);
    this.setOffset(offset, true);
    this.setContent(text);
  }
}

export class HeaderCell implements CellComponent {
  id: number;
  el: HTMLDivElement;
  _offset: number;
  constructor(id: number, offset: number, text: string | number) {
    this.id = id;
    this._offset = offset;
    this.el = document.createElement("div");
    this.el.className =
      "h-full box-border cursor-default absolute left-0 overflow-hidden select-none";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.padding = "0 18px";
    this.el.style.borderBottom = `1px solid ${C.headBorder}`;
    this.el.style.backgroundColor = C.headBg;
    this.el.style.color = C.muted;
    this.el.style.fontFamily = FONT;
    this.el.style.fontSize = "13px";
    this.el.style.fontWeight = "500";
    this.el.style.lineHeight = "43px";
    this.el.style.fontVariantNumeric = "tabular-nums";
    this.el.style.whiteSpace = "nowrap";
    this.el.style.textOverflow = "ellipsis";
    this.setOffset(this._offset, true);
    this.setContent(text);
  }
  setContent(text: string | number) {
    if (this.el.textContent !== String(text)) {
      this.el.textContent = String(text);
    }
  }
  setOffset(offset: number, force: boolean = false) {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  }
  reuse(id: number, offset: number, text: string | number) {
    this.id = id;
    this.setOffset(offset, true);
    this.setContent(text);
  }
}

const ICON_NEUTRAL = "M8 9l4-4 4 4M8 15l4 4 4-4";
const ICON_ASC = "M12 19V5M5 12l7-7 7 7";
const ICON_DESC = "M12 5v14M19 12l-7 7-7-7";

export class FilterCell implements CellComponent {
  grid: any;
  index: number;
  id: number;
  el: HTMLDivElement;
  input: HTMLInputElement;
  arrow: SVGSVGElement;
  arrowPath: SVGPathElement;
  _offset: number;
  constructor(
    id: number,
    offset: number,
    text: string | number,
    grid: any,
    index: number,
  ) {
    this.grid = grid;
    this.index = index;
    this.id = id;
    this._offset = offset;
    this.el = document.createElement("div");
    this.el.className =
      "flex h-full box-border absolute left-0 overflow-hidden items-center gap-1";
    this.el.style.width = `${CELL_WIDTH}px`;
    this.el.style.padding = "0 8px 0 12px";
    this.el.style.backgroundColor = C.headBg;
    this.el.style.borderBottom = `1px solid ${C.rowBorder}`;

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.value = String(text);
    this.input.placeholder = "Filter…";
    this.input.style.flex = "1";
    this.input.style.minWidth = "0";
    this.input.style.height = "30px";
    this.input.style.border = "none";
    this.input.style.outline = "none";
    this.input.style.fontSize = "13px";
    this.input.style.fontFamily = FONT;
    this.input.style.fontVariantNumeric = "tabular-nums";
    this.input.style.padding = "0 12px";
    this.input.style.borderRadius = "999px";
    this.input.style.backgroundColor = C.surface;
    this.input.style.color = C.text;
    this.input.style.boxShadow = "var(--shadow-border)";
    this.input.style.transition = "box-shadow 150ms";
    this.input.addEventListener("input", this.onInputChange);
    this.input.addEventListener("focus", () => {
      this.input.style.boxShadow = `0 0 0 1px ${C.accent}, 0 0 0 4px ${C.accentRing}`;
    });
    this.input.addEventListener("blur", () => {
      this.input.style.boxShadow = "var(--shadow-border)";
    });
    this.el.appendChild(this.input);

    const arrowContainer = document.createElement("div");
    arrowContainer.className =
      "flex items-center justify-center cursor-pointer shrink-0";
    arrowContainer.style.width = "30px";
    arrowContainer.style.height = "30px";
    arrowContainer.style.borderRadius = "999px";
    arrowContainer.style.transition = "background-color 150ms";
    arrowContainer.addEventListener("mouseenter", () => {
      arrowContainer.style.backgroundColor = C.hover;
    });
    arrowContainer.addEventListener("mouseleave", () => {
      arrowContainer.style.backgroundColor = "transparent";
    });
    arrowContainer.addEventListener("click", this.onArrowClick);

    this.arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.arrow.setAttribute("viewBox", "0 0 24 24");
    this.arrow.setAttribute("width", "16");
    this.arrow.setAttribute("height", "16");
    this.arrow.setAttribute("fill", "none");
    this.arrow.setAttribute("stroke", "currentColor");
    this.arrow.setAttribute("stroke-width", "2.2");
    this.arrow.setAttribute("stroke-linecap", "round");
    this.arrow.setAttribute("stroke-linejoin", "round");
    this.arrow.style.color = C.faint;

    this.arrowPath = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "path",
    );
    this.arrowPath.setAttribute("d", ICON_NEUTRAL);
    this.arrow.appendChild(this.arrowPath);
    arrowContainer.appendChild(this.arrow);
    this.el.appendChild(arrowContainer);

    this.syncToFilter();
    this.setOffset(this._offset, true);
  }

  private onInputChange = () => {
    if (this.input.value === "") {
      delete this.grid.rowManager.view.filter[this.index];
    } else {
      this.grid.rowManager.view.filter[this.index] = this.input.value;
    }
    this.grid.rowManager.runFilter();
  };

  private onArrowClick = () => {
    const idx = this.grid.rowManager.view.sort.findIndex(
      (sort: any) => sort.column === this.index,
    );
    const currentSort = idx !== -1 ? this.grid.rowManager.view.sort[idx] : null;
    if (currentSort == null) {
      this.grid.rowManager.view.sort.push({
        direction: "descending",
        column: this.index,
      });
    } else if (currentSort.direction === "descending") {
      currentSort.direction = "ascending";
    } else {
      this.grid.rowManager.view.sort.splice(idx, 1);
    }
    this.syncToFilter();
    this.grid.rowManager.runSort();
  };

  syncToFilter = () => {
    if (this.index in this.grid.rowManager.view.filter) {
      this.input.value = this.grid.rowManager.view.filter[this.index];
    } else {
      this.input.value = "";
    }
    const sort = this.grid.rowManager.view.sort.find(
      (s: any) => s.column === this.index,
    );
    if (sort == null) {
      this.arrowPath.setAttribute("d", ICON_NEUTRAL);
      this.arrow.style.color = C.faint;
    } else {
      this.arrow.style.color = C.accent;
      this.arrowPath.setAttribute(
        "d",
        sort.direction === "descending" ? ICON_DESC : ICON_ASC,
      );
    }
  };

  setContent = () => {
    this.syncToFilter();
  };

  setOffset = (offset: number, force: boolean = false) => {
    if (force || offset !== this._offset) {
      this.el.style.transform = `translateX(${offset}px)`;
    }
    this._offset = offset;
  };

  reuse = (
    id: number,
    offset: number,
    _text: string | number,
    index: number,
  ) => {
    this.id = id;
    this.index = index;
    this.setOffset(offset, true);
    this.syncToFilter();
  };
}
