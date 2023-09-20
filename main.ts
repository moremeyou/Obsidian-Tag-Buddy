import { TBSettingsTab } from "./settings";
import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Bug: should be ignoring the yaml and any code blocks. indexs will need to account for this

interface TBSettings {
	removeOnClick: boolean; //ctrl
	optToConvert: boolean; //alt
}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, // when true, cmd is needed when clicking to remove the tag
	optToConvert: true, // when false, clicking tag will do nothing
}; 


export default class TagBuddy extends Plugin {  
	settings: TBSettings;

	onunload() {}
  
	async onload() {
		// This adds a settings tab so the user can configure various aspects of the plugin 
		await this.loadSettings();
		this.addSettingTab(new TBSettingsTab(this.app, this));

		console.log('Tag Tests Plugin loaded!');

		this.registerDomEvent(document, 'click', async (event: MouseEvent) => {
		const target = event.target as HTMLElement;
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		//console.log('removeOnClick: ' + this.settings.removeOnClick);
		//console.log('optToConvert: ' + this.settings.optToConvert);
		//console.log('event.metaKey = ' + event.metaKey);
		//console.log('(event.ctrlKey && !this.settings.removeOnClick) = ' + (event.ctrlKey && !this.settings.removeOnClick));
		//console.log('(event.metaKey && !this.settings.removeOnClick) = ' + (event.metaKey && !this.settings.removeOnClick));
		if (this.settings.removeOnClick && event.metaKey) {
			return;
		} else if (!this.app.workspace.getActiveViewOfType(MarkdownView) == 'preview'){ 
			return;
		} else if (event.altKey && !this.settings.optToConvert) {
			return;
		}
		
		if (target && target.matches('.tag')) {
			//console.log('LET\'S DO THIS!!!');
			
			if (this.settings.removeOnClick) {
				event.preventDefault();
				event.stopPropagation();
			}

			const tag = target.innerText;
			//console.log(`Clicked tag: ${tag}`);
			let element = target as HTMLElement;
			const activeNoteContainer = this.app.workspace.activeLeaf.containerEl;
			const isTagInActiveNote = isElementInActiveNote(target, activeNoteContainer);

			let file = this.app.workspace.getActiveFile();
			if (!isTagInActiveNote) {
				while (element) {
					const linkElement = element.querySelector('a[data-href$=".md"]');
					if (linkElement) {
						const filePath = linkElement.getAttribute('data-href');
						file = this.app.vault.getAbstractFileByPath(filePath);
						break;
					}
					element = element.parentNode;
				}
			}
			
			//view.previewMode.rerender(true);
			//this.app.workspace.activeLeaf.rebuildView()
			//this.app.workspace.getActiveLeaf().refresh();
			const activeLeaf = this.app.workspace.activeLeaf;
			if (activeLeaf && !isTagInActiveNote) {
			    // ... other operations
		    	activeLeaf.rebuildView();
			}


			//console.log(`In current file? ${isTagInActiveNote?'yes':'no'}`);
			// convert tag to an in-line tag summary below this line? or create a line break?
			if (file) {
				const fileContent = await this.app.vault.read(file);
				// Count occurrences of the tag
				const tags = Array.from((isTagInActiveNote?document:element).querySelectorAll('.tag'));
				const occurrenceIndex = tags.filter(t => t.innerText === tag && t.offsetTop < target.offsetTop).length;
				const occurrences = fileContent.split(tag).length - 1;
				let startIndex = -1;
				for (let i = 0; i <= occurrenceIndex; i++) {
					startIndex = fileContent.indexOf(tag, startIndex + 1); 
				}

				//console.log(`Occurrence index: ${occurrenceIndex}`);
				//console.log(`File: ${file.basename}`);
				//console.log(`Total occurrences: ${occurrences}`); 
				//console.log(`Starting index: ${startIndex}`);

				if (startIndex !== -1) {
					const contentBeforeTag = fileContent.substring(0, startIndex);
					const contentAfterTag = fileContent.substring(startIndex);
					let newContent = '';
					if (event.altKey) {
						newContent = fileContent.substring(0, startIndex) + tag.substring(1) + fileContent.substring(startIndex + tag.length);
					} else if ((event.metaKey && !this.settings.removeOnClick) || (!event.metaKey && this.settings.removeOnClick)) {
						
						newContent = fileContent.substring(0, startIndex - (startIndex>0 && fileContent[startIndex-2]===' '?2:1)) + fileContent.substring(startIndex + tag.length);
					} else {
						return;
					}
					
					await this.app.vault.modify(file, newContent);

					this.app.workspace.iterateLeaves(leaf => {
						const markdownView = leaf.view as MarkdownView;
						if (markdownView.file && markdownView.file.path === file.path) {
							const editor = markdownView.sourceMode.cmEditor;
							editor.setValue(newContent);
						}
					});
				}
			}

			await this.app.vault.modify(file, newContent);

			this.app.workspace.iterateLeaves(leaf => {
				const markdownView = leaf.view as MarkdownView;
				if (markdownView.file && markdownView.file.path === file.path) {
					const editor = markdownView.sourceMode.cmEditor;
					editor.setValue(newContent);
				}
			}

			)
				
			if (!isTagInActiveNote) { 
				setTimeout(async () => {
					//app.workspace.activeLeaf.rebuildView();
					//app.workspace.getActiveViewOfType(MarkdownView)?.previewMode.rerender(true);
					//view.previewMode.rerender(true);
					this.app.workspace.activeLeaf.rebuildView()
				}, 1)};
			}
		}, true); // (this.settings.removeOnClick || this.settings.optToRemove)?true:false);

		function isElementInActiveNote(clickedElement, activeNoteContainer) {
			let element = clickedElement;
			while (element) {
				if (element === activeNoteContainer) {
					return true;
				}
				if (element.classList.contains('summary')) {
					//console.log('child element: ' + element.classList);
					return false;
				}
				element = element.parentElement;
			}
			return false;
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

}

