---
name: repo-exploration-checklist
version: v1.0
description: Checklist minimo de lectura para grounding de contexto.
---

## Checklist
1) list_dirs root
2) list_files root
3) read_file README.md (si existe)
4) read_file package.json (root)
5) read_file apps/webapp/package.json (si existe)
6) read_file apps/website/package.json (si existe)
7) read_file packages/ui/package.json (si existe)
8) read_file packages/convex/package.json (si existe)

## Reglas
- Si un read_file falla por path, usa list_files del directorio y reintenta con un path valido.
- No repitas el mismo tool call con el mismo input tras un error.
