"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createElement,
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
} from "react";

export type NavItem = {
  href: string;
  label: string;
  title?: string;
  active?: boolean;
};

export type PillNavItem = {
  id: string;
  label: ReactNode;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  title?: string;
};

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * The prototype picker pill: a dark, blurred capsule with a highlight that
 * slides behind the active item. Renders links (when `href` is set) or buttons.
 */
export function PillNav({
  items,
  ariaLabel = "Primary",
}: {
  items: PillNavItem[];
  ariaLabel?: string;
}) {
  const pathname = usePathname() ?? "/";
  const nav = useRef<HTMLElement>(null);
  const highlight = useRef<HTMLSpanElement>(null);

  const isActive = (item: PillNavItem) =>
    item.active ?? (item.href ? pathname === item.href : false);
  const activeIndex = Math.max(items.findIndex(isActive), 0);

  useIsoLayoutEffect(() => {
    function move() {
      const el = nav.current?.querySelectorAll<HTMLElement>(
      ".pill-nav-item",
      )[activeIndex];
      const hl = highlight.current;
      if (!el || !hl) return;
      hl.style.width = `${el.offsetWidth}px`;
      hl.style.transform = `translateX(${el.offsetLeft}px)`;
    }
    move();
    window.addEventListener("resize", move);
    document.fonts?.ready.then(move).catch(() => {});
    return () => window.removeEventListener("resize", move);
  }, [activeIndex]);

  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        nav.current?.setAttribute("data-ready", ""),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, []);

  return (
    <>
      <style>{CSS}</style>
      <nav ref={nav} className="pill-nav" aria-label={ariaLabel}>
        <span ref={highlight} className="pill-nav-highlight" aria-hidden="true" />
        {items.map((item) => {
          const active = isActive(item);
          const common = {
            key: item.id,
            title: item.title,
            className: "pill-nav-item",
            "data-active": active ? "" : undefined,
            "aria-current": active ? "page" : undefined,
          };
          if (item.href) {
            return createElement(Link, { ...common, href: item.href }, item.label);
          }
          return createElement(
            "button",
            { ...common, type: "button", onClick: item.onClick },
            item.label,
          );
        })}
      </nav>
    </>
  );
}

export function SiteNav({
  items,
  ariaLabel = "Primary",
}: {
  items: NavItem[];
  ariaLabel?: string;
}) {
  const pillItems: PillNavItem[] = items.map((item) => ({
    id: `${item.href}-${item.label}`,
    label: item.label,
    href: item.href,
    title: item.title,
    active: item.active,
  }));
  return <PillNav items={pillItems} ariaLabel={ariaLabel} />;
}

const CSS = `
.pill-nav {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 4px;
  border-radius: 999px;
  background: rgba(10, 10, 10, 0.82);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  backdrop-filter: blur(12px) saturate(1.4);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.08) inset,
    0 8px 24px rgba(0, 0, 0, 0.24),
    0 2px 6px rgba(0, 0, 0, 0.12);
  font-size: 13px;
  line-height: 1;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  -webkit-font-smoothing: antialiased;
  user-select: none;
  -webkit-user-select: none;
}
.pill-nav::-webkit-scrollbar { display: none; }
.pill-nav-highlight {
  position: absolute;
  top: 4px;
  left: 0;
  height: 28px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  will-change: transform;
}
.pill-nav[data-ready] .pill-nav-highlight {
  transition:
    transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
    width 250ms cubic-bezier(0.23, 1, 0.32, 1);
}
@media (prefers-reduced-motion: reduce) {
  .pill-nav[data-ready] .pill-nav-highlight { transition: none; }
}
.pill-nav-item {
  position: relative;
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(255, 255, 255, 0.55);
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  font: inherit;
  transition: color 150ms ease-out;
}
.pill-nav-item:hover { color: rgba(255, 255, 255, 0.85); }
.pill-nav-item:active { transform: scale(0.97); }
.pill-nav-item:focus-visible { outline: 2px solid rgba(255, 255, 255, 0.4); outline-offset: 2px; }
.pill-nav-item[data-active] { color: #fff; }
.pill-nav-item .pill-nav-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
}
.pill-nav-item[data-active] .pill-nav-count { opacity: 0.75; }
`;
