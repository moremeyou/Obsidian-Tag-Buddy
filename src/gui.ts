import { App, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
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

		this.injectStyles();
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
	    button.innerText = lable;
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
		const button = this.makeButton (' ⌗ˣ ', (e) => { 
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
			' ↺  ', 
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

		button.title = 'Refresh Tag Summary';

		return button;
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

		const buttonLabel = (
			' ❏   ' + 
			Utils.truncateStringAtWord(section, 16));
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
			'Bake', 
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
		const button = this.makeButton (' ❏ ', (e) => { 
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
			' ❏  ', 
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
			'Note', 
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

	_showTagSelector(
		x: number, 
		y: number
	):void {
		
		// Adjustments for the scrollbar and dynamic height
		const maxTagContainerHeight = 170; // This is a chosen max height, adjust as desired
		const tagItemHeight = 30; // 
		// 30 works perfect based on other padding and margin. 20 breaks it when there's one left.

		//const existingMenu = document.getElementById('addtag-menu');
		//const existingMenu = this.plugin.document.getElementById('addtag-menu');
		const existingMenu = document.getElementById('addtag-menu');
		if (existingMenu) existingMenu.remove();

	    const menuEl = createEl('div');
	    menuEl.setAttribute('id', 'addtag-menu');
	    menuEl.classList.add('addtag-menu');
	    menuEl.style.left = `${x}px`;
		menuEl.style.top = `${y}px`;

	    const searchEl = createEl('input');
	    searchEl.setAttribute('type', 'text');
	    searchEl.setAttribute('id', 'tag-search');
	    searchEl.classList.add('tag-search');
	    searchEl.setAttribute('placeholder', 'Search tags...');
	    
	    menuEl.appendChild(searchEl);
	    const tagContainer = createEl('div');
	    tagContainer.classList.add('tag-list');
	    tagContainer.style.setProperty('max-height', `${maxTagContainerHeight}px`, 'important');

	    menuEl.appendChild(tagContainer);

		const renderTags = (searchQuery: string) => {
	    	tagContainer.innerHTML = '';  
	    	//const filteredTags = this.fetchAllTags().filter(tag => tag.includes(searchQuery));
	    	const filteredTags = Utils.getTagsFromApp(
	    		this.app, 
	    		this.plugin.getRecentTags()).filter(tag => 
	    		tag.toLowerCase().includes(searchQuery.toLowerCase())
    		);
	    	// Set the dynamic height based on the number of results
	    	const dynamicHeight = Math.min(
	    		filteredTags.length * tagItemHeight, 
	    		maxTagContainerHeight)//+10;
	    	    
		    filteredTags.forEach((tag, index) => {
		        const itemEl = createEl('div');
		        itemEl.innerText = `${tag}`;
		        itemEl.classList.add('tag-item');
		        itemEl.title = `#${tag}`;
	            if (index === 0) {
	                itemEl.classList.add('active');  // Add active class to the first tag
	            }
	            itemEl.style.setProperty('max-height', `${dynamicHeight}px`, 'important');

		        this.plugin.registerDomEvent(
		        	itemEl, 
		        	'click', 
		        	(e) => {
			        	this.plugin.tagEditor.add(
			        		'#' + tag, 
			        		x, 
			        		y
		        		)
					    menuEl.remove();
					}, true
				);

	        	tagContainer.appendChild(itemEl);
			});


		    if (filteredTags.length * tagItemHeight > maxTagContainerHeight) {
		        tagContainer.style.overflowY = 'auto !important';
		    } else {
		        tagContainer.style.overflowY = 'hidden !important';
		    }
		};

	    searchEl.addEventListener('input', (e) => {
	        renderTags((e.target as HTMLInputElement).value);
	    });

	    this.plugin.registerDomEvent(searchEl, 'keyup', (e: KeyboardEvent) => {
			const searchQuery = (e.target as HTMLInputElement).value.trim();
			const pattern = /^[^\s\p{P}]+$/u; 

		    if (e.key === 'Enter') {
		        const activeTag = tagContainer.querySelector('.active');
		        if (activeTag) {
		            //activeTag.click();  // Simulate a click on the active tag
		            this.plugin.tagEditor.add(
		            	'#'+activeTag.innerText.trim(), 
		            	x, 
		            	y
	            	);
		        } else if (pattern.test(searchQuery)) {
		        	this.plugin.tagEditor.add(
		        		'#'+searchQuery.trim(), 
		        		x, 
		        		y
	        		);
		        }
		        menuEl.remove();
		    }
		});

	    renderTags('');
	    document.body.appendChild(menuEl);
		searchEl.focus();

		setTimeout(() => {
		    this.plugin.registerDomEvent(document.body, 'click', closeMenu);
	        this.plugin.registerDomEvent(document.body, 'contextmenu', closeMenu);
	        this.plugin.registerDomEvent(document.body, 'keyup', closeMenu);
		}, 1);

		const closeMenu = (e: MouseEvent | KeyboardEvent) => {
		    if (e instanceof MouseEvent && (e.button === 0 || e.button === 2)) {
		        if (!menuEl.contains(e.target as Node)) {  // Check if the click was outside the menu
		            menuEl.remove();
		            document.body.removeEventListener('click', closeMenu);
		            document.body.removeEventListener('contextmenu', closeMenu);
		            document.body.removeEventListener('keyup', closeMenu);
		        }
		    } else if (e instanceof KeyboardEvent && e.key === 'Escape') {
		        menuEl.remove();
		        document.body.removeEventListener('click', closeMenu);
		        document.body.removeEventListener('contextmenu', closeMenu);
		        document.body.removeEventListener('keyup', closeMenu);
		    }
		};

		this.plugin.registerDomEvent(tagContainer, 'mousemove', () => {
		    tagContainer.classList.remove('disable-hover');
		    const activeTag = tagContainer.querySelector('.tag-item.active');
		    if (activeTag) {
		        activeTag.classList.remove('active');
		    }
		});

		this.plugin.registerDomEvent(searchEl, 'blur', () => {
		    tagContainer.classList.remove('disable-hover');
		});

		this.plugin.registerDomEvent(searchEl, 'keydown', (e: KeyboardEvent) => {
		    const activeTag = tagContainer.querySelector('.active');
		    let nextActiveTag;
		    if (['ArrowUp', 'ArrowDown'].includes(e.key) || e.key.length === 1) { 
		        tagContainer.classList.add('disable-hover');
		    }
		    if (e.key === 'ArrowDown') {
		        if (activeTag && activeTag.nextElementSibling) {
		            nextActiveTag = activeTag.nextElementSibling;
		        } else {
		            nextActiveTag = tagContainer.firstChild; // loop back to the first item
		        }
		    } else if (e.key === 'ArrowUp') {
		        if (activeTag && activeTag.previousElementSibling) {
		            nextActiveTag = activeTag.previousElementSibling;
		        } else {
		            nextActiveTag = tagContainer.lastChild; // loop back to the last item
		        }
		    } else if (e.key === 'Enter') {
		        //if (activeTag) {
		        //    activeTag.click();
		        //    return;
		        //}
		    }

		    if (nextActiveTag) {
		        if (activeTag) {
		            activeTag.classList.remove('active');
		        }
		        nextActiveTag.classList.add('active');
		        nextActiveTag.scrollIntoView({ block: 'nearest' });
		        searchEl.value = nextActiveTag.innerText;
		    }
		});
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

	// This is here for now. Until I figure out why styles.css isn't working.
	injectStyles() {
		
		const styles = `
	    
	    .notice {
	    	/*background-color: var(--background-primary) !important;*/
	    }

	    .tagsummary-notags {
	    	color: var(--link-color) !important;
	    	font-weight: 500 !important;
	    	border: 1px solid var(--link-color) !important; 
	    	border-radius: 3px !important;
	    	padding: 10px 10px;
	    }

	    .tagsummary-button {

	       color: var(--text-primary) !important;
	       /*border: .5px solid var(--text-quote) !important;*/
	       border-radius: 3px !important;
	       padding: 2.5px 5px !important;
	       font-size: 65% !important;
	       transition: background-color 0.3s !important;
	       margin: 0px 3px 0px 0px !important;
	       min-width: 40px !important;

	       color: var(--link-color) !important;
	       border: 1px solid var(--link-color) !important; 
		   background-color: var(--background-primary) !important;

	    }

	    .tagsummary-button:hover {
	        background-color: var(--link-color) !important;
	        color: var(--background-secondary) !important;
	    }

	    .tagsummary-item-title {
	        margin: 5px 0px
	    }

	    .tagsummary-buttons {
	        /*float: right;*/
	        text-align: right !important;
	    }

		blockquote.tag-summary-paragraph {
			transition: height 0.3s, opacity 0.3s;
			/*transition: height 0.3s ease, margin 0.3s ease, padding 0.3s ease, opacity 0.3s ease;*/
			overflow: hidden;
		}

		.removing {
			height: 0 !important; 
			opacity: 0 !important; 
			margin: 0 !important; 
			padding: 0 !important; 
		}

	    @media only screen and (max-device-width: 480px), 
	       only screen and (max-width: 480px) and (orientation: landscape),
	       only screen and (max-device-width: 1024px), 
	       only screen and (min-width: 481px) and (max-width: 1024px) and (orientation: landscape) {
		   
		   .tagsummary-button {
		       display: inline-block !important;
		       font-size: 12px !important;
		       padding: 5px 5px;
		       box-shadow: none;  /* remove shadows if they look off */
		       border-radius: 3px;
		       color: var(--link-color) !important;
		       border: 1px solid var(--link-color); 
		       width: auto !important;            /* auto adjusts width based on content */
			   /*max-width: 60px !important;  */  
			   max-height: 30px !important;
			   min-width: 40px !important;
			   white-space: nowrap;
			   /*text-align: left !important;*/
			   overflow: hidden;
			   background-color: var(--background-primary) !important;
		   }

		}

		.addtag-menu {
			position: absolute !important;
		    background-color: var(--background-primary) !important;
		    /*color: white !important;*/
		    border: 1px solid var(--divider-color) !important;
		    z-index: 10000 !important;
		    overflow-y: auto !important;
		    /*max-height: 150px !important;*/
		    width: 150px !important;
		    box-shadow: 5px 5px 20px rgba(0, 0, 0, 0.5) !important;
	        /*border-radius: 8px !important;  */
	        font-family: Arial, sans-serif;  
	        font-size: 12px !important;
	        overflow: hidden !important;  // Hide overflow
			padding-right: 10px !important;  // Adjust padding to make space for scrollbar
			box-sizing: border-box !important; 
			border-radius: 10px !important;
			
		}

		.tag-list {
			overflow-y: auto !important;
		    overflow-x: hidden !important; 
		    /*padding-right: 8px !important;  // Adjust padding to give space for scrollbar
		    /*margin-right: -8px !important;  // Adjust margin to move scrollbar into the padding*/
		    box-sizing: border-box !important; 
		}

		.tag-item {
			padding: 5px 10px 5px 10px !important;  
	        cursor: pointer !important;
	        /* border-bottom: 1px solid var(--divider-color) !important;  // Separator line*/
	        font-size: 14px !important;
	        /*width: 130px !important;*/
	        width: 100% !important;
	        /*height: 20px !important;*/
	        text-overflow: ellipsis !important; 
			white-space: nowrap !important;  
			box-sizing: border-box !important; 

			
			/*transition: background-color 0.2s ease !important; */
			border-radius: 3px !important; 
		}

		.tag-item:hover {
	        background-color: var(--background-modifier-hover) !important; // Added ,1 for opacity
	        /*color: white !important;*/
	    }
		.tag-item.active {
	        background-color: var(--background-modifier-hover) !important;
	        /*background-color: var(--interactive-accent) !important;*/
	        /*color: white !important;*/
	    }

		#addtag-menu .disable-hover .tag-item:hover {
		    background-color: inherit !important;
		    color: inherit !important;
		}

	    .tag-search {
	     	width: 100% !important;
	        padding: 2.5px 5px !important;
	        border: none !important;
	        font-family: Arial, sans-serif;
	        font-size: 14px !important;
	        border-radius: 0px !important; 
	    }

	    .tag-search:focus {
	    	outline: none !important;
	    	border: none !important;
	    	border-bottom: 0px !important;
	    	box-shadow: none !important;
	    	outline-style: none !important;
			outline-width: 0px !important;
	    } 
		
		`;

	    const styleSheet = createEl("style");
	    styleSheet.type = "text/css";
	    styleSheet.innerText = styles;
	    styleSheet.id = 'tag-buddy-styles';
	    document.head.appendChild(styleSheet);
	}

}