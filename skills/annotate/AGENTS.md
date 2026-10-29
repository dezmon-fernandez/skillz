# Changing annotate's page

- Style with Tailwind's standard values: its spacing, type, radius and colour classes as they come
  (`gap-4`, `text-sm`, `rounded-lg`, `bg-zinc-100`). Never an arbitrary value when a standard class
  exists. Where none does, use the arbitrary value and say why in a comment beside it.
  - ❌ `mt-[7px]`, because it looked right.
  - ✅ `mt-2`.
- Which colour does which job, and the three button kinds, are in `references/design.md`.
- `scripts/annotate.css` is compiled; never edit it. Change `scripts/styles.css` or the classes
  in `scripts/annotate.html`, then run `npm run build` at the skillz root. In a Claude Code session in
  skillz, a hook runs it after each edit.
- Change the page only in skillz. A project's copy has no build, so a class added there gets no style.
