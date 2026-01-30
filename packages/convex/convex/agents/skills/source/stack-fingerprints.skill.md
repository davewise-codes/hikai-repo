---
name: stack-fingerprints
version: v1.0
description: Identifica tecnologias de un repositorio usando archivos de configuracion y dependencias.
---

## Lenguajes
| Archivo | Stack |
|---------|-------|
| package.json | Node.js/JavaScript |
| tsconfig.json | TypeScript |
| Cargo.toml | Rust |
| go.mod | Go |
| pyproject.toml, setup.py | Python |
| Gemfile | Ruby |
| pom.xml, build.gradle | Java |
| *.csproj | C#/.NET |

## Frameworks (buscar en dependencies)
| Dependencia | Framework |
|-------------|-----------|
| react, react-dom | React |
| next | Next.js |
| express | Express.js |
| fastapi | FastAPI |
| django | Django |
| actix-web, axum | Rust web |
| gin, echo | Go web |

## Build/Deploy
| Archivo | Indica |
|---------|--------|
| Dockerfile | Containerizado |
| serverless.yml | Serverless Framework |
| vercel.json | Vercel |
| fly.toml | Fly.io |
| .github/workflows/ | GitHub Actions CI |

## Monorepo signals
- Directorio "packages/" o "apps/"
- pnpm-workspace.yaml o lerna.json
- Multiples package.json en subdirectorios
