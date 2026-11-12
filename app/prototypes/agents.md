# Testimonial prototypes: notes for agents

This folder is a **throwaway prototype surface** for the `/testimonials` page
(route: `/prototypes/testimonials`). Nothing in production imports from it.
Work here follows the `/prototype` skill (Emil Kowalski's
`npx skills@latest add emilkowalski/skills`).

## Map

| File | Role | Edit it? |
| --- | --- | --- |
| `page.tsx` | Loads approved testimonials (+ sample filler), renders the harness | Rarely |
| `harness.tsx` | Picker chrome + variant switching. Picker CSS is **verbatim** from the skill's PICKER.md | **No** |
| `registry.ts` | List of **rounds** and their variants | **Yes: the only file to edit** |
| `shells.tsx` | Reusable page layouts: `TickerShell`, `WallShell`, `GridShell`, `PageShell` (+ `tilt`, `QuoteMark`, `initials`) | Only to **add** a new shell |
| `shared.tsx` | `Row` type, `Sig`, `meta`, `formatDate`, `Header`, sample data | Rarely |
| `_variants/*.tsx` | One file per variant (usually just a card + a shell) | Add new files |

## Add a new round (new `/prototype` or `riff <variant>` run)

1. State each variant's **name and axis** first (layout, density, hierarchy,
   container, motion, interaction). Two variants that differ only in tint or
   copy are one variant. 2–5 per round.
2. Create one file per variant in `_variants/`, exporting a component
   `({ rows }: { rows: Row[] }) => JSX`. Build a card and pass it to a shell,
   e.g. `<TickerShell rows={rows} renderCard={(item, i) => <Card .../>} />`.
   Tune layout through the shell's props instead of editing the shell.
3. Import them in `registry.ts` and **append** a new object to `ROUNDS`
   (`id`, `title`, `variants`). The last round is the default; older rounds stay
   reachable via `?round=<id>`. Never delete or reorder old rounds to make room.
4. Set `animated: false` on static variants, `pickerPosition: "top"` if a
   variant occupies bottom-centre, and `css` for any extra keyframes.
5. Typecheck, then tell the user each variant's name, axis, when it wins and
   what it costs. Do not pick a favourite unprompted.

`riff <variant>`: new round whose variants diverge *around* the named one;
keep what the user said they liked from earlier rounds.

## Rules

- **Colours: only the project's gray tokens**: `gray-100/400/1000/1200`,
  `text-paragraph`, `shadow-custom`, `shadow-border` (and `gray-*` steps that
  exist in `globals.css`). Add a new colour only with a real reason, and say so.
- Signatures are real data: render them with `<Sig item={item} />`; never
  inline `TestimonialSignature`. Sample rows have no signature by design.
- Motion (Emil's bar): `transform`/`opacity` only, strong ease-out
  (`cubic-bezier(0.23, 1, 0.32, 1)`), UI motion under 300ms, `:active` scale
  0.97 on pressables, never animate keyboard-initiated or high-frequency
  actions, always handle `prefers-reduced-motion`. Constant motion (tickers)
  is `linear`.
- Tickers need vertical padding inside `overflow-hidden` (shadows, tilt) and
  equal `gap`/trailing `pr` for a seamless loop. `TickerShell` handles both.
- Use `tilt(`${item.id}-${index}`)` for random angles (deterministic, no
  hydration mismatch). Don't use `Math.random()` in render.
- Realistic content only (sample rows exist for this). No lorem ipsum.
- Never touch `app/testimonials/page.tsx` while exploring.

## Promote a winner

1. Move the chosen card + layout into `app/testimonials/page.tsx` following
   the app's conventions. **Always give the whole `page.tsx`**, not a diff.
2. Keep `Sig`/`meta` usage but drop the prototype-only sample padding.
3. Delete this entire `app/prototypes/testimonials/` folder unless the user
   asks to keep it.