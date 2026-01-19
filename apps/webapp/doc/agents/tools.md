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
createListFilesTool(ctx, productId) -> ToolDefinition
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
| list_dirs | { path?, depth?, limit? } | { dirs: DirEntry[], truncated? } | solo directorios, depth limitado |
| list_files | { path?, pattern?, limit? } | { files: FileEntry[], truncated? } | no recursivo, solo un directorio |
| read_file | { path } | ReadFileOutput | contenido del archivo (trunca > 100KB) |
| search_code | { query, filePattern?, limit? } | SearchMatch[] | busqueda segura sobre archivos listados |
| todo_manager | { items } | Plan | max 15 items |
| validate_output | { outputType, data } | ValidationResult | warnings no bloquean v1 |

---

## Detalle de inputs/outputs

### list_dirs

Input:

```json
{
	"path": "apps/webapp/src",
	"depth": 2,
	"limit": 50
}
```

Output:

```json
{
	"dirs": [
		{ "path": "apps/webapp/src/domains", "depth": 1 },
		{ "path": "apps/webapp/src/routes", "depth": 1 }
	],
	"truncated": false
}
```

Notas:
- Solo devuelve directorios.
- `depth` maximo 3.

### list_files

Input:

```json
{
	"path": "apps/webapp/src",
	"pattern": "*.tsx",
	"limit": 50
}
```

Output:

```json
{
	"files": [
		{
			"path": "apps/webapp/src/main.tsx",
			"name": "main.tsx",
			"size": 1020
		}
	],
	"truncated": false
}
```

Notas:
- No recursivo: solo archivos del directorio indicado.
- Si no hay conexion GitHub activa, retorna `{ "error": "No active GitHub connection found" }`.

### read_file

Input:

```json
{
	"path": "src/components/button.tsx"
}
```

Output:

```json
{
	"path": "src/components/button.tsx",
	"content": "export function Button() { ... }",
	"size": 2048
}
```

Notas:
- Si el archivo supera 100KB, `content` se trunca.
- Si no hay acceso al repo, retorna `{ "error": "No active GitHub connection found" }`.

### search_code

Input:

```json
{
	"query": "auth",
	"filePattern": "*.ts",
	"limit": 20
}
```

Output:

```json
[
	{
		"path": "src/auth/login.tsx",
		"snippet": "export function LoginForm() {"
	}
]
```

Notas:
- Implementacion segura: lista archivos y busca texto en contenido.
- Si no hay conexion activa, retorna `{ "error": "No active GitHub connection found" }`.

### todo_manager

Input:

```json
{
	"items": [
		{
			"content": "Gather context",
			"activeForm": "Gathering context",
			"status": "pending"
		},
		{
			"content": "Map domains",
			"activeForm": "Mapping domains",
			"status": "pending"
		}
	]
}
```

Output:

```json
{
	"items": [
		{
			"id": "step-1",
			"content": "Gather context",
			"activeForm": "Gathering context",
			"status": "in_progress"
		},
		{
			"id": "step-2",
			"content": "Map domains",
			"activeForm": "Mapping domains",
			"status": "pending"
		}
	],
	"maxItems": 15,
	"currentItem": {
		"id": "step-1",
		"content": "Gather context",
		"activeForm": "Gathering context",
		"status": "in_progress"
	}
}
```

Notas:
- items siempre es la lista completa (reemplazo total)
- activeForm es obligatorio y debe estar en presente
- solo 1 item puede estar in_progress

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

- Pagination: `limit` en tools de lectura.
- Outputs grandes (> 10KB): almacenar en storage y referenciar en logs.
- Timeouts y budget: maxTurns + maxTotalTokens (status `budget_exceeded`).
- Output control: recortar respuesta a JSON valido si hay texto extra.

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
