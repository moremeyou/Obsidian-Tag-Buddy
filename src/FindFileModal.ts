import { App, TFile, Notice, FuzzySuggestModal, SuggestModal } from "obsidian";

export class SelectFileModal extends SuggestModal<TFile> {
  result: TFile;
  onSubmit: (result: TFile) => void;
  fileList: TFile[];

  constructor(app: App, onSubmit: (result: TFile) => void) {
    super(app);
    this.onSubmit = onSubmit;

    this.fileList = this.app.vault.getMarkdownFiles();
  }

  // Returns all available suggestions.
  getSuggestions(query: string): TFile[] {
    //if (this.fileList.length == 0)
    return this.fileList.filter((file) =>
      file.path.includes(query)
    );
  }

  // Renders each suggestion item.
  renderSuggestion(file: TFile, el: HTMLElement) {
    el.createEl("div", { text: file.name });
    el.createEl("small", { text: file.path });
  }

  // Perform action on the selected suggestion.
  onChooseSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent) {
    //new Notice(`Selected ${file.path}`);
    //console.log(evt.target.value)
    //if (file.name)
    this.onSubmit(file)
  }

  //onNoSuggestion(file: TFile, evt: MouseEvent | KeyboardEvent) {
    //new Notice(`No selection`);
    //this.onSubmit(file)
  //}
}