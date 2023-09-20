import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

export default class ClickAnywherePlugin extends Plugin {
  onload() {
    //console.log('ClickAnywherePlugin loaded successfully.');
    
    //this.collectTagIds(); 
    
    // Re-collect tag ids on various events
    this.registerEvent(this.app.on('editor-change', (event: EditorEvent) => {
      this.collectTagIds(); 
    }));
    this.registerEvent(this.app.on('file-open', (event: EditorEvent) => {
      this.collectTagIds(); 
    }));
    this.registerEvent(this.app.on('layout-change', (event: EditorEvent) => {
      this.collectTagIds(); 
    })); 

    // Main logic for removing clicked tag
    this.registerDomEvent(document, 'mousedown', (event: MouseEvent) => { 
      this.collectTagIds(); 
      if (event.metaKey || event.ctrlKey) { 
        return;
      }
      const clickedTagElement = this.getClickedTag(event.target);
      //console.log(clickedTagElement);
      if (clickedTagElement) {
        const clickedTagText = clickedTagElement.textContent.trim();
        const fullTagText = clickedTagText;
        const tagId = parseInt(clickedTagElement.getAttribute('data-tag-id'));


        // Determine if the clicked tag is in the active note
        const activeNoteContainer = this.app.workspace.activeLeaf.containerEl;
        const isTagInActiveNote = isElementInActiveNote(clickedTagElement, activeNoteContainer);
        //console.log('Is tag in active note:', isTagInActiveNote);
        // Now you can use isTagInActiveNote to decide whether to remove the tag or not
  


<<<<<<< HEAD
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

=======
        this.getTagLocation(fullTagText, tagId).then((tagLocation) => {
          if (tagLocation && isTagInActiveNote) {
            //console.log('remove tag');
            this.removeTagTextFromNote(fullTagText, tagLocation, tagId);  
            this.collectTagIds(); 
          }
        }); 
      } 
    });
  

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


  // Collect all tags and set data-tag-id attribute
  async collectTagIds() {
    const note = this.app.workspace.getActiveFile();  

    if (note) {
      //console.log('collectTagIds');
      const content = await app.vault.read(note);

      const contentElement = this.app.workspace.activeLeaf.containerEl;

      const tagElements = contentElement.querySelectorAll('.tag');     
      const tagCounts = {};

      tagElements.forEach((tagElement) => {
      const tagText = tagElement.textContent.trim();
      const fullTagText = '#' + tagText;

      if (!tagCounts.hasOwnProperty(fullTagText)) { 
        tagCounts[fullTagText] = 0;
      }

      tagElement.setAttribute('data-tag-id', tagCounts[fullTagText]);
      tagCounts[fullTagText]++;
    });
    
  }
}

  // Return target if it's a tag, otherwise return null
  getClickedTag(target) {
    if (target.classList && target.classList.contains('tag')) {
      return target;
    }
    return null;
  }

  // Get start and end index of the tag to be removed
  async getTagLocation(fullTagText, tagId) {
    const note = this.app.workspace.getActiveFile();

    if (note) {
      const content = await this.app.vault.read(note);
      let startIndex = -1;

      for (let i = 0; i <= tagId; i++) {
        startIndex = content.indexOf(fullTagText, startIndex + 1); 
      }

      if (startIndex !== -1) {
        const endIndex = startIndex + fullTagText.length;
        return { startIndex, endIndex };
      }
    }

    return null; 
  }

  // Remove tag from note and update content
  async removeTagTextFromNote(fullTagText, tagLocation) {
    const note = this.app.workspace.getActiveFile();

    if (note) {
      const content = await this.app.vault.read(note);

      const newContent = content.substring(0, tagLocation.startIndex) + content.substring(tagLocation.endIndex);

      await this.app.vault.modify(note, newContent);
    }
    //this.collectTagIds(); 
  } 

}
>>>>>>> parent of 04e1d81 (More functions)
