---
name: conventional-commit
description: Usar antes de crear un commit para escribir el mensaje en formato Conventional Commits, basado en el diff real en staging, con el scope correcto del monorepo (engine, web, server o repo).
---

# Mensajes de commit

## Formato

```
<tipo>(<scope opcional>): <resumen imperativo, minúscula, sin punto final>

<cuerpo opcional, solo si el resumen no alcanza para explicar el porqué>
```

Tipos permitidos: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`, `perf`.
Scopes de este repo: `engine`, `web`, `server`, `repo` (para cambios de configuración transversal).

## Instrucciones

1. Revisar el diff real en staging (`git diff --staged`), no lo que se cree que se cambió.
2. Si el diff mezcla cambios de más de un scope o de más de un tipo lógico, avisar y sugerir partir en commits separados en vez de forzar un solo mensaje genérico.
3. El resumen describe el cambio, no el archivo tocado (mal: "actualizar combat.ts" — bien: "corregir cálculo de daño cuando se activa el poder de tréboles").
4. Si el commit toca una regla marcada como ambigua (ver skill `regicide-rules-check`), mencionarlo en el cuerpo del commit.
