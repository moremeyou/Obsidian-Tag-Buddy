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
