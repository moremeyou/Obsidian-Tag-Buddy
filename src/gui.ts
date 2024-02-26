import { App, DropdownComponent, setIcon, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import type { App } from "obsidian";
import * as Utils from './utils';
import { TagSelector } from './Modal'

export class GUI {
	app: App; 
	plugin: TagBuddy;

	constructor(
		app: App, 
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;

		//this.injectStyles();
	}

	isTagValid (tag:string):boolean { // including the #
		const tagPattern = /^#[\w]+$/;
		return tagPattern.test(tag);
	}

	makeButton (
		lable: string, 
		clickFn: (e: Event) => void, 
		classId='tagsummary-button'
	): HTMLElement {

		const button = createEl('button');
	    //button.innerText = lable;
    	setIcon(button, lable);
	    button.className = classId;

		this.plugin.registerDomEvent(
			button, 
			'click', 
			clickFn.bind(this)
		);

	    return button;
	}

	makeRemoveTagButton (
		paragraphEl: Element, 
		tag: string, 
		filePath: string
	):HTMLButtonElement {
		const button = this.makeButton ('list-x', (e) => { 
			e.stopPropagation();

			const tagEl = Utils.getTagElement(paragraphEl, tag);
			this.plugin.tagEditor.edit(tagEl);
		});
		button.title = 'Remove ' + tag + ' from paragraph (and from this summary).';
		return button;
	}

	makeSummaryRefreshButton (
		summaryEl:HTMLElement
	): HTMLElement {	
		
		const button = this.makeButton(
			'search', 
			(e) => { 
				e.stopPropagation();
				
				this.plugin.tagSummary.update(summaryEl);
				//this.updateSummary(summaryEl);
				new Notice ('Tag Summary updated');
				setTimeout(async () => { 
					//this.plugin.tagProcessor.run(); 
				}, 10);
			}
		);

		button.title = 'Refresh tag summary';

		return button;
	}

	makeCopyToSection (
		content: string, 
		sections: string[], 
		paragraph: string, 
		tags: Array, 
		filePath: string, 
		paragraphEl: HTMLElement, 
		summaryEl: HTMLElement
	): HTMLElement {
		const containerEl: HTMLElement = createEl('span');
		const selector: HTMLSelectElement = createEl('selectEl');
		const prefix: HTMLInputElement = createEl('inputEl');
		const button: HTMLElement = this.makeCopyToButton (content, sections, paragraph, tags, filePath, paragraphEl, summaryEl);
		containerEl.appendChild(selector);
		containerEl.appendChild(prefix);
		containerEl.appendChild(button);
		//selector.addOptions(sections);
		prefix.value = '- ';
		return containerEl;
	}

	makeCopyToButton (
		content: string, 
		section: string, 
		paragraph: string, 
		tags: Array, 
		filePath: string, 
		paragraphEl: HTMLElement, 
		summaryEl: HTMLElement
	): HTMLElement {

		const buttonLabel = ('copy')// + 
			//Utils.truncateStringAtWord(section, 16));
			//this.truncateStringAtWord(section, 16));

		const button = this.makeButton(
			buttonLabel, 
			async(e) => { 
				e.stopPropagation();

				let newContent = content;
				const prefix = this.plugin.settings.taggedParagraphCopyPrefix;

				if (Utils.ctrlCmdKey(e)) {
					tags.forEach((tag, i) => {
						//newContent = this.removeTagFromString(newContent, tag).trim();
						newContent = Utils.removeTagFromString(newContent, tag).trim();
					});
				} 

				//const copySuccess = this.copyTextToSection(
				const copySuccess = this.plugin.tagSummary.copyTextToSection(
						prefix + newContent, 
						section, 
						filePath);
				
				if (copySuccess) {
					if (Utils.ctrlCmdKey(e) && e.shiftKey) {
						
						const file = this.app.vault.getAbstractFileByPath(filePath);
						let fileContent = await this.app.vault.read(file);
						fileContent = fileContent.trim();
						//const newFileContent = this.replaceTextInString (content.trim(), 
						const newFileContent = Utils.replaceTextInString(
							content.trim(), 
							fileContent, 
							newContent).trim();
						
						if (fileContent != newFileContent) {
							
							this.app.vault.modify(file, newFileContent);
							
							const notice = new Notice(
								'Paragraph moved to ' + section +
								'.\n🔗 Open source note.', 
								5000);

							this.removeElementWithAnimation(paragraphEl, () => {
			    				setTimeout(async () => { 
			    					this.plugin.tagSummary.update(summaryEl); 
			    					paragraphEl.remove(); 
			    				}, 500);						
						    	setTimeout(async () => { 
						    		//this.plugin.tagProcessor.run(); 
						    	}, 800);
							});

							this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
								this.app.workspace.openLinkText(filePath, '');
			 				});

						} else {
							new Notice ('Tag Buddy: Paragraph copied to ' + section 
								+ '.\nBut can\'t update source file.');
						}
						
					} else {
						new Notice ('Tag Buddy: Paragraph copied to ' + section + '.');
					}
				} else {
					// errors 
				}
			}
		);

		button.title = 'Copy paragraph to ' + section + 
			'.\n' + Utils.ctrlCmdStr() + '+CLICK to remove tag(s) then copy.\n';

		button.title += 'SHIFT+' + Utils.ctrlCmdStr() + '+CLICK to remove tags from source note paragraph.'

		return button;
	}

	makeBakeButton (
		summaryMd: string, 
		summaryEl:HTMLElement, 
		filePath:string
	): HTMLElement {	
		
		const button = this.makeButton (
			'stamp', 
			async(e) => { 
				e.stopPropagation();
				
				const mdSource = summaryEl.getAttribute(
					'codeblock-code'
				);
				
				if (mdSource) {
					const file = await this.app.vault.getAbstractFileByPath(filePath);
					const fileContent = await this.app.vault.read(file);
					const newFileContent = Utils.replaceTextInString (
						mdSource, 
						fileContent, 
						summaryMd
					)

					this.app.vault.modify(file, newFileContent);

					const notice = new Notice ('Tag summary flattened to active note.');
				} else {
					new Notice ('⚠️ Tag Buddy: Can\t find code block source. This is a BUG. 🪲');
				}
			}
		);

		button.title = 'Flatten summary (replaces code block).';

		return button;
	}

	makeCopyButton (
		content
	): HTMLElement {	
		const button = this.makeButton ('copy', (e) => { 
			e.stopPropagation();

			navigator.clipboard.writeText(content);
			const notice = new Notice ('Tag Buddy: Copied to clipboard.');
		});

		button.title = 'Copy paragraph';

		return button;
	}

	makeCopySummaryButton (
		summaryMd: string)
	:HTMLElement {

		const button = this.makeButton (
			'clipboard-list', 
			(e) => { 
				e.stopPropagation();
				
				navigator.clipboard.writeText(summaryMd);
				new Notice ('Summary copied to clipboard.');
			}
		);

		button.title = 'Copy summary';

		return button;
	}

	makeSummaryNoteButton (
		summaryMd: string, 
		tags: Array
	): HTMLElement {

		const button = this.makeButton (
			'file-plus-2', 
			async (e) => {

			e.stopPropagation();

			//const newNoteObj = this.fileObjFromTags(tags);
			const newNoteObj = Utils.fileObjFromTags(tags);
			let fileContent = '## ' + newNoteObj.title + '\n\n' + summaryMd;
			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			//const fileName = this.getActiveFileFolder()+newNoteObj.fileName;
			const fileName = Utils.getActiveFileFolder(view)+newNoteObj.fileName;
			const file = this.app.vault.getAbstractFileByPath(fileName);
			let notice;

			tags.forEach ((tag) => {
				fileContent = Utils.replaceTextInString (tag, fileContent, tag.substring(1), true)
			});

			if (file instanceof TFile) {

				notice = new Notice ('⚠️ Note already exists.\nClick here to overwrite.', 5000);
				this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
					this.app.vault.modify(file, fileContent);
					notice = new Notice ('Note updated.\n🔗 Open note.', 5000);
					this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
						this.app.workspace.openLinkText(fileName, '');
					});
				});

			} else if (!file) {

				this.app.vault.create(fileName, fileContent);
				const notice = new Notice ('Tag Buddy: Summary note created. 📜\n🔗 Open note.');
				this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
					this.app.workspace.openLinkText(newNoteObj.fileName, '');
				});

			}
		});

		button.title = 'Create note from summary';

		return button;
	}

	showTagSelector(event){
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();
		let pageX, pageY
		let nodeType
		let deepestNode;
		let range
		if (this.app.isMobile) {
			const touch = event.touches[0] || event.changedTouches[0];
			pageX = Math.round(touch.pageX);
			pageY = Math.round(touch.pageY);
			//const el = Utils.getDeepestTextNode(document.elementFromPoint(pageX, pageY))
			//const el = document.elementFromPoint(pageX, pageY);
			//deepestNode = Utils.getDeepestNode(el);
			range = document.caretRangeFromPoint(pageX, pageY)
			nodeType = range.startContainer.nodeType //deepestNode.nodeType;
		} else {
			pageX = event.pageX;
			pageY = event.pageY;
			range = document.caretRangeFromPoint(pageX, pageY)
			nodeType = range.startContainer.nodeType;
		}
//console.log(event)
//console.log(pageX, pageY)
//console.log(range)
//console.log('deepestNode:', deepestNode)
		//const targetClasses = ['tag'];
        //if (mode == 'preview' && !targetClasses.some(cls => event.target.classList.contains(cls))) {
       	if (mode == 'preview') {
			if (nodeType === Node.TEXT_NODE) {
				const tagSelector: TagSelector = new TagSelector(
					this.app, 
					this.plugin, 
					event, (tag)=>{
						//console.log(tag)
						this.plugin.tagEditor.add(
			        		'#' + tag, 
			        		pageX, 
			        		pageY//,
			        		//{range: range, el: deepestNode}
	        			)
					}
				).open();
			}
		}
	}

	removeElementWithAnimation(
		el: HTMLElement, 
		callback: (e: Event) => void, 
	):void {

	  // Get the actual height of the element
	  const height = el.offsetHeight;

	  // Set height to the current value for CSS transition
	  el.style.height = `${height}px`;

	  // Allow the browser to update, then set to 0 to trigger the transition
	  //setTimeout(() => { el.style.height = '0px'; }, 0);
	  setTimeout(() => {
        el.style.height = '0px';
        el.style.opacity = '0';
        el.style.margin = '0';
        el.style.padding = '0';
    	}, 0);
	  
	  el.addEventListener(
	  	'transitionend', function onEnd() {
    		el.removeEventListener('transitionend', onEnd);
    		callback();
	    	//setTimeout(() => { el.remove(); }, 10); // remove in the callback
	  });
	}

	

}