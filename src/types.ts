import { TFile } from "obsidian";

/** Prioridad de una tarea. */
export type Priority = "low" | "medium" | "high";

export const PRIORITIES: Priority[] = ["low", "medium", "high"];

/** Un estado del board (columna del Kanban). */
export interface BoardStatus {
  /** Identificador guardado en el frontmatter (`status`). */
  id: string;
  /** Etiqueta visible en la columna. */
  label: string;
}

/** Ajustes persistidos del plugin. */
export interface TaskPlannerSettings {
  backlogFolder: string;
  boardFolder: string;
  archivedFolder: string;
  /** Columnas del board, en orden. La primera es el estado inicial al promover. */
  statuses: BoardStatus[];
  /** Id del estado considerado "done" (permite archivar). Normalmente la última columna. */
  doneStatusId: string;
  /** Prioridad por defecto al crear una tarea. */
  defaultPriority: Priority;
}

/** Metadatos de una tarea leídos del frontmatter, junto con su archivo. */
export interface TaskMeta {
  file: TFile;
  title: string;
  status: string | null;
  priority: Priority | null;
  created: string | null;
}
