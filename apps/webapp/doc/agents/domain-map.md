# Domain Map - Schema y Taxonomia

Schema JSON y reglas para el Domain Map Agent.

---

## Schema (v1)

```
{
	"domains": [
		{
			"name": "string",
			"weight": 0.0,
			"evidence": ["string"]
		}
	],
	"summary": {
		"totalDomains": 0,
		"warnings": ["string"]
	}
}
```

---

## Ejemplo valido

```json
{
	"domains": [
		{
			"name": "Core Experience",
			"weight": 0.7,
			"evidence": ["route: /dashboard", "entity: project"]
		},
		{
			"name": "Platform",
			"weight": 0.3,
			"evidence": ["service: auth", "api: /v1/graphql"]
		}
	],
	"summary": {
		"totalDomains": 2,
		"warnings": []
	}
}
```

---

## Taxonomia de dominios

Los dominios agregan product_front y platform (no se separan por superficie).

Ejemplos habituales (no cerrados, no deben generar ancla):

- Application settings
- Collaboration
- Project management (ERPs, issue trackers, etc)
- Document editing (document editors)
- Editing Canvas (Design tools)
- Nota: si hay señales de trabajo fundacional (infra, refactors, tooling), usarlas como evidencia secundaria y evitar crear un dominio dedicado salvo que sea una capacidad de producto clara.

---

## Reglas de validacion

Campos requeridos:

- domains: array no vacio
- Cada domain: name, weight, evidence[]
- summary: totalDomains

Rangos:

- weight in [0, 1]

Evidencia:

- evidence[] no vacia por domain
- evidence debe provenir de tools (no inventar)
- solo usar señales de sources clasificados como product_front o platform

---

## Criterios de calidad

- Preferir pocos dominios con evidencia fuerte
- Evitar dominios sin señales de sources
- Ignorar inputs de marketing, admin u observabilidad para el domain map
- Tratar trabajo fundacional (infra, refactors, tooling) como evidencia secundaria, sin crear dominio dedicado salvo capacidad clara
