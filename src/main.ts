import { Notice, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { CreateTaskModal } from "./modals/createTaskModal";
import { DEFAULT_SETTINGS, TaskPlannerSettingTab } from "./settings";
import { TaskService } from "./taskService";
import { TaskPlannerSettings } from "./types";
import { BACKLOG_VIEW_TYPE, BacklogView } from "./views/backlogView";
import { BOARD_VIEW_TYPE, BoardView } from "./views/boardView";

export default class TaskPlannerPlugin extends Plugin {
  settings!: TaskPlannerSettings;
  service!: TaskService;

  async onload(): Promise<void> {
    await this.loadSettings();
    this.service = new TaskService(this.app, () => this.settings);

    // Vistas personalizadas.
    this.registerView(
      BOARD_VIEW_TYPE,
      (leaf) => new BoardView(leaf, this.service, () => this.settings),
    );
    this.registerView(
      BACKLOG_VIEW_TYPE,
      (leaf) => new BacklogView(leaf, this.service, () => this.settings),
    );

    // Ribbon.
    this.addRibbonIcon("layout-dashboard", "Abrir task board", () =>
      this.activateView(BOARD_VIEW_TYPE),
    );

    // Comandos.
    this.addCommand({
      id: "open-board",
      name: "Abrir board (Kanban)",
      callback: () => this.activateView(BOARD_VIEW_TYPE),
    });
    this.addCommand({
      id: "open-backlog",
      name: "Abrir backlog",
      callback: () => this.activateView(BACKLOG_VIEW_TYPE),
    });
    this.addCommand({
      id: "create-task",
      name: "Crear tarea nueva",
      callback: () =>
        new CreateTaskModal(
          this.app,
          this.service,
          this.settings.defaultPriority,
        ).open(),
    });
    this.addCommand({
      id: "send-active-to-board",
      name: "Enviar tarea activa al board",
      checkCallback: (checking) => this.activeFileCommand(checking, (file) =>
        this.service.promoteToBoard(file),
      ),
    });
    this.addCommand({
      id: "archive-active",
      name: "Archivar tarea activa",
      checkCallback: (checking) => this.activeFileCommand(checking, (file) =>
        this.service.archive(file),
      ),
    });
    this.addCommand({
      id: "send-active-to-backlog",
      name: "Devolver tarea activa al backlog",
      checkCallback: (checking) => this.activeFileCommand(checking, (file) =>
        this.service.sendToBacklog(file),
      ),
    });

    this.addSettingTab(new TaskPlannerSettingTab(this.app, this));
  }

  onunload(): void {
    // Obsidian se encarga de desregistrar vistas y eventos añadidos con los
    // helpers de Plugin; solo cerramos hojas huérfanas explícitamente.
  }

  /**
   * Ejecuta `action` sobre el archivo Markdown activo. En modo `checking`
   * únicamente indica si el comando está disponible.
   */
  private activeFileCommand(
    checking: boolean,
    action: (file: TFile) => Promise<void>,
  ): boolean {
    const file = this.app.workspace.getActiveFile();
    const available = file instanceof TFile && file.extension === "md";
    if (available && !checking && file) {
      void action(file).catch((err) => {
        console.error("[Task Planner]", err);
        new Notice("No se pudo completar la acción sobre la tarea.");
      });
    }
    return available;
  }

  /** Abre (o revela) una de las vistas del plugin en la barra lateral derecha. */
  async activateView(viewType: string): Promise<void> {
    const { workspace } = this.app;

    const existing = workspace.getLeavesOfType(viewType);
    let leaf: WorkspaceLeaf | null;

    if (existing.length > 0) {
      leaf = existing[0];
    } else if (viewType === BOARD_VIEW_TYPE) {
      // El board es ancho: mejor en el área principal.
      leaf = workspace.getLeaf(true);
      await leaf.setViewState({ type: viewType, active: true });
    } else {
      leaf = workspace.getRightLeaf(false);
      await leaf?.setViewState({ type: viewType, active: true });
    }

    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    // Refrescar vistas abiertas para reflejar cambios de configuración.
    for (const type of [BOARD_VIEW_TYPE, BACKLOG_VIEW_TYPE]) {
      for (const leaf of this.app.workspace.getLeavesOfType(type)) {
        const view = leaf.view;
        if (view instanceof BoardView || view instanceof BacklogView) {
          // Forzar re-render sin recrear la vista ni re-registrar eventos.
          view.rerender();
        }
      }
    }
  }
}
