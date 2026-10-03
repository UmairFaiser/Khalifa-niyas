import { Grid } from "./grid";

export class Scrollbar {
  trackY: HTMLDivElement;
  thumbY: HTMLDivElement;
  trackX: HTMLDivElement;
  thumbX: HTMLDivElement;
  fade: HTMLDivElement;
  isScrolling: boolean;
  transientScrollOffsetY: number;
  transientScrollOffsetX: number;
  grid: Grid;
  constructor(grid: Grid) {
    this.grid = grid;
    this.isScrolling = false;
    this.transientScrollOffsetY = 0;
    this.transientScrollOffsetX = 0;

    this.trackX = document.createElement("div");
    this.trackX.className =
      "absolute bottom-0 z-10 h-[8px] w-full cursor-pointer";
    this.trackX.style.backgroundColor = "transparent";
    this.trackX.style.borderTop = "none";

    this.thumbX = document.createElement("div");
    this.thumbX.className = "h-full cursor-pointer rounded";
    this.thumbX.style.backgroundColor = "var(--color-gray-400)";
    this.thumbX.style.opacity = "0.85";
    this.thumbX.addEventListener("mouseenter", () => {
      this.thumbX.style.backgroundColor = "var(--color-gray-500)";
      this.thumbX.style.opacity = "1";
    });
    this.thumbX.addEventListener("mouseleave", () => {
      this.thumbX.style.backgroundColor = "var(--color-gray-400)";
      this.thumbX.style.opacity = "0.85";
    });

    this.trackY = document.createElement("div");
    this.trackY.className = "absolute right-0 z-10 w-[8px] cursor-pointer";
    this.trackY.style.backgroundColor = "transparent";
    this.trackY.style.borderLeft = "none";

    this.thumbY = document.createElement("div");
    this.thumbY.className = "w-full cursor-pointer rounded";
    this.thumbY.style.backgroundColor = "var(--color-gray-400)";
    this.thumbY.style.opacity = "0.85";
    this.thumbY.addEventListener("mouseenter", () => {
      this.thumbY.style.backgroundColor = "var(--color-gray-500)";
      this.thumbY.style.opacity = "1";
    });
    this.thumbY.addEventListener("mouseleave", () => {
      this.thumbY.style.backgroundColor = "var(--color-gray-400)";
      this.thumbY.style.opacity = "0.85";
    });

    this.trackX.addEventListener("mousemove", this.onTrackMouseMoveX);
    this.trackX.addEventListener("mousedown", this.onTrackMouseDownX);
    this.trackY.addEventListener("mousemove", this.onTrackMouseMoveY);
    this.trackY.addEventListener("mousedown", this.onTrackMouseDownY);
    this.thumbX.addEventListener("mousedown", this.onThumbMouseDownX);
    this.thumbY.addEventListener("mousedown", this.onThumbMouseDownY);
    this.grid.container.addEventListener("wheel", this.onContainerWheel, {
      passive: false,
    });

    this.trackX.appendChild(this.thumbX);
    this.trackY.appendChild(this.thumbY);
    this.grid.container.appendChild(this.trackX);
    this.grid.container.appendChild(this.trackY);

    this.fade = document.createElement("div");
    this.fade.style.position = "absolute";
    this.fade.style.left = "0";
    this.fade.style.right = "0";
    this.fade.style.bottom = "0";
    this.fade.style.height = "36px";
    this.fade.style.pointerEvents = "none";
    this.fade.style.zIndex = "5";
    this.fade.style.opacity = "0";
    this.fade.style.transition = "opacity 200ms ease";
    this.fade.style.background =
      "linear-gradient(to bottom, transparent, var(--color-preview-bg))";
    this.grid.container.appendChild(this.fade);

    this.refreshThumb();
  }

  updateFade = () => {
    const state = this.grid.getState();
    const hasMoreBelow =
      state.scrollableHeight > 0 &&
      this.grid.offsetY < state.scrollableHeight - 2;
    this.fade.style.opacity = hasMoreBelow ? "1" : "0";
    // sit above the horizontal scrollbar when it's visible
    this.fade.style.bottom = state.scrollableWidth > 0 ? "8px" : "0";
  };

  refreshThumb = () => {
    const state = this.grid.getState();

    // Keep the vertical track below the header rows
    const headerHeight =
      this.grid.container.clientHeight - this.grid.viewportHeight;
    this.trackY.style.top = `${headerHeight}px`;
    this.trackY.style.height = `${this.grid.viewportHeight}px`;

    // Only show scrollbars when there is something to scroll
    this.trackY.style.display = state.scrollableHeight > 0 ? "block" : "none";
    this.trackX.style.display = state.scrollableWidth > 0 ? "block" : "none";

    this.translateThumbY(state.thumbOffsetY);
    this.setThumbSizeY(state.thumbSizeY);
    this.translateThumbX(state.thumbOffsetX);
    this.setThumbSizeX(state.thumbSizeX);
  };

  clampThumbIfNeeded = () => {
    const state = this.grid.getState();
    let shouldTranslateThumb = false;
    if (
      this.grid.offsetY != null &&
      (this.grid.offsetY < 0 || this.grid.offsetY > state.scrollableHeight)
    ) {
      this.grid.offsetY = Math.max(
        0,
        Math.min(this.grid.offsetY, state.scrollableHeight),
      );
      shouldTranslateThumb = true;
    }
    if (
      this.grid.offsetX != null &&
      (this.grid.offsetX < 0 || this.grid.offsetX > state.scrollableWidth)
    ) {
      this.grid.offsetX = Math.max(
        0,
        Math.min(this.grid.offsetX, state.scrollableWidth),
      );
      shouldTranslateThumb = true;
    }
    if (shouldTranslateThumb) {
      const s2 = this.grid.getState();
      this.translateThumbX(s2.thumbOffsetX);
      this.translateThumbY(s2.thumbOffsetY);
    }
  };

  setScrollOffsetX = (x: number) => {
    const state = this.grid.getState();
    this.grid.offsetX = Math.max(0, Math.min(x, state.scrollableWidth));
    const s2 = this.grid.getState();
    this.translateThumbX(s2.thumbOffsetX);
  };

  setScrollOffsetY = (y: number) => {
    const state = this.grid.getState();
    this.grid.offsetY = Math.max(0, Math.min(y, state.scrollableHeight));
    const s2 = this.grid.getState();
    this.translateThumbY(s2.thumbOffsetY);
  };

  scrollBy = (x?: number, y?: number) => {
    let renderRows = false;
    let renderCells = false;
    if (y != null && y !== 0) {
      this.setScrollOffsetY(this.grid.offsetY + y);
      renderRows = true;
    }
    if (x != null && x !== 0) {
      this.setScrollOffsetX(this.grid.offsetX + x);
      renderCells = true;
    }
    if (renderRows) this.grid.renderViewportRows();
    if (renderCells) this.grid.renderViewportCells();
  };

  onContainerWheel = (e: WheelEvent) => {
    e.preventDefault();
    e.stopPropagation();
    let deltaY = e.deltaY;
    let deltaX = e.deltaX;
    if (Math.abs(deltaY) > 30 && Math.abs(deltaX) < 15) {
      deltaX = 0;
    } else if (Math.abs(deltaX) > 30 && Math.abs(deltaY) < 15) {
      deltaY = 0;
    }
    this.transientScrollOffsetX += deltaX;
    this.transientScrollOffsetY += deltaY;
    if (this.isScrolling) return;
    this.isScrolling = true;
    window.requestAnimationFrame(() => {
      const sx =
        this.transientScrollOffsetX != 0
          ? this.transientScrollOffsetX
          : undefined;
      const sy =
        this.transientScrollOffsetY != 0
          ? this.transientScrollOffsetY
          : undefined;
      this.scrollBy(sx, sy);
      this.isScrolling = false;
      this.transientScrollOffsetX = 0;
      this.transientScrollOffsetY = 0;
    });
  };

  onThumbMouseDownY = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.addEventListener("mousemove", this.onThumbDragY);
    document.addEventListener("mouseup", this.onThumbMouseUpY);
  };
  onThumbDragY = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const state = this.grid.getState();
    this.transientScrollOffsetY +=
      (e.movementY / this.grid.viewportHeight) * state.tableHeight;
    if (this.isScrolling) return;
    this.isScrolling = true;
    window.requestAnimationFrame(() => {
      this.scrollBy(undefined, this.transientScrollOffsetY);
      this.isScrolling = false;
      this.transientScrollOffsetY = 0;
    });
  };
  onThumbMouseUpY = () => {
    document.body.style.removeProperty("cursor");
    document.removeEventListener("mousemove", this.onThumbDragY);
    document.removeEventListener("mouseup", this.onThumbMouseUpY);
    this.isScrolling = false;
    if (this.transientScrollOffsetY > 0) {
      this.scrollBy(undefined, this.transientScrollOffsetY);
    }
    this.transientScrollOffsetY = 0;
  };

  onThumbMouseDownX = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.body.style.setProperty("cursor", "grabbing", "important");
    document.addEventListener("mousemove", this.onThumbDragX);
    document.addEventListener("mouseup", this.onThumbMouseUpX);
  };
  onThumbDragX = (e: MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const state = this.grid.getState();
    this.transientScrollOffsetX +=
      (e.movementX / this.grid.viewportWidth) * state.tableWidth;
    if (this.isScrolling) return;
    this.isScrolling = true;
    window.requestAnimationFrame(() => {
      this.scrollBy(this.transientScrollOffsetX, undefined);
      this.isScrolling = false;
      this.transientScrollOffsetX = 0;
    });
  };
  onThumbMouseUpX = () => {
    document.body.style.removeProperty("cursor");
    document.removeEventListener("mousemove", this.onThumbDragX);
    document.removeEventListener("mouseup", this.onThumbMouseUpX);
    this.isScrolling = false;
    if (this.transientScrollOffsetX > 0) {
      this.scrollBy(this.transientScrollOffsetX, undefined);
    }
    this.transientScrollOffsetX = 0;
  };

  onTrackMouseMoveY = (e: MouseEvent) => {
    e.preventDefault();
  };
  onTrackMouseMoveX = (e: MouseEvent) => {
    e.preventDefault();
  };

  onTrackMouseDownY = (e: MouseEvent) => {
    e.preventDefault();
    const state = this.grid.getState();
    const rel = (e.offsetY / this.grid.viewportHeight) * state.tableHeight;
    this.setScrollOffsetY(rel);
    this.grid.renderViewportRows();
  };
  onTrackMouseDownX = (e: MouseEvent) => {
    e.preventDefault();
    const state = this.grid.getState();
    const rel = (e.offsetX / this.grid.viewportWidth) * state.tableWidth;
    this.setScrollOffsetX(rel);
    this.grid.renderViewportCells();
  };

  translateThumbY = (offset: number) => {
    this.thumbY.style.transform = `translateY(${offset}px)`;
    this.updateFade();
  };
  translateThumbX = (offset: number) => {
    this.thumbX.style.transform = `translateX(${offset}px)`;
  };
  setThumbSizeY = (h: number) => {
    this.thumbY.style.height = `${h}px`;
  };
  setThumbSizeX = (w: number) => {
    this.thumbX.style.width = `${w}px`;
  };
}