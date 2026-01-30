---
name: repo-patterns
version: v1.0
description: Patrones arquitectonicos comunes en repositorios y como reconocerlos.
---

## Monorepo
Senales: "packages/", "apps/", workspace config
Explorar: cada package tiene su propio dominio

## Backend API
Senales: "routes/", "controllers/", "handlers/"
Dominios tipicos: auth, users, recursos del negocio

## Frontend SPA
Senales: "components/", "pages/", "hooks/"
Dominios tipicos: ui, state, api-client

## Full-stack
Senales: separacion client/server o apps/api + apps/web
Explorar: ambos lados independientemente

## Serverless
Senales: "functions/", "lambdas/", serverless.yml
Dominios: cada funcion suele ser un dominio

## CLI Tool
Senales: "bin/", "commands/", "src/cli/"
Dominios: commands, core logic, output formatting
