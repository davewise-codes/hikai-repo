# Product Context Inputs

Este documento describe los 4 inputs deterministas que alimentan el agente de Domain Board.

## Objetivo

- Extraer señales **deterministas** desde `product_front` y `platform`.
- No inferir significado ni resumir con IA.
- Outputs compactos, trazables y estables.

---

## 1) UI Sitemap (`ui_sitemap_v1`)

**Propósito:** listar páginas y rutas reales del UI (sin agrupar semánticamente).

**Schema (simplificado)**

```json
{
  "schema": "ui_sitemap_v1",
  "productId": "...",
  "generatedAt": "ISO",
  "items": [
    {
      "id": "ui_app_product_timeline",
      "path": "/app/:orgSlug/:productSlug/timeline",
      "title": "Timeline",
      "navGroup": "primary",
      "requiresAuth": true,
      "surfaceHint": "product_front",
      "source": { "type": "router", "ref": "apps/webapp/src/routes/..." },
      "flags": ["internal"]
    }
  ],
  "warnings": []
}
```

---

## 2) User Flows (`user_flows_v1`)

**Propósito:** flujos deterministas a partir de entry points + árbol de rutas (sin inferencia).

**Schema (simplificado)**

```json
{
  "schema": "user_flows_v1",
  "productId": "...",
  "generatedAt": "ISO",
  "flows": [
    {
      "id": "flow_app_timeline",
      "name": "Timeline",
      "steps": [
        { "action": "Timeline", "uiPageId": "ui_app_timeline", "source": "/app/.../timeline" }
      ],
      "source": { "type": "route_tree", "ref": "/app" }
    }
  ],
  "warnings": []
}
```

---

## 3) Business Data Model (`business_data_model_v1`)

**Propósito:** entidades del dominio y relaciones encontradas en schemas (Convex/ORM/SQL).

**Schema (simplificado)**

```json
{
  "schema": "business_data_model_v1",
  "productId": "...",
  "generatedAt": "ISO",
  "entities": [
    {
      "id": "Product",
      "displayName": "Product",
      "attributes": [
        { "name": "name", "type": "string" },
        { "name": "organizationId", "type": "ref", "refEntityId": "Organization" }
      ],
      "source": { "type": "convex", "ref": "packages/convex/convex/schema.ts" }
    }
  ],
  "relationships": [
    { "from": "Organization", "to": "Product", "type": "1:N", "via": "organizationId", "source": { "type": "convex", "ref": "..." } }
  ],
  "warnings": []
}
```

---

## 4) Repo Folder Topology (`repo_folder_topology_v1`)

**Propósito:** snapshot determinista de la estructura de carpetas por superficie.

**Schema (simplificado)**

```json
{
  "schema": "repo_folder_topology_v1",
  "productId": "...",
  "generatedAt": "ISO",
  "repos": [
    {
      "repoId": "org/repo",
      "defaultBranch": "main",
      "surfaces": [
        {
          "surface": "product_front",
          "rootPaths": ["apps/webapp"],
          "tree": [
            { "path": "apps/webapp/src", "type": "dir", "depth": 2, "childrenCount": 12 }
          ],
          "semanticFolders": [
            { "name": "billing", "paths": ["apps/webapp/src/billing"], "reason": ["under_preferred_root"], "score": 0.7 }
          ]
        }
      ]
    }
  ],
  "warnings": []
}
```

---

## Aggregator

`build_product_context_inputs(productId)` devuelve un objeto con los 4 outputs anteriores en un solo payload.
