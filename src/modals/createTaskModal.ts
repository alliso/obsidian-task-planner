import { App, Modal, Notice, Setting } from "obsidian";
import { TaskService } from "../taskService";
import { Priority, PRIORITIES } from "../types";

/** Modal para crear una nueva nota-tarea en el backlog. */
export class CreateTaskModal extends Modal {
  private title = "";
  private priority: Priority;

  constructor(
    app: App,
    private service: TaskService,
    defaultPriority: Priority,
    private onCreated?: (openFile: boolean) => void,
    private openAfterCreate = true,
  ) {
    super(app);
    this.priority = defaultPriority;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.createEl("h3", { text: "Nueva tarea" });

    new Setting(contentEl).setName("Título").addText((text) => {
      text.setPlaceholder("Título de la tarea").onChange((value) => {
        this.title = value;
      });
      text.inputEl.addEventListener("keydown", (evt) => {
        if (evt.key === "Enter") {
          evt.preventDefault();
          void this.submit();
        }
      });
      window.setTimeout(() => text.inputEl.focus(), 0);
    });

    new Setting(contentEl).setName("Prioridad").addDropdown((dropdown) => {
      for (const p of PRIORITIES) {
        dropdown.addOption(p, p);
      }
      dropdown.setValue(this.priority).onChange((value) => {
        this.priority = value as Priority;
      });
    });

    new Setting(contentEl)
      .addToggle((toggle) =>
        toggle
          .setValue(this.openAfterCreate)
          .onChange((value) => (this.openAfterCreate = value)),
      )
      .setName("Abrir la nota tras crearla");

    new Setting(contentEl).addButton((btn) =>
      btn
        .setButtonText("Crear")
        .setCta()
        .onClick(() => void this.submit()),
    );
  }

  private async submit(): Promise<void> {
    const title = this.title.trim();
    if (!title) {
      new Notice("El título no puede estar vacío.");
      return;
    }

    const file = await this.service.createTask(title, this.priority);
    this.close();

    if (this.openAfterCreate) {
      await this.app.workspace.getLeaf(true).openFile(file);
    } else {
      new Notice(`Tarea "${file.basename}" creada en el backlog.`);
    }

    this.onCreated?.(this.openAfterCreate);
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
