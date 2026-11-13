"use client";

import { useMemo } from "react";
import {
  inkColorValue,
  strokePath,
} from "@/components/arc/signature-pad/signature-pad";
import type {
  InkColor,
  InkStroke,
  InkWidth,
} from "@/components/arc/signature-pad/signature-pad";

const COLORS: InkColor[] = ["black", "blue", "violet", "white"];
const WIDTHS: InkWidth[] = ["fine", "medium", "bold"];

/**
 * The ink as it should be shown on a card. Black and white are the form's
 * "default" inks for the light and dark themes, so on a card they follow the
 * theme's foreground rather than vanish (black on a dark card, white on a
 * light one). Blue and violet are always literal.
 */
export function inkFill(color: InkColor) {
  return color === "black" || color === "white"
    ? "var(--color-gray-1200)"
    : inkColorValue(color);
}

/**
 * signature_strokes is written straight from the browser, so treat it as
 * untrusted input: anything that is not a well-formed stroke is dropped before
 * it reaches strokePath(). We deliberately draw the strokes instead of
 * injecting signature_svg as raw HTML.
 */
function toStrokes(value: unknown): InkStroke[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((raw, index) => {
    if (typeof raw !== "object" || raw === null) return [];

    const candidate = raw as Record<string, unknown>;
    if (!Array.isArray(candidate.points)) return [];

    const points = candidate.points.flatMap((point) => {
      if (typeof point !== "object" || point === null) return [];

      const source = point as Record<string, unknown>;
      const x = Number(source.x);
      const y = Number(source.y);
      const t = Number(source.t);

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(t)) {
        return [];
      }

      const pressure = Number(source.p);

      return [{ x, y, t, p: Number.isFinite(pressure) ? pressure : -1 }];
    });

    if (!points.length) return [];

    return [
      {
        id: String(candidate.id ?? `stroke-${index}`),
        points,
        color: COLORS.includes(candidate.color as InkColor)
          ? (candidate.color as InkColor)
          : "black",
        width: WIDTHS.includes(candidate.width as InkWidth)
          ? (candidate.width as InkWidth)
          : "medium",
        at: Number(candidate.at) || 0,
      },
    ];
  });
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

  const pad = 12;

  return {
    x: Math.floor(minX - pad),
    y: Math.floor(minY - pad),
    width: Math.ceil(maxX - minX + pad * 2),
    height: Math.ceil(maxY - minY + pad * 2),
  };
}

export function TestimonialSignature({
  strokes,
  signer,
  className,
}: {
  strokes: unknown;
  signer: string;
  className?: string;
}) {
  const drawing = useMemo(() => {
    const list = toStrokes(strokes);
    if (!list.length) return null;

    return {
      box: inkBounds(list),
      paths: list.map((stroke) => ({
        d: strokePath(stroke),
        fill: inkFill(stroke.color),
      })),
    };
  }, [strokes]);

  if (!drawing) return null;

  return (
    <svg
      viewBox={`${drawing.box.x} ${drawing.box.y} ${drawing.box.width} ${drawing.box.height}`}
      role="img"
      aria-label={`Handwritten signature by ${signer}`}
      className={className}
    >
      {drawing.paths.map((path, index) => (
        <path key={index} d={path.d} fill={path.fill} />
      ))}
    </svg>
  );
}
