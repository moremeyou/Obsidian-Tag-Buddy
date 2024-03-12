import { App, DropdownComponent, setIcon, MarkdownRenderer, DropdownComponent, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import type { App } from "obsidian";
import * as Utils from './utils';
import { TagSelector } from './Modal'
import { TBTagEditorModal } from './TagEditorModal'
import { SelectFileModal } from './FindFileModal'

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

	showTagEditor (tag = '') {

//console.log('GUI.showTagEditor')
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();
	
		if (this.app.isMobile) {
			
		} else {
		
		}

       	if (mode == 'preview') {
			
			const tagEditorModal: TBTagEditorModal = new TBTagEditorModal (
				this.app, 
				this.plugin,
				tag//,
				//(tag)=>{
				//	console.log(tag) 
				//}
			).open();

		}


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
			clickFn
		);

	    return button;
	}


	makeBlockSelector (
		index: Number
	): HTMLElement {
		
		const checkboxEl = createEl ('div');
		//checkboxEl.setAttribute('class', 'tagsummary-checkbox')
		checkboxEl.setAttribute('index', index)

		let checkedBtn;
		let uncheckedBtn;

		const checkBox = function (bool: Boolean) {
			//console.log(checkboxEl.getAttribute('index'))

			this.plugin.tagSummary.updateSelection (parseInt(checkboxEl.getAttribute('index')), bool);
			if (bool) {
				uncheckedBtn.remove();
				checkboxEl.appendChild(checkedBtn);
			} else {
				checkedBtn.remove();
				checkboxEl.appendChild(uncheckedBtn);
			} 
		}.bind(this);

		checkedBtn = this.makeButton ('check-square', (e) => { 
			e.stopPropagation();
			checkBox(false)

		}, 'tagsummary-button tagsummary-checkbox checked');
		checkedBtn.title = 'Unselect this paragraph.';
		
		uncheckedBtn = this.makeButton ('square', (e) => { 
			e.stopPropagation();
			checkBox(true)

		}, 'tagsummary-button tagsummary-checkbox');
		uncheckedBtn.title = 'Select this paragraph.';

		checkBox (false)

		return checkboxEl;

	}

	makeRemoveTagButton (
		clickFn: Function,
		paragraphEl: Element, 
		tag: string//, 
		//filePath: string
	):HTMLButtonElement {
		const button = this.makeButton ('list-x', (e) => { 
			e.stopPropagation();

			clickFn(e, paragraphEl, tag)

			//const tagEl = Utils.getTagElement(paragraphEl, tag);
			//this.plugin.tagEditor.edit(tagEl);
		});
		button.title = 'Removed ' + tag + ' from paragraph.';
		return button;
	}

	makeSummaryRefreshButton (
		summaryEl:HTMLElement
	): HTMLElement {	
		
		const button = this.makeButton(
			'refresh-ccw', 
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
		clickFn:Function,
		content: string, 
		sections: string[], 
		tags: Array, 
		filePath: string, 
		paragraphEl: HTMLElement, 
		summaryEl: HTMLElement
	): HTMLElement {

		const copyToEl: HTMLElement = createEl('span');
		const selectEl: HTMLSelectElement = createEl('selectEl');
		let dropdown = new DropdownComponent(selectEl);
		sections.forEach((sec) => {
			dropdown.addOption(sec, Utils.truncateStringAtWord(sec, 16)); 
		});
		dropdown.addOption('top', 'Top of note'); 
		dropdown.addOption('end', 'End of note'); 
		
		selectEl.querySelector('select').className = 'tagsummary-dropdown';

		// have these as settings "show x, etc"
		// link-2
		// copy-plus - copy's to
		// copy-check - moves
/*
		copyToEl.appendChild(
			this.makeButton ('link-2', async(e) => { })
		);
		copyToEl.appendChild(
			this.makeButton ('copy-plus', async(e) => { })
		);
*/
		copyToEl.appendChild(
			this.makeCopyToButton (
				clickFn,
				'note',	
				dropdown,
				paragraphEl, 
				summaryEl,
				content,
				tags,
				filePath 
			)
		)
		copyToEl.appendChild(
			this.makeCopyToButton (
				clickFn,
				'link',	
				dropdown,
				paragraphEl, 
				summaryEl,
				content,
				tags,
				filePath 
			)
		)
		copyToEl.appendChild(
			this.makeCopyToButton (
				clickFn,
				'copy',
				dropdown,
				paragraphEl, 
				summaryEl,
				content,
				tags,
				filePath 
			)
		)
		copyToEl.appendChild(
			this.makeCopyToButton (
				clickFn,
				'move',
				dropdown,
				paragraphEl, 
				summaryEl,
				content,
				tags,
				filePath 
			)
		)

		//////
		// copy to file button
		// prompts for a file. then tries to put the content under the specified header in that file
		//////

		copyToEl.appendChild(selectEl);


		return copyToEl;
	}

	makeCopyToButton (
		clickFn: Function,
		mode: String,
		dropdown: DropdownComponent,
		paragraphEl: HTMLElement, 
		summaryEl: HTMLElement,
		content: string,  
		tags: Array, 
		filePath: string 
	): HTMLElement {

		let buttonLabel;
		if (mode == 'link') buttonLabel = 'link';
		else if (mode == 'copy') buttonLabel = 'copy-plus';
		else if (mode == 'move') buttonLabel = 'replace'; //'copy-check';
		else if (mode == 'note') buttonLabel = 'file-plus-2';

		const button = this.makeButton (buttonLabel, (e) => { 
			e.stopPropagation();

			if (mode == 'note') {

				new SelectFileModal(this.app, (result) => {

  					//new Notice(`File: ${result.name}`);

  					clickFn(
						e, 
						mode,
						dropdown,
						paragraphEl, 
						summaryEl,
						content,  
						tags, 
						filePath,
						result
					);

				}).open();

			} else {

				clickFn(
					e, 
					mode,
					dropdown,
					paragraphEl, 
					summaryEl,
					content,  
					tags, 
					filePath
				);
			}
		});
		let buttonHoverText;
		if (mode == 'link') buttonHoverText = 'Copy paragraph link to section.' ;
		else if (mode == 'copy') buttonHoverText = 'Copy paragraph to section.';
		else if (mode == 'move') buttonHoverText = 'Move paragraph to section.';
		else if (mode == 'note') buttonHoverText = 'Move paragraph to section in note.';

		button.title = buttonHoverText;

		return button;
		
		//const buttonLabel = ('chevron-right-square')
		/*let buttonLabel;
		if (mode == 'link') buttonLabel = 'link';
		else if (mode == 'copy') buttonLabel = 'copy-plus';
		else if (mode == 'move') buttonLabel = 'replace'; //'copy-check';

		const button = this.makeButton(
			buttonLabel, 
			async(e) => { 
				e.stopPropagation();

				// content to copy

				let newContent
				const selection = window.getSelection().toString();
				
				if (selection == '') newContent = content;
				else newContent = selection;
				let notice;
					
				if (mode == 'link') {
				
					const fileName = filePath.split('/').pop().replace(/\.md$/, '');
					newContent = '[[' + filePath + '|' + fileName + ']]';
				
				} 

				if (mode != 'link' && !selection) {
					tags.forEach((tag, i) => {
						// make this a setting. we'll default to always for now
						newContent = Utils.removeTagFromString(newContent, tag).trim();
					});
				}


//console.log('content=' + newContent)
				const copySuccess = this.plugin.tagSummary.copyTextToSection(
					//this.plugin.settings.taggedParagraphCopyPrefix + 
					newContent, 
					dropdown.getValue(), 
					filePath,
					(mode!='link')
				);

				if (copySuccess) {

//console.log('mode=' + mode + '\nselection=' + selection + '<')

					if (mode == 'move' && !selection) {

//console.log('mode == move && no selection')

						const file = this.app.vault.getAbstractFileByPath(filePath);
						let fileContent = await this.app.vault.read(file);
						fileContent = fileContent.trim();
						const newFileContent = Utils.replaceTextInString(
							content.trim(), 
							fileContent, 
							newContent).trim();
						if (fileContent != newFileContent) {
							
							this.app.vault.modify(file, newFileContent);
							
							notice = new Notice(
								//'Moved to section: ' + dropdown.getValue() +
								//'.\n🔗 Open source note.', 
								'Copied to section: ' + dropdown.getValue() + '. 🔗',
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
								//this.app.workspace.openLinkText(filePath, '');
								this.app.workspace.openLinkText(this.app.workspace.getActiveFile().path+'#'+dropdown.getValue(), '');
			 				});

						} else {
							new Notice ('Copied to section: ' + dropdown.getValue() 
								+ '.\nCan\'t update source file.');
						}

					} else if (mode == 'copy' || mode == 'link') {
						notice = new Notice ('Copied to section: ' + dropdown.getValue() + '. 🔗');
						this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
							this.app.workspace.openLinkText(this.app.workspace.getActiveFile().path+'#'+dropdown.getValue(), '');
 						});
					}
				}
				
			}
		)

		let buttonHoverText;
		if (mode == 'link') buttonHoverText = 'Copy paragraph link to section.' ;
		else if (mode == 'copy') buttonHoverText = 'Copy paragraph to section.';
		else if (mode == 'move') buttonHoverText = 'Move paragraph to section.';

		button.title = buttonHoverText;

		return button;*/
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
						summaryMd // this is where we call back to tag summary. 
						// we should be passing the index of this block
						// tag summary should return the selection or this index block
						// pass the function instead of the data to run it here. 
						// the function is in tag summary.
						// this is the view and controller.
						// tag summary is the model.
					)
//console.log(newFileContent)
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
		clickFn,
		content
	): HTMLElement {	
		const button = this.makeButton ('clipboard-list', (e) => { 
			e.stopPropagation();
			clickFn(e, content);
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