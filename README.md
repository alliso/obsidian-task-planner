# Task Planner (plugin de Obsidian)

Gestión de tareas basada en notas donde **cada tarea es una nota `.md`** con frontmatter,
organizada en un ciclo de vida de tres carpetas:

- **Backlog** — tareas capturadas que aún no se han empezado.
- **Board** — tareas activas, mostradas en un **tablero Kanban** cuyas columnas se
  determinan por el campo `status` del frontmatter.
- **Archived** — tareas terminadas que has decidido archivar.

## Funcionalidades (v1)

- **Vista Kanban** del board con columnas configurables y **drag & drop** para cambiar de estado.
- **Vista de backlog** con acción "Enviar a board".
- **Comando + modal** para crear tareas nuevas en el backlog.
- **Comandos** contextuales sobre la nota activa: enviar a board, archivar, devolver a backlog.
- **Ajustes**: rutas de las tres carpetas, columnas del board, estado "done" y prioridad por defecto.

Mover una tarea entre fases mueve físicamente el archivo a la carpeta correspondiente
(preservando enlaces mediante la API de Obsidian) y actualiza su `status`.

## Frontmatter de una tarea

```yaml
---
status: todo        # solo en el board: id de la columna
priority: medium    # low | medium | high
created: 2026-07-21
---
```

## Desarrollo

```bash
npm install
npm run dev     # esbuild en modo watch → genera main.js
npm run build   # typecheck + bundle de producción
```

Para probarlo, copia o enlaza `manifest.json`, `main.js` y `styles.css` en
`<vault>/.obsidian/plugins/obsidian-task-planner/` y activa el plugin en
**Ajustes → Community plugins**.
