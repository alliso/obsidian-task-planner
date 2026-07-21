import { ItemView, WorkspaceLeaf, debounce } from "obsidian";
import { CreateTaskModal } from "../modals/createTaskModal";
import { TaskService } from "../taskService";
import { TaskMeta, TaskPlannerSettings } from "../types";

export const BACKLOG_VIEW_TYPE = "task-planner-backlog";

/** Vista en lista de las tareas del backlog, con acción para promover al board. */
export class BacklogView extends ItemView {
  private refresh = debounce(() => this.render(), 150, true);

  constructor(
    leaf: WorkspaceLeaf,
    private service: TaskService,
    private getSettings: () => TaskPlannerSettings,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return BACKLOG_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Task backlog";
  }

  getIcon(): string {
    return "inbox";
  }

  async onOpen(): Promise<void> {
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
    container.addClass("task-planner-backlog");

    const header = container.createDiv({ cls: "tp-backlog-header" });
    header.createEl("h3", { text: "Backlog" });
    const addBtn = header.createEl("button", {
      cls: "tp-backlog-add",
      text: "+ Nueva tarea",
    });
    addBtn.addEventListener("click", () => {
      new CreateTaskModal(
        this.app,
        this.service,
        settings.defaultPriority,
        () => this.refresh(),
        false,
      ).open();
    });

    const tasks = this.service.getTasksInFolder(settings.backlogFolder);
    const list = container.createDiv({ cls: "tp-backlog-list" });

    if (tasks.length === 0) {
      list.createDiv({
        cls: "tp-backlog-empty",
        text: "No hay tareas en el backlog.",
      });
      return;
    }

    for (const task of tasks) {
      this.renderRow(list, task);
    }
  }

  private renderRow(parent: HTMLElement, task: TaskMeta): void {
    const row = parent.createDiv({ cls: "tp-backlog-row" });

    const info = row.createDiv({ cls: "tp-backlog-info" });
    info.createSpan({ cls: "tp-backlog-title", text: task.title });
    if (task.priority) {
      info.createSpan({
        cls: `tp-badge tp-badge-${task.priority}`,
        text: task.priority,
      });
    }
    info.addEventListener("click", () => {
      void this.app.workspace.getLeaf(false).openFile(task.file);
    });

    const promoteBtn = row.createEl("button", {
      cls: "tp-backlog-promote",
      text: "Enviar a board →",
    });
    promoteBtn.addEventListener("click", (evt) => {
      evt.stopPropagation();
      void this.service.promoteToBoard(task.file);
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
