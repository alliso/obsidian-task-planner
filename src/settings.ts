import { App, PluginSettingTab, Setting } from "obsidian";
import type TaskPlannerPlugin from "./main";
import { PRIORITIES, TaskPlannerSettings } from "./types";

export const DEFAULT_SETTINGS: TaskPlannerSettings = {
  backlogFolder: "Tasks/backlog",
  boardFolder: "Tasks/board",
  archivedFolder: "Tasks/archived",
  statuses: [
    { id: "todo", label: "Todo" },
    { id: "doing", label: "Doing" },
    { id: "done", label: "Done" },
  ],
  doneStatusId: "done",
  defaultPriority: "medium",
};

export class TaskPlannerSettingTab extends PluginSettingTab {
  plugin: TaskPlannerPlugin;

  constructor(app: App, plugin: TaskPlannerPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "Carpetas" });

    new Setting(containerEl)
      .setName("Carpeta de backlog")
      .setDesc("Ruta de las tareas capturadas que aún no se han empezado.")
      .addText((text) =>
        text
          .setPlaceholder("Tasks/backlog")
          .setValue(this.plugin.settings.backlogFolder)
          .onChange(async (value) => {
            this.plugin.settings.backlogFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Carpeta de board")
      .setDesc("Ruta de las tareas activas mostradas en el Kanban.")
      .addText((text) =>
        text
          .setPlaceholder("Tasks/board")
          .setValue(this.plugin.settings.boardFolder)
          .onChange(async (value) => {
            this.plugin.settings.boardFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Carpeta de archivadas")
      .setDesc("Ruta de las tareas terminadas que has decidido archivar.")
      .addText((text) =>
        text
          .setPlaceholder("Tasks/archived")
          .setValue(this.plugin.settings.archivedFolder)
          .onChange(async (value) => {
            this.plugin.settings.archivedFolder = value.trim();
            await this.plugin.saveSettings();
          }),
      );

    containerEl.createEl("h2", { text: "Columnas del board" });

    new Setting(containerEl)
      .setName("Estados (columnas)")
      .setDesc(
        "Un estado por línea con el formato id|Etiqueta. La primera línea es el estado inicial al promover al board.",
      )
      .addTextArea((text) => {
        text
          .setPlaceholder("todo|Todo\ndoing|Doing\ndone|Done")
          .setValue(
            this.plugin.settings.statuses
              .map((s) => `${s.id}|${s.label}`)
              .join("\n"),
          )
          .onChange(async (value) => {
            const parsed = value
              .split("\n")
              .map((line) => line.trim())
              .filter((line) => line.length > 0)
              .map((line) => {
                const [id, ...rest] = line.split("|");
                const trimmedId = id.trim();
                const label = rest.join("|").trim() || trimmedId;
                return { id: trimmedId, label };
              })
              .filter((s) => s.id.length > 0);

            if (parsed.length > 0) {
              this.plugin.settings.statuses = parsed;
              await this.plugin.saveSettings();
            }
          });
        text.inputEl.rows = 4;
      });

    new Setting(containerEl)
      .setName("Estado 'done'")
      .setDesc("Id del estado que habilita el botón de archivar en las tarjetas.")
      .addDropdown((dropdown) => {
        for (const status of this.plugin.settings.statuses) {
          dropdown.addOption(status.id, status.label);
        }
        dropdown
          .setValue(this.plugin.settings.doneStatusId)
          .onChange(async (value) => {
            this.plugin.settings.doneStatusId = value;
            await this.plugin.saveSettings();
          });
      });

    containerEl.createEl("h2", { text: "Tareas" });

    new Setting(containerEl)
      .setName("Prioridad por defecto")
      .setDesc("Prioridad asignada al crear una nueva tarea.")
      .addDropdown((dropdown) => {
        for (const p of PRIORITIES) {
          dropdown.addOption(p, p);
        }
        dropdown
          .setValue(this.plugin.settings.defaultPriority)
          .onChange(async (value) => {
            this.plugin.settings.defaultPriority = value as TaskPlannerSettings["defaultPriority"];
            await this.plugin.saveSettings();
          });
      });
  }
}
