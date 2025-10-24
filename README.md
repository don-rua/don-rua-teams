# Don Rúa — Team Grid
**Single SVG** (`public/ALL-GENS.svg`) listing cohorts: **DEV‑GEN‑0** (locked) + yearly generations (2025, 2026, …).  
Contributors only edit **their year file** with `{ "name": "...", "handle": "..." }`.  
The build validates handles via GitHub API, generates **circular avatars**, **Nerd Fonts** stack, and **clickable links** to profiles.

---

## 🇺🇸 Contributors — Add your Generation
1) Create or update your cohort file in `teams/` (e.g., `teams/2027.json`).  
2) Add one object per person (no roles needed):  
```json
[
  {
    "name": "Francisco Jimenez",
    "handle": "Jimieee"
  },
  {
    "name": "Marcos Alfaro",
    "handle": "1frencho"
  }
]
```
3) Commit your change. **Do not modify**: `teams/DEV-GEN-0.json`, `scripts/`, `.github/`, or `public/` — the workflow will fail if you do.

---

## 🇪🇸 Contribuyentes — Agrega tu generación
1) Crea o actualiza el archivo de tu cohorte en `teams/` (ej.: `teams/2027.json`).  
2) Agrega un objeto por persona (no se requiere rol):  
```json
[
  {
    "name": "Francisco Jimenez",
    "handle": "Jimieee"
  },
  {
    "name": "Marcos Alfaro",
    "handle": "1frencho"
  }
]
```
3) Haz commit de tu cambio. **No modifiques**: `teams/DEV-GEN-0.json`, `scripts/`, `.github/` ni `public/` — el workflow fallará si lo haces.
