import type { ComponentType } from "react";
import type { Row } from "./shared";
import { Slanted } from "./_variants/slanted";
import { Stub } from "./_variants/stub";
import { Pass } from "./_variants/pass";
import { Pinned } from "./_variants/pinned";
import { Compact } from "./_variants/compact";
import { Dither } from "./_variants/header-dither";
import { Terminal } from "./_variants/header-terminal";
import { DecodeHeader } from "./_variants/header-decode";
import { GateHeader } from "./_variants/header-gate";
import { Packets } from "./_variants/header-packets";
import { Grain } from "./_variants/header-grain";
import { Glyph } from "./_variants/header-glyph";
import { Lens } from "./_variants/header-lens";
import { DecodePlus } from "./_variants/header-decodeplus";
import { Loader } from "./_variants/header-loader";

/* ---------------------------------------------------------------------------
 * THE ONLY FILE YOU EDIT TO ADD PROTOTYPES.
 *
 * A "round" is one set of up to 5 variants (one /prototype or riff run).
 * The picker shows one round at a time. The LAST round in ROUNDS is the
 * default; open any other with ?round=<id>. Keys 1–N switch variants.
 *
 * To add a round: create the variant files in ./_variants, import them above,
 * and append one object to ROUNDS. Never delete old rounds just to make room;
 * they stay reachable by URL until a winner is promoted and this folder is
 * deleted.
 * ------------------------------------------------------------------------ */

export type Variant = {
  /** Picker label. Describes the direction, never "Option A". */
  name: string;
  component: ComponentType<{ rows: Row[] }>;
  /** Default true. Set false for fully static variants (no entrance/loop). */
  animated?: boolean;
  /** Set "top" if the variant occupies bottom-centre, so the picker moves. */
  pickerPosition?: "top";
  /** Optional extra CSS (keyframes etc.) injected only while this is active. */
  css?: string;
};

export type Round = {
  id: string; // used in ?round=
  title: string; // what this round explored
  variants: Variant[]; // 2–5, each on a different named axis
};

export const ROUNDS: Round[] = [
  {
    id: "ticket-riff",
    title: "Riff on Ticket: tilt + quote mark, five directions",
    variants: [
      { name: "Slanted", component: Slanted }, // axis: the merge
      { name: "Stub", component: Stub }, // axis: orientation
      { name: "Pass", component: Pass }, // axis: header hierarchy
      { name: "Pinned", component: Pinned }, // axis: container (wall)
      { name: "Compact", component: Compact }, // axis: density (3 lanes)
    ],
  },
  {
    id: "header-styles",
    title: "Compact (locked) + new ICT-themed headings",
    variants: [
      { name: "Dither", component: Dither }, // axis: pixel dither (canvas)
      { name: "Terminal", component: Terminal }, // axis: voice (mono SQL)
      { name: "Decode", component: DecodeHeader }, // axis: binary resolving to text
      { name: "Gate", component: GateHeader }, // axis: metaphor, logic gate
      { name: "Packets", component: Packets }, // axis: metaphor, networking
    ],
  },
  {
    id: "dither-decode-mix",
    title: "Dither x Decode mixes (Compact locked)",
    variants: [
      { name: "Grain", component: Grain }, // axis: texture (organic dither, hover re-forms)
      { name: "Glyph", component: Glyph }, // axis: the mix (decode drawn in dither)
      { name: "Lens", component: Lens }, // axis: interaction (pointer dithers text away)
      { name: "Decode+", component: DecodePlus }, // axis: education (hover re-decodes, ASCII)
      { name: "Loader", component: Loader }, // axis: metaphor (decrypting progress bar)
    ],
  },
  // Next round goes here:
  // {
  //   id: "round-4-name",
  //   title: "What this round explores",
  //   variants: [{ name: "Thing", component: Thing }],
  // },
];