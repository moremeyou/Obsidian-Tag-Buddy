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
	}

	showTagEditor (tag = '') {

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

  					clickFn(e, mode, dropdown, paragraphEl, summaryEl, content, tags, filePath, result);

				}).open();

			} else {

				clickFn(e, mode, dropdown, paragraphEl, summaryEl, content, tags, filePath);
			}
		});
		let buttonHoverText;
		if (mode == 'link') buttonHoverText = 'Copy paragraph link to section.' ;
		else if (mode == 'copy') buttonHoverText = 'Copy paragraph to section.';
		else if (mode == 'move') buttonHoverText = 'Move paragraph to section.';
		else if (mode == 'note') buttonHoverText = 'Copy paragraph to section in note.';

		button.title = buttonHoverText;

		return button;
		
	}

	makeBakeButton (
		clickFn: Function,
		summaryMd: string, 
		summaryEl:HTMLElement, 
		filePath:string
	): HTMLElement {	
		
		const button = this.makeButton (
			'stamp', 
			async(e) => { 
				e.stopPropagation();
				
				clickFn (summaryMd, summaryEl, filePath)

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
		clickFn: Function,
		summaryMd: string, 
		tags: Array
	): HTMLElement {

		const button = this.makeButton (
			'file-plus-2', 
			async (e) => {
				e.stopPropagation();
				clickFn (summaryMd, tags);
			}
		);

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