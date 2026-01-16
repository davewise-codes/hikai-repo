# Agents Tools - Contratos

Contratos de tools para agentes autonomos. Formato conciso y estable.

---

## Interface base

ToolDefinition:

```
{
	name: string
	description?: string
	execute(input: unknown): Promise<unknown>
}
```

Patron de factory (closure):

```
createReadSourcesTool(ctx, productId) -> ToolDefinition
```

Regla de error (tool inexistente):
- Si el tool no existe o no implementa execute(), retornar ToolResult con error.

ToolResult:

```
{
	name: string
	input: unknown
	output?: unknown
	error?: string
}
```

---

## Contratos de tools

| Tool | Input | Output | Notas |
| --- | --- | --- | --- |
| read_sources | { productId, limit? } | SourceContext[] | max 50 por defecto |
| read_baseline | { productId } | ProductBaseline | solo baseline (no todo el producto) |
| read_context_inputs | { productId } | ContextInputs | retorna nulls si no hay run previo |
| todo_manager | { action, items?, itemId? } | Plan | max 15 items |
| validate_output | { outputType, data } | ValidationResult | warnings no bloquean v1 |

---

## Detalle de inputs/outputs

### read_sources

Input:

```json
{
	"productId": "prod_123",
	"limit": 50
}
```

Output:

```json
[
	{
		"sourceId": "github:org/repo",
		"classification": "product_core",
		"signals": ["/apps/webapp", "/packages/ui"],
		"notes": "Monorepo con app principal"
	}
]
```

### read_baseline

Input:

```json
{
	"productId": "prod_123"
}
```

Output:

```json
{
	"name": "Hikai",
	"type": "SaaS",
	"valueProposition": "Product intelligence hub",
	"primaryUsers": ["PM", "Design"],
	"coreJobs": ["decision support"]
}
```

Nota: si no hay baseline, retorna objeto vacio.

### read_context_inputs

Input:

```json
{
	"productId": "prod_123"
}
```

Output:

```json
{
	"uiSitemap": ["/settings/product", "/dashboard"],
	"userFlows": ["Create project", "Invite member"],
	"businessDataModel": ["project", "milestone"],
	"repoTopology": ["apps/webapp", "packages/convex"]
}
```

Nota: si no hay run previo o el output no existe, retorna nulls.

### todo_manager

Input:

```json
{
	"action": "create",
	"items": [
		{ "id": "1", "content": "Gather context", "status": "pending" },
		{ "id": "2", "content": "Map domains", "status": "pending" }
	]
}
```

Output:

```json
{
	"items": [
		{ "id": "1", "content": "Gather context", "status": "in_progress" },
		{ "id": "2", "content": "Map domains", "status": "pending" }
	]
}
```

### validate_output

Input:

```json
{
	"outputType": "domain_map",
	"data": { "domains": [], "layout": {}, "summary": {} }
}
```

Output:

```json
{
	"valid": false,
	"errors": ["Missing 'domains' array"],
	"warnings": []
}
```

---

## Mitigaciones

- Pagination: `limit` y `cursor` en tools de lectura.
- Outputs grandes (> 10KB): almacenar en storage y referenciar en logs.
- Timeouts y budget: maxTurns y timeoutMs configurables por agente.

---

## Tipos de referencia

ValidationResult:

```
{
	valid: boolean
	errors: string[]
	warnings: string[]
}
```

PlanItem:

```
{
	id: string
	content: string
	status: "pending" | "in_progress" | "completed"
}
```
