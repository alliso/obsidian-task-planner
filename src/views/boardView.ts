import { ItemView, Menu, TFile, WorkspaceLeaf, debounce } from "obsidian";
import { TaskService } from "../taskService";
import { TaskMeta, TaskPlannerSettings } from "../types";

export const BOARD_VIEW_TYPE = "task-planner-board";

/** Vista Kanban de las tareas activas (carpeta board). */
export class BoardView extends ItemView {
  private refresh = debounce(() => this.render(), 150, true);

  constructor(
    leaf: WorkspaceLeaf,
    private service: TaskService,
    private getSettings: () => TaskPlannerSettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return BOARD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task board";
  }

  getIcon(): string {
    return "layout-dashboard";
  }

  async onOpen(): Promise<void> {
    // Re-renderizar cuando cambian los archivos o su metadata.
    this.registerEvent(this.app.metadataCache.on("changed", () => this.refresh()));
    this.registerEvent(this.app.vault.on("rename", () => this.refresh()));
    this.registerEvent(this.app.vault.on("delete", () => this.refresh()));
    this.registerEvent(this.app.vault.on("create", () => this.refresh()));
    this.render();
  }

  private render(): void {
    const settings = this.getSettings();
    const container = this.contentEl;
    container.empty();
    container.addClass("task-planner-board");

    const tasks = this.service.getTasksInFolder(settings.boardFolder);

    const board = container.createDiv({ cls: "tp-board" });

    for (const status of settings.statuses) {
      const column = board.createDiv({ cls: "tp-column" });
      column.dataset.statusId = status.id;

      const columnTasks = tasks.filter((t) => t.status === status.id);
      column.createDiv({
        cls: "tp-column-header",
        text: `${status.label} (${columnTasks.length})`,
      });

      const list = column.createDiv({ cls: "tp-column-list" });
      this.setupDropTarget(list, status.id);

      for (const task of columnTasks) {
        this.renderCard(list, task, status.id);
      }
    }

    // Columna virtual para tareas sin estado válido (p. ej. recién movidas a mano).
    const orphans = tasks.filter(
      (t) => !settings.statuses.some((s) => s.id === t.status),
    );
    if (orphans.length > 0) {
      const column = board.createDiv({ cls: "tp-column tp-column-orphan" });
      const firstStatus = settings.statuses[0]?.id ?? "todo";
      column.dataset.statusId = firstStatus;
      column.createDiv({
        cls: "tp-column-header",
        text: `Sin estado (${orphans.length})`,
      });
      const list = column.createDiv({ cls: "tp-column-list" });
      this.setupDropTarget(list, firstStatus);
      for (const task of orphans) {
        this.renderCard(list, task, firstStatus);
      }
    }
  }

  private renderCard(
    parent: HTMLElement,
    task: TaskMeta,
    _statusId: string,
  ): void {
    const settings = this.getSettings();
    const card = parent.createDiv({ cls: "tp-card" });
    card.draggable = true;
    card.dataset.path = task.file.path;

    card.createDiv({ cls: "tp-card-title", text: task.title });

    if (task.priority) {
      card.createDiv({
        cls: `tp-badge tp-badge-${task.priority}`,
        text: task.priority,
      });
    }

    card.addEventListener("dragstart", (evt) => {
      evt.dataTransfer?.setData("text/plain", task.file.path);
      card.addClass("tp-dragging");
    });
    card.addEventListener("dragend", () => card.removeClass("tp-dragging"));

    // Click abre la nota; se ignora si el usuario está arrastrando.
    card.addEventListener("click", () => {
      void this.app.workspace.getLeaf(false).openFile(task.file);
    });

    // Menú contextual con acciones rápidas.
    card.addEventListener("contextmenu", (evt) => {
      evt.preventDefault();
      const menu = new Menu();
      menu.addItem((item) =>
        item
          .setTitle("Devolver a backlog")
          .setIcon("inbox")
          .onClick(() => void this.service.sendToBacklog(task.file)),
      );
      if (task.status === settings.doneStatusId) {
        menu.addItem((item) =>
          item
            .setTitle("Archivar")
            .setIcon("archive")
            .onClick(() => void this.service.archive(task.file)),
        );
      }
      menu.showAtMouseEvent(evt);
    });

    // Botón de archivar visible solo en la columna done.
    if (task.status === settings.doneStatusId) {
      const archiveBtn = card.createEl("button", {
        cls: "tp-card-archive",
        text: "Archivar",
      });
      archiveBtn.addEventListener("click", (evt) => {
        evt.stopPropagation();
        void this.service.archive(task.file);
      });
    }
  }

  private setupDropTarget(list: HTMLElement, statusId: string): void {
    list.addEventListener("dragover", (evt) => {
      evt.preventDefault();
      list.addClass("tp-drop-over");
    });
    list.addEventListener("dragleave", () => list.removeClass("tp-drop-over"));
    list.addEventListener("drop", (evt) => {
      evt.preventDefault();
      list.removeClass("tp-drop-over");
      const path = evt.dataTransfer?.getData("text/plain");
      if (!path) {
        return;
      }
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) {
        void this.service.setStatus(file, statusId);
      }
    });
  }

  /** Fuerza un re-render (p. ej. tras cambiar ajustes) sin re-registrar eventos. */
  rerender(): void {
    this.render();
  }

  async onClose(): Promise<void> {
    this.contentEl.empty();
  }
}
