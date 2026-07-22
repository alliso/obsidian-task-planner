import {
  App,
  Notice,
  TAbstractFile,
  TFile,
  TFolder,
  moment,
  normalizePath,
} from "obsidian";
import { Priority, TaskMeta, TaskPlannerSettings } from "./types";

/**
 * Lógica central de gestión de tareas: lee, crea, mueve y archiva notas-tarea,
 * apoyándose en la API nativa de Obsidian para no reinventar la E/S de ficheros.
 */
export class TaskService {
  constructor(
    private app: App,
    private getSettings: () => TaskPlannerSettings,
  ) {}

  private get settings(): TaskPlannerSettings {
    return this.getSettings();
  }

  // --- Lectura -------------------------------------------------------------

  /** Devuelve los metadatos de todas las notas-tarea directas de una carpeta. */
  getTasksInFolder(folderPath: string): TaskMeta[] {
    const folder = this.app.vault.getAbstractFileByPath(
      normalizePath(folderPath),
    );
    if (!(folder instanceof TFolder)) {
      return [];
    }

    const tasks: TaskMeta[] = [];
    for (const child of folder.children) {
      if (child instanceof TFile && child.extension === "md") {
        tasks.push(this.readTask(child));
      }
    }
    return tasks;
  }

  /** Lee los metadatos de una nota-tarea desde el metadataCache. */
  readTask(file: TFile): TaskMeta {
    const fm = this.app.metadataCache.getFileCache(file)?.frontmatter ?? {};
    const priority = fm.priority;
    return {
      file,
      title: file.basename,
      status: typeof fm.status === "string" ? fm.status : null,
      priority:
        priority === "low" || priority === "medium" || priority === "high"
          ? priority
          : null,
      created: typeof fm.created === "string" ? fm.created : null,
    };
  }

  // --- Escritura de frontmatter -------------------------------------------

  /** Cambia el estado (columna) de una tarea dentro del board. */
  async setStatus(file: TFile, statusId: string): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.status = statusId;
    });
  }

  // --- Movimiento entre carpetas ------------------------------------------

  /** Mueve una tarea al board asignándole el estado inicial (primera columna). */
  async promoteToBoard(file: TFile): Promise<void> {
    const initialStatus = this.settings.statuses[0]?.id ?? "todo";
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.status = initialStatus;
    });
    await this.moveToFolder(file, this.settings.boardFolder);
  }

  /** Mueve una tarea de vuelta al backlog (limpiando su estado). */
  async sendToBacklog(file: TFile): Promise<void> {
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      delete fm.status;
    });
    await this.moveToFolder(file, this.settings.backlogFolder);
  }

  /** Archiva una tarea moviéndola a la carpeta de archivadas. */
  async archive(file: TFile): Promise<void> {
    await this.moveToFolder(file, this.settings.archivedFolder);
  }

  /**
   * Mueve un archivo a la carpeta destino preservando enlaces. Crea la carpeta
   * si no existe. No hace nada si el archivo ya está en la carpeta destino.
   */
  private async moveToFolder(file: TFile, folderPath: string): Promise<void> {
    const targetFolder = normalizePath(folderPath);
    await this.ensureFolder(targetFolder);

    const destPath = normalizePath(`${targetFolder}/${file.name}`);
    if (destPath === file.path) {
      return;
    }

    if (this.app.vault.getAbstractFileByPath(destPath)) {
      new Notice(`Ya existe una tarea "${file.name}" en ${folderPath}.`);
      return;
    }

    await this.app.fileManager.renameFile(file, destPath);
  }

  /** Crea una carpeta (y sus padres) si no existe todavía. */
  private async ensureFolder(folderPath: string): Promise<void> {
    const normalized = normalizePath(folderPath);
    const existing: TAbstractFile | null =
      this.app.vault.getAbstractFileByPath(normalized);
    if (existing instanceof TFolder) {
      return;
    }

    // createFolder crea recursivamente los segmentos que falten.
    const segments = normalized.split("/");
    let current = "";
    for (const segment of segments) {
      current = current ? `${current}/${segment}` : segment;
      if (!this.app.vault.getAbstractFileByPath(current)) {
        await this.app.vault.createFolder(current);
      }
    }
  }

  // --- Creación ------------------------------------------------------------

  /**
   * Crea una nueva nota-tarea en el backlog con frontmatter inicial y devuelve
   * el archivo creado.
   */
  async createTask(title: string, priority: Priority): Promise<TFile> {
    const backlog = normalizePath(this.settings.backlogFolder);
    await this.ensureFolder(backlog);

    const today = moment().format("YYYY-MM-DD");
    const slug = this.kebabCase(title) || "nueva-tarea";
    const fileName = `${slug}-${moment().format("YYYYMMDD")}`;
    const path = await this.uniquePath(backlog, fileName);

    const content = [
      "---",
      `priority: ${priority}`,
      `created: ${today}`,
      "---",
      "",
      `# ${title}`,
      "",
    ].join("\n");

    return this.app.vault.create(path, content);
  }

  /** Convierte un texto a kebab-case, apto para nombres de archivo. */
  private kebabCase(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // elimina acentos
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-") // no alfanuméricos -> guion
      .replace(/^-+|-+$/g, ""); // recorta guiones sobrantes
  }

  /** Devuelve una ruta única añadiendo un sufijo numérico si hace falta. */
  private async uniquePath(folder: string, baseName: string): Promise<string> {
    let candidate = normalizePath(`${folder}/${baseName}.md`);
    let counter = 1;
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      candidate = normalizePath(`${folder}/${baseName} ${counter}.md`);
      counter++;
    }
    return candidate;
  }
}
