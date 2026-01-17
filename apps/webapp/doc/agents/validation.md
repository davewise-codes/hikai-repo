# Agents Validation

Reglas de validacion objetivas para outputs de agentes.

---

## Domain Map (domain_map)

### Campos requeridos

- domains: array no vacio
- Cada domain: name, weight, evidence[]
- summary.totalDomains

### Reglas

- weight en rango [0, 1]
- evidence[] no vacia por dominio

### Output de validacion

```json
{
	"valid": false,
	"errors": ["Missing 'domains' array"],
	"warnings": []
}
```

### Notas

- Los errores bloquean el cierre del loop (el agente reintenta hasta pasar).
- Los warnings se propagan para trazabilidad.
