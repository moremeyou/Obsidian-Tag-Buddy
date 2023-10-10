import { TBSettingsTab } from "./settings";
import { App, debounce, Editor, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { htmlToMarkdown } from './utils';
import { getTagsFromApp } from './utils';
//import { showTagSelector } from './ui'; // need to give these files reference to the plugin
interface TBSettings {
	removeOnClick: boolean; // ctrl
	removeChildTagsFirst; // 
	optToConvert: boolean; //alt
	mobileTagSearch: boolean; 
	mobileNotices: boolean; 
	tagSummaryButtonsNotices: boolean; 
	taggedParagraphCopyPrefix: string;
	recentlyAddedTags: string;
	lockRecentTags: boolean;
	debugMode: boolean;
}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, // when true, cmd is needed when clicking to remove the tag
	removeChildTagsFirst: true, // use shift when false
	optToConvert: true, // when false, clicking tag will do nothing
	mobileTagSearch: false, // toggle on use double tap for search. press+hold will then remove.
	mobileNotices: true,
	tagSummaryButtonsNotices: true,
	taggedParagraphCopyPrefix: '- ',
	recentlyAddedTags: '',
	lockRecentTags: false,
	debugMode: false,
}; 

export default class TagBuddy extends Plugin {  
	settings: TBSettings;

	onunload() { // I think all the cleanup is done automatically the way I register everthing. 
	} 

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TBSettingsTab(this.app, this));	
		
		console.log('Tag Buddy Plugin loaded on ' + (this.app.isMobile?'mobile at ':'desktop at ') + new Date().toUTCString().substring(17));
		
		this.injectStyles();

		const debouncedProcessTags = this.debounce(this.processTags.bind(this), 500);

		this.app.workspace.onLayoutReady(async () => {

			// Need to figure out how to get the current mouse position
			/*this.addCommand({
			    id: 'open-tag-selector',
			    name: 'Tag Buddy: Add tag at mouse position',
			    callback: (event) => {
			         setTimeout(() => {
			            const x = event.clientX;
			            const y = event.clientY;
			            this.showTagSelector(x, y);
			        }, 50);
			    }
			});*/ 

			// this.reload(); // no need for this atm.
			setTimeout(async () => { this.processTags(); }, 500)
			

		    this.registerEvent( this.app.workspace.on('active-leaf-change', async () => { 
		    	//console.log('active leaf change'); 
	    		this.registerDomEvent(document, 'contextmenu', async (event: MouseEvent) => {
	    			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			        if (view && this.ctrlCmdKey (event) && (view.getMode() == 'preview')) {
			            event.preventDefault();

			            const file = await this.app.workspace.getActiveFile();

			            this.showTagSelector(event.pageX, event.pageY, file);
			        }
			    });
		    }));

			// Don't need this event because we'll always need to switch between views to edit note and affect the tag indices.
			// this.registerEvent(this.app.workspace.on('editor-change', debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)));
			// This event is best because we always need to switch modes to edit note or interact with tag (reading mode).
			// this.registerEvent(this.app.workspace.on("editor-menu", this.onEditorMenu, this));
			// this.registerEvent( this.app.workspace.on('editor-menu', debounce(async () => { console.log('active leaf change'); this.processTags(); }, 300, true)) );

			this.registerEvent( this.app.on('layout-change', (event: EditorEvent) => {  
				//setTimeout(async () => { 
				 //console.log('layout change'); 
					//this.processTags(); 
					debouncedProcessTags();
				//}, 300); 
			}));
			
			// There is a little redundancy here because we also get layout events when switching files
			this.registerEvent(this.app.on('file-open', async (event: EditorEvent) => { 
				//setTimeout(async () => { 
				 //console.log('file open'); 
					//this.processTags(); 
					debouncedProcessTags();
				//}, 1000); 
			}));

			

			if (!this.app.isMobile) {

				// This event handles all the interactions on desktop
				this.registerDomEvent(document, 'click', this.onClickEvent.bind(this), true);

			} else { // Mobile interaction

				// This event catches all taps on mobile because we have custom double-tap and press-hold events.
				// But we only stop all other system events if this click was on a tag. Then we takeover. 
				this.registerDomEvent(document, 'click', (e) => { 
					const isTag = e.target.classList.contains('tag');
					if (isTag && !this.settings.mobileTagSearch) {
						//new Notice ('stop prop')
						e.stopPropagation();
					}
				}, true);

				new PressAndHoldHandler(this, document, this.onClickEvent.bind(this));
				new DoubleTapHandler(this, document, this.onClickEvent.bind(this));
			}	
			
		});

		// Tag summary code block
		this.registerMarkdownCodeBlockProcessor("tag-summary", this.summaryCodeBlockProcessor.bind(this));
	}

	async onClickEvent (event) {
		
		// Support for different views? 
		// If tag has no context properties, then try to figure out where it is?
		// Or maybe there's a way to have obsidian add the properties globally.
		//new Notice ('Tag Buddy event type: ' + event.type);

		//console.log((navigator.platform.toUpperCase().indexOf('MAC') >= 0)?'This is a Mac':'This is not a Mac')

		const target = event.target as HTMLElement;
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);

		// This condition it in case we click on a tag in another plugin like repeat or checklist
		// can't edit tags in these cases. For now.
		if (!view && target.matches('.tag')) { 
			new Notice('Tag Buddy: Can\'t edit tag. Unsupported view type. Try again within that note.');
			return;
		}

		if (view) { 
			if (view.getMode() != 'preview') return;
		} else {
			//if (document.contains('repeat-embedded_note'))
		}
		
		if (!this.app.isMobile) {
			//new Notice ('Tag Buddy event type: ' + event.type);

		if ((this.settings.removeOnClick && this.ctrlCmdKey(event)) || (!this.settings.removeOnClick && !this.ctrlCmdKey(event))) { 
			return; 
		} else if (event.altKey && !this.settings.optToConvert) {  
			return; 
		}

		} else {
			
			if (this.settings.mobileTagSearch && event.type == 'touchend') {
				// if we get this far, this is a double tap
				return;
			}
		}


		
		//if (view && target && target.matches('.tag')) {	
		if (target && target.matches('.tag')) {	
			// const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();

			if (this.settings.removeOnClick || (!this.settings.removeOnClick && this.ctrlCmdKey(event))) {
				event.stopPropagation();
				event.preventDefault();
			}

			const clickedTag = target.closest('.tag'); //event.target as HTMLElement;
			const tag = clickedTag.innerText;

			let tagIndex = clickedTag.getAttribute('md-index');
			let tagFile = clickedTag.getAttribute('file-source');

			if (tagFile) {
				// Try
				//this.editTag (event, tagIndex, tagFile);
				this.editTag (target, event);
			} else {
				// Try again
				setTimeout(async () => {
					tagIndex = clickedTag.getAttribute('md-index');
					tagFile = clickedTag.getAttribute('file-source');
					//this.editTag (event, tagIndex, tagFile);
					this.editTag (target, event);
				}, 300);
			}
			//console.log(clickedTag.getAttribute('type'))

			
		//} else if (view == null && target && target.matches('.tag')) {
		} else if (!view && target.matches('.tag')) {
			new Notice('Tag Buddy: Can\'t edit tag. Might be in an unsupported view type.');
		}
	}

	async editTag (tagEl, event, pragraphEl) {
		//console.log(tagEl)

		const index = tagEl.getAttribute('md-index');
		const filePath = tagEl.getAttribute('file-source');

		//if (this.settings.debugMode) console.log('Tag Buddy edit tag: ' + event.target.innerText + '\nIn file: ' + filePath);
		if (this.settings.debugMode) console.log('Tag Buddy edit tag: ' + tagEl.innerText + '\nIn file: ' + filePath);

		if (filePath) {

			const file: TFile = await this.validateFilePath(filePath); //app.vault.getAbstractFileByPath(filePath);
			let fileContent: String;
			let fileContentBackup: String;
			//const tag: String = event.target.innerText.trim();
			const tag: String = tagEl.innerText.trim();

			try {
				
				fileContent = await this.app.vault.read(file);
				fileContentBackup = fileContent;

			} catch (error) {

				new Notice('Tag Buddy file read error:\n' + error.message);
				return;

			}

			// check if the file has only one tag left (and that's all thats left in the file)
			let safeToEmptyFile = false;
			const tagRegex = /^\s*#(\w+)\s*$/;
			if (tagRegex.test(fileContent.trim())) {
		    	safeToEmptyFile = true;
			}
			
			let beforeTag = fileContent.substring(0, index);
			let afterTag = fileContent.substring((Number(index)+Number(tag.length)+1));

			if (fileContent[index] === '\n') {
    			beforeTag += '\n'; // appending the newline character to beforeTag
			}
			
			//console.log('File content: ', JSON.stringify(fileContent));
			//console.log ('------------------------------------------------');
			//console.log('Before Tag: ', JSON.stringify(beforeTag));
			//console.log ('------------------------------------------------');
			//console.log('The Tag: ', JSON.stringify(tag));
			//console.log ('------------------------------------------------');
			//console.log('After Tag: ', JSON.stringify(afterTag));
	
			let newContent = '';

			//if (this.settings.debugMode) {

				// newContent = beforeTag + ' ⚠️---🫸' + tag + '🫷---⚠️ ' + afterTag;
				//newContent = beforeTag + ' ⚠️---➡️' + tag + afterTag;

			//} else

			////////////////////////////////////////////////////////////////
			// SUPER MESSY. NEED TO REFACTOR
			////////////////////////////////////////////////////////////////

			if (!event) { // then we're calling this method from a button. need to rethink how this is organized.
				
				newContent = beforeTag + afterTag;

			} else if (event.altKey || ((event.type == 'touchstart') && !this.settings.mobileTagSearch)) { 

				// Remove the hash only

				const noHash = tag.substring(1);
				newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + noHash + afterTag;
				
				if (this.app.isMobile && this.settings.mobileNotices) { new Notice ('Tag Buddy: ' + tag + ' converted to text.'); }
				// Setting: make this a setting to show notices on mobile
			
			} else if (((event.type == 'touchend') || this.settings.mobileTagSearch) || (this.ctrlCmdKey(event) && !this.settings.removeOnClick) || (!this.ctrlCmdKey(event) && this.settings.removeOnClick)) {

				// Remove tag (or child first, if exists)

				let parentTag = '';

				if (tag.includes('/') && (this.settings.removeChildTagsFirst || (event.shiftKey && !this.settings.removeChildTagsFirst))) {
					
					let parts = tag.split('/');
					const removedChild = parts.pop();
					parentTag = parts.join('/');
					newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + parentTag + afterTag;

					if (this.app.isMobile && this.settings.mobileNotices) { new Notice ('Tag Buddy: \'' + removedChild + '\' removed from parent tag.'); }
				
				} else {
					newContent = beforeTag + afterTag;
					if (this.app.isMobile && this.settings.mobileNotices) { new Notice ('Tag Buddy: ' + tag + ' removed.'); }
				}
			} 
			// File safety checks
			if ((newContent == '' && !safeToEmptyFile) || this.contentChangedTooMuch(fileContentBackup, newContent, tag, 2)) {
				// Check if there was only one tag in the file, if so, don't restore backup;
				new Notice('Tag Buddy: File change error.');
				newContent = fileContentBackup;
			} else if (newContent == '' && safeToEmptyFile) {
				new Notice('Tag Buddy: Tag removed. The note is empty.');
			}

			try {
			
				await this.app.vault.modify(file, newContent);
				//console.log('Tag el: ' + tagEl)
				if (tagEl.getAttribute('type') == 'plugin-summary') {
					setTimeout(async () => {
						
						const tagParagraphEl = tagEl.closest('.tag-summary-paragraph');
						//console.log('this is the error')
						const tagSummaryBlock = tagEl.closest('.tag-summary-block');
						
						//const tagsStr = tagSummaryBlock.getAttribute('codeblock-tags');
						//const tags = tagsStr ? tagsStr.split(',') : [];
						//const tagsIncludeStr = tagSummaryBlock.getAttribute('codeblock-tags-include');
						//const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];
						//const tagsToCheck = tags.concat(tagsInclude);
						const tagsToCheck = this.getTagsToCheckFromEl(tagSummaryBlock);

						const tagsInContent = this.tagsInString(tagParagraphEl.innerText);
						//const tagCount = tagsInContent?.length;
						//const tagCount = this.countOccurrences(tagsToCheck, tagsInContent)

						//console.log('tags to check: ' + tagsToCheck)
						

						if (tagsToCheck.includes(tag)) {
							//let tagCount = this.tagsInString(tagParagraphEl.innerText, tag).length;
							const tagCount = this.countOccurrences(tagsToCheck, tagsInContent)
							
							// count all of the occurrences of tags to check against tags in this paragraph
							// not just the one tag

							if (tagCount >= 2) {
								this.updateSummary(tagSummaryBlock); 
								//this.updateSummaries(); // causes screen flicker
							    setTimeout(async () => { this.processTags(); }, 200);
								// this.refreshView(); // no need for this atm
							} else {
								//console.log('last one, will remove paragraph')
								const notice = new Notice ('Last ' + tag + ' removed from paragraph.\n🔗 Open source note.', 5000);
								this.removeElementWithAnimation(tagParagraphEl, () => {
				    				setTimeout(async () => { this.updateSummary(tagSummaryBlock); tagParagraphEl.remove(); }, 500);
									//this.updateSummaries(); // causes screen flicker
							    	setTimeout(async () => { this.processTags(); }, 800);
									// this.refreshView(); // no need for this atm
								});
								this.registerDomEvent(notice.noticeEl, 'click', (e) => {
							 	 	this.app.workspace.openLinkText(filePath, '');
								});
							}
						} else {
							this.updateSummary(tagSummaryBlock); 
							//this.updateSummaries(); // causes screen flicker
						    setTimeout(async () => { this.processTags(); }, 200);
							// this.refreshView(); // no need for this atm
						}

					}, 200);
				} else {
					setTimeout(async () => { this.processTags(); }, 50)
				}	

			} catch (error) {

				try {

					const backupFileName = String(file.name.substring(0, file.name.indexOf('.md')) + ' BACKUP.md');
					vault.create('', backupFileName, fileContentBackup);

					new Notice('Tag Buddy note editing error: ' + error.message + '\n' + backupFileName + ' saved to vault root.');
				
				} catch (error) {

					navigator.clipboard.writeText(fileContentBackup);
					new Notice('Tag Buddy note editing error: ' + error.message + '\nNote content copied to clipboard.');

				}
			} 
		} else {
			this.processTags();
			new Notice('Tag Buddy error: Can\'t identify tag location. Please try again.');
		}
	}

	getTagsToCheckFromEl (tagSummaryEl):Array {
		const tagsStr = tagSummaryEl.getAttribute('codeblock-tags');
		const tags = tagsStr ? tagsStr.split(',') : [];
		const tagsIncludeStr = tagSummaryEl.getAttribute('codeblock-tags-include');
		const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];
		return tags.concat(tagsInclude);
	}

	updateSummary (summaryEl) {
		console.log('Update summary')
		const summaryContainer = summaryEl; //tagEl.closest('.tag-summary-block');
		const tagsStr = summaryContainer.getAttribute('codeblock-tags');
		const tags = tagsStr ? tagsStr.split(',') : [];

		const tagsIncludeStr = summaryContainer.getAttribute('codeblock-tags-include');
		const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];

		const tagsExcludeStr = summaryContainer.getAttribute('codeblock-tags-exclude');
		const tagsExclude = tagsExcludeStr ? tagsExcludeStr.split(',') : [];

		const sectionsStr = summaryContainer.getAttribute('codeblock-sections');
		const sections = sectionsStr ? sectionsStr.split(',') : [];

		const max = Number(summaryContainer.getAttribute('codeblock-max'));

		// Recreate summary after we've edited the file
		this.createSummary(summaryContainer, tags, tagsInclude, tagsExclude, sections, max);

		//setTimeout(async () => { this.processTags(); }, 200);
	}

	/*async updateSummariess () {
		//const activeFile = await this.app.workspace.getActiveFile();
		//const fileContent = await app.vault.read(activeFile);
		const activeNoteContainer = await this.app.workspace.activeLeaf.containerEl;
		const embeds = await activeNoteContainer.querySelectorAll('.tag-summary-block');
		//let embededTagFiles = [];

		embeds.forEach(async (embed) => {
			if (embed.classList.contains('tag-summary-block')) {
				this.updateSummary (embed);
			}
		});
	}*/

	async processTags () {

		if (this.settings.debugMode) console.log('Tag Buddy: Processing tags.');
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		if (view) {
			//setTimeout(async () => { 
			const activeNoteContainer = await this.app.workspace.activeLeaf.containerEl;
			//const activeNoteContainer = await document.querySelector('.view-content');
			//}, 200)
			//setTimeout(async () => { // All these timeouts were for testing. Issues seems to be resolved now.
			const activeFile = await this.app.workspace.getActiveFile();
			const fileContent = await app.vault.read(activeFile);
			const activeFileTagElements = await activeNoteContainer.querySelectorAll('.mod-active .tag:not(.markdown-embed .tag):not(.tag-summary-block .tag)');

			//setTimeout(async () => { console.log(activeFileTagElements)}, 1000)
			const activeFileTags = await this.getMarkdownTags(activeFile, fileContent);
			if (activeFileTags.length > 0) this.assignMarkdownTags(activeFileTags, activeFileTagElements, 0, 'active');
			this.processEmbeds(activeNoteContainer);
			//}, 500)
		}
	}

	async getMarkdownTags (file, fileContent) {
		const tagPositions = [];
		let match;
		const regex = /(?:^|\s)#[^\s#]+|```/g; // Adjusted the regex to also match code block delimiters
		let insideCodeBlock = false;

		while ((match = regex.exec(fileContent)) !== null) {
		    if (match[0].trim() === "```") {
		        insideCodeBlock = !insideCodeBlock; 
		        continue;
		    }
		    
		    if (insideCodeBlock) continue;

		    const tag = match[0].trim();
		    // Look ahead from the current match and see if it's followed by ]]
		    if (fileContent.slice(match.index, match.index + tag.length + 2).endsWith("]]")) {
		        continue; // Skip this match as it's part of a wikilink
		    }
		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
		    //console.log(tagPositions[tagPositions.length-1])
		}
		//console.log('markdown tag count: ' + tagPositions.length)

		return tagPositions;
	}

	assignMarkdownTags (tagPositions, tagElements, startIndex, type) {
		//console.log('------------------------------')
		let tagEl;
		const tagElArray = Array.from(tagElements);
		let tagElIndex = 0;
		//tagPositions.forEach(item => console.log(item.index, item.tag));
		tagPositions.forEach((tagPos, i) => {
			if (tagPositions[i].index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
				if (tagEl) {
					//console.log(tagEl, tagPositions[i].tag, tagPositions[i].index);
        			tagEl.setAttribute('md-index', tagPositions[i].index);
        			tagEl.setAttribute('file-source', tagPositions[i].source);
        			tagEl.setAttribute('type', type);
        			//tagElIndex++;
        		} 
        		tagElIndex++;
    		} 
		}); 
		return tagElArray; //Array.from(tagElements); 
	}

	async processEmbeds (element, ids=['tag-summary-block', 'markdown-embed']) {
 		//const embeds = await element.querySelectorAll('.mod-active .tag:not(.markdown-embed .tag):not(.tag-summary-block .tag)');
		
		const embeds = await element.querySelectorAll('.tag-summary-block, .markdown-embed');
		//let embededTagFiles = [];

		embeds.forEach(async (embed) => {
			//if (embed.classList.contains('tag-summary-block') && ids.includes('tag-summary-block')) {
			if (embed.classList.contains('tag-summary-block')) {
				//console.log('process summary')
				this.processTagSummary(embed);	

			//} else if (embed.classList.contains('markdown-embed') && ids.includes('markdown-embed')) {
			} else if (embed.classList.contains('markdown-embed')) {

				this.processNativeEmbed(embed);
				
				if (Array.from(embed.querySelectorAll('.tag-summary-block')).length > 0) {
					this.processTagSummary(embed);
				}
				
			} else {
				//new Notice('Tag Buddy: Tag embed in unsupported element.');
				// Handle this issue on click.
			}
		});
		//return embededTagFiles;
	}

	async processNativeEmbed (embed) {

		const linkElement = embed.getAttribute('src'); //this.findAncestor(clickedTag, 'span')
		let filePath = embed.getAttribute('src');
		const linkArray = filePath.split('#');
		filePath = linkArray[0].trim() + '.md';
		const file = await this.validateFilePath(filePath)
		if (file) {
			const fileContent = await app.vault.read(file);
			const embededTagFile = await this.getMarkdownTags(file, fileContent)
			//embededTagFiles.push(embededTagFile);
			
			const tempComponent = new TempComponent();
			const tempContainerHTML = createEl("div");
			
			await MarkdownRenderer.renderMarkdown(fileContent, tempContainerHTML, file.path, tempComponent);
			
			//const innerText = this.cleanString(embed.querySelector('.markdown-embed-content').innerText);
			//const startIndex = this.cleanString(tempContainerHTML.innerText).indexOf(innerText);
			const innerText = embed.querySelector('.markdown-embed-content').innerText;
			const startIndex = tempContainerHTML.innerText.indexOf(innerText);
			
			this.assignMarkdownTags(embededTagFile, embed.querySelectorAll('.tag'), startIndex, 'native-embed');
		}
	}

	async processTagSummary (embed) {
		let summaryBlocks = embed.querySelectorAll('blockquote'); 
		summaryBlocks.forEach(async (block, index) => {

			const filePath = block.getAttribute('file-source'); // linkElement.getAttribute('data-href')
			const file = this.app.vault.getAbstractFileByPath(filePath);
			const tempComponent = new TempComponent();

			if (file) {
				const fileContent = await app.vault.read(file);
				const embededTagFile = await this.getMarkdownTags(file, fileContent);
				
				// Create a temporty element block so we can match match text only content of this element with it's source note
				const tempBlock = block.cloneNode(true);
				//tempBlock.querySelector('br')?.remove();
				//tempBlock.querySelector('strong')?.remove(); 
				tempBlock.querySelector('.tagsummary-item-title')?.remove(); 
				tempBlock.querySelector('.tagsummary-buttons')?.remove(); 
				//const blockText = this.cleanString(tempBlock.innerText); // fuck this bug!
				//const startIndex = this.cleanString(fileContent).indexOf(blockText)
				const markdownBlock = htmlToMarkdown(tempBlock).trim();
				const blockText = markdownBlock; //tempBlock.innerText.trim();
				const startIndex = fileContent.indexOf(markdownBlock);
				//const tempDom = createEl('div'); 
				//await MarkdownRenderer.renderMarkdown(fileContent, tempDom, '', tempComponent);
				//const tempContent = tempDom.innerText
				/*console.log(fileContent)
				console.log('----------------')
				console.log(JSON.stringify(markdownBlock)) //console.log(blockText)
				console.log('----------------')
				console.log(fileContent.indexOf(markdownBlock))*/
				// htmlToMarkdown(summaryContainer.innerHTML)

				//console.log(startIndex)
				this.assignMarkdownTags(embededTagFile, block.querySelectorAll('.tag'), startIndex, 'plugin-summary');
			}
		});		
	}

	async summaryCodeBlockProcessor (source, el, ctx) {
		// Initialize tag list
		let tags: string[] = Array();
		let include: string[] = Array();
		let exclude: string[] = Array();
		let sections: string[] = Array();
		let max: number = 50;
		const maxPattern = /^\s*max:\s*(\d+)\s*$/;
		let match;

		// Process rows inside codeblock
		const rows = source.split("\n").filter((row) => row.length > 0);
		rows.forEach((line) => {
			// Check if the line specifies the tags (OR)
			if (line.match(/^\s*tags:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*tags:/, "").trim();

				// Get the list of valid tags and assign them to the tags variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				tags = list;
			}

			// Check if the line specifies the tags to include (AND)
			if (line.match(/^\s*include:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*include:/, "").trim();

				// Get the list of valid tags and assign them to the include variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				include = list;
			}

			// Check if the line specifies the tags to exclude (NOT)
			if (line.match(/^\s*exclude:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*exclude:/, "").trim();

				// Get the list of valid tags and assign them to the exclude variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				exclude = list;
			}

			// Check if the line specifies sections of a note
			if (line.match(/^\s*sections:[\p{L}0-9_\-/#, ]+$/gu)) {
				const content = line.replace(/^\s*sections:/, "").trim();
				// Get the list of sections and assign them to the sections variable
				let list = content.split(',').map((sec) => sec.trim());
				sections = list;
			}

			// Check if the line specifies max number of blocks to display
			match = line.match(maxPattern);
			if (match) {
    			max = Math.min(50, Number(match[1]));
			}
		});

		// Create summary only if the user specified some tags
		if (tags.length > 0 || include.length > 0) {
			await this.createSummary(el, tags, include, exclude, sections, max, ctx.sourcePath);
		} else {
			this.createEmptySummary(el, tags?tags:[], include?include:[], exclude?exclude:[], sections?sections:[], max?max:[], ctx.sourcePath?ctx.sourcePath:'');
		} 
	}; 

	createEmptySummary(element: HTMLElement, tags: String[], include: string[], exclude: string[], sections: string[], max: number, filePath: string) {
		const container = createEl('div');
		//const buttonContainer = createEl('div');
		//buttonContainer.setAttribute('class', 'tagsummary-buttons');
		const textDiv = createEl("blockquote");
		//container.setAttribute('class', 'tagsummary-notags');
		textDiv.innerHTML = "There are no files with tagged paragraphs that match the tags:<br>" + (tags.length>0?tags.join(', '):"No tags specified.") + "<br>";
		container.appendChild(textDiv);
		//const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		//const switchModeButton = this.makeSwitchToEditingButton (view);
		//container.appendChild(switchModeButton);
		//console.log(include.length)
		container.setAttribute('codeblock-tags', ((tags.length>0)?tags.join(','):''));
		container.setAttribute('codeblock-tags-include', (include?include.join(','):''));
		container.setAttribute('codeblock-tags-exclude', (exclude?exclude.join(','):''));
		container.setAttribute('codeblock-sections', (sections?sections.join(','):''));
		container.setAttribute('codeblock-max', max);
		if (this.settings.debugMode) container.appendChild(this.makeSummaryRefreshButton(container));;

		element.replaceWith(container);
	}

	async createSummary(
		element: HTMLElement, 
		tags: string[], 
		include: string[], 
		exclude: string[], 
		sections: string[],
		max: number, 
		filePath: string) {
		
		const activeFile = await this.app.workspace.getActiveFile();
		const validTags = tags.concat(include); // All the tags selected by the user
		const tempComponent = new TempComponent();
		const summaryContainer = createEl('div');
		
		summaryContainer.setAttribute('class', 'tag-summary-block');
		
		// Get files
		let listFiles = this.app.vault.getMarkdownFiles();

		// Filter files
		listFiles = listFiles.filter((file) => {
			// Remove files that do not contain the tags selected by the user
			const cache = app.metadataCache.getFileCache(file);
			const tagsInFile = getAllTags(cache);

			if (validTags.some((value) => tagsInFile.includes(value))) {
				return true;
			}
			return false;
        });

		// Sort files alphabetically
		// change to sort by last modified?
		listFiles = listFiles.sort((file1, file2) => {
			if (file1.path < file2.path) {
				return -1;
			} else if (file1.path > file2.path) {
				return 1;
			} else {
				return 0;
			}
		});

		// Get files content
		let listContents: [TFile, string][] = await this.readFiles(listFiles);
		let count = 0;

		// Create summary
		let summary: string = "";
		listContents.forEach((item) => {
			//if (count >= max) return;

			// Get files name
			const fileName = item[0].name.replace(/.md$/g, "");
			const filePath = item[0].path;
			//console.log(activeFile)
			// Do not add this item if it's in the same file we're creating the summary
			if (activeFile) {
				if (activeFile.name == item[0].name) return;
			}

			// Get paragraphs
			let listParagraphs: string[] = Array();
			const blocks = item[1].split(/\n\s*\n/).filter((row) => row.trim().length > 0);

			// Get list items
			blocks.forEach((paragraph) => {
				
				// Check if the paragraph is another plugin
				let valid = false;
				let listTags = paragraph.match(/#[\p{L}0-9_\-/#]+/gu);
				
				if (listTags != null && listTags.length > 0) {
					//console.log('paragraph.contains("```") : ' + paragraph.contains("```"))
					if (!paragraph.contains("```")) {
						//console.log(include)
						valid = this.isValidText(listTags, tags, include, exclude);
						//console.log(valid)
					}
				}

				if (valid) {
					// Add paragraphs and the items of a list
					let listItems: string[] = Array();
					let itemText = "";

					paragraph.split('\n\s*\n').forEach((line) => {
						if (count >= max) return;
						let isList = false;
						isList = line.search(/(\s*[\-\+\*]){1}|([0-9]\.){1}\s+/) != -1

						if (!isList) {
							// Add normal paragraphs
							listParagraphs.push(line);
							itemText = "";
						} else {
							line.split('\n').forEach((itemLine) => {
								// Get the item's level
								let level = 0;
								const endIndex = itemLine.search(/[\-\+\*]{1}|([0-9]\.){1}\s+/);
								const tabText = itemLine.slice(0, endIndex);
								const tabs = tabText.match(/\t/g);
								if (tabs) {
									level = tabs.length;
								}
								// Get items tree
								if (level == 0) {
									if (itemText != "") {
										listItems.push(itemText);
										itemText = "";
									}
									itemText = "" + itemText.concat(itemLine + "\n");
									// Removed include children setting
								} else if (level > 0 && itemText != "") {
									itemText = itemText.concat(itemLine + "\n");
								}
							});
						}
						count++
					});

					if (itemText != "") {
						listItems.push(itemText);
						itemText = "";
					}

					// Check tags on the items
					listItems.forEach((line) => {
						listTags = line.match(/#[\p{L}0-9_\-/#]+/gu);
						if (listTags != null && listTags.length > 0) {
							if (this.isValidText(listTags, tags, include, exclude)) {
								listParagraphs.push(line);
							}
						}
					});
				}
				
				
			})

			// Process each block of text
			listParagraphs.forEach(async(paragraph) => {
				// Restore newline at the end
				paragraph += "\n";
				var regex = new RegExp;

				// Check which tag matches in this paragraph.
				var tagText = new String;
				var tagSection = null;
				tags.forEach((tag) => {
					tagText = tag.replace('#', '\\#');
					regex = new RegExp(`${tagText}(\\W|$)`, 'g');
              		if (paragraph.match(regex) != null) { 
              			tagSection = tag
              		} 
            	});
          		
          		const buttonContainer = createEl('div');
          		buttonContainer.setAttribute('class', 'tagsummary-buttons')
          		const paragraphEl = createEl("blockquote");
				paragraphEl.setAttribute('file-source', filePath);
				paragraphEl.setAttribute('class', 'tag-summary-paragraph');

				////////////////////////////////////////////////////////////////
				//  MESSY! Lots of refactoring to be done in this function
				////////////////////////////////////////////////////////////////

				// Add link to original note. Tag Buddy added deep linking.
				const blockLink = paragraph.match(/\^[\p{L}0-9_\-/^]+/gu); 
				let link;
				//console.log(filePath, fileName)
        		if (blockLink) { 
        			//paragraph = "**[[" + filePath + "#" + blockLink + "|" + fileName + "]]**" + paragraph; 
        			link = '[[' + filePath + '#' + blockLink + '|' + fileName + ']]';

        			//if (this.app.plugins.getPlugin('quickadd')) {
						let count = 0;
						sections.forEach((sec) => {
							if (count++ > 3) return; // limit to 4 section buttons for now, for space.
							buttonContainer.appendChild(this.makeCopyToButton (paragraph, sec, paragraphEl, tagSection, (filePath + '#' + blockLink)));
						});
					//}
					if (this.settings.tagSummaryButtonsNotices) {
						buttonContainer.appendChild(this.makeCopyButton(paragraph.trim()));
        				buttonContainer.appendChild(this.makeRemoveTagButton(paragraphEl, tagSection, (filePath + '#' + blockLink)));
        			}

        		} else { 
        			//paragraph = "**[[" + filePath + "|" + fileName + "]]**" + paragraph; 
        			link = '[[' + filePath + '|' + fileName + ']]';

        			//if (this.app.plugins.getPlugin('quickadd')) {
						let count = 0;
						sections.forEach((sec) => {
							if (count++ > 3) return; // limit to 4 section buttons for now, for space.
							if (this.settings.tagSummaryButtonsNotices) buttonContainer.appendChild(this.makeCopyToButton (paragraph, sec, paragraphEl, tagSection, filePath));
						});
					//}
					if (this.settings.tagSummaryButtonsNotices) {
						buttonContainer.appendChild(this.makeCopyButton(paragraph.trim()));
        				buttonContainer.appendChild(this.makeRemoveTagButton(paragraphEl, tagSection, filePath));
        			}
        		}

        		paragraph = '**' + link + '**\n' + paragraph;
            	//paragraph += "\n";
          		summary += paragraph;

          		//const tempEl = await createEl('div');
          		//await MarkdownRenderer.renderMarkdown(paragraph, tempEl,'', tempComponent);
          		//await MarkdownRenderer.renderMarkdown(paragraph, paragraphEl, this.app.workspace.getActiveFile()?.path, tempComponent);
          		//await MarkdownRenderer.renderMarkdown(paragraph, paragraphEl, '', tempComponent);
          		await MarkdownRenderer.renderMarkdown(paragraph, paragraphEl, '', tempComponent);
          		//console.log(paragraph);
          		//console.log('-------------------------')
          		//console.log(paragraphEl.innerHTML)

          		const titleEl = createEl('span');
          		titleEl.setAttribute('class', 'tagsummary-item-title');
          		titleEl.appendChild(paragraphEl.querySelector('strong').cloneNode(true))
          		if (this.settings.tagSummaryButtonsNotices) paragraphEl.appendChild(buttonContainer);
          		paragraphEl.querySelector('strong').replaceWith(titleEl)

          		summaryContainer.appendChild(paragraphEl);
			});
			//count++
		});
		
		setTimeout(async () => { 
			if (this.settings.debugMode) summaryContainer.appendChild(this.makeSummaryRefreshButton(summaryContainer));
			summaryContainer.appendChild(createEl('hr')); 
		}, 0);
		
		// Add Summary
		if (summary != "") {
			summaryContainer.setAttribute('codeblock-tags', tags.join(','));
			summaryContainer.setAttribute('codeblock-tags-include', ((include.length>0)?include.join(','):''));
			summaryContainer.setAttribute('codeblock-tags-exclude', ((exclude.length>0)?exclude.join(','):''));
			summaryContainer.setAttribute('codeblock-sections', ((sections.length>0)?sections.join(','):''));
			summaryContainer.setAttribute('codeblock-max', max);

			// await MarkdownRenderer.renderMarkdown(htmlToMarkdown(summaryContainer.innerHTML), summaryContainer, '', tempComponent);
			element.replaceWith(summaryContainer);
		} else {
			this.createEmptySummary(element, tags);
		}
	}

	/*makeSwitchToEditingButton (view){
		const button = this.makeButton ('Edit code block in edit-mode', async(e) => { 
			e.stopPropagation();
			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view.getMode() == 'preview') {
      			let curState = view.getState();
      			curState.mode = 'source';
      			view.setState(curState);
    		}
		});
		button.title = 'Switch to edit mode';
		return button;
	}*/

	makeSummaryRefreshButton (summaryEl) {	
		const button = this.makeButton (' ↺   Refresh', (e) => { 
			e.stopPropagation();
			this.updateSummary(summaryEl)
			setTimeout(async () => { this.processTags(); }, 10);
		});
		button.title = 'Refresh Tag Summary';
		return button;
	}

	makeCopyToButton (content, section, paragraph, tag, filePath) {
		//const quickAddPlugin = this.app.plugins.plugins.quickadd.api; // need to check if this plugin is installed. and settings.
		const buttonLabel = (' ❏   ' + this.truncateStringAtWord(section, 16));
		const button = this.makeButton (buttonLabel, async(e) => { 
			e.stopPropagation();
			const prefix = this.settings.taggedParagraphCopyPrefix;
			const newContent = prefix + (this.ctrlCmdKey(e) ? this.removeTagFromString(content, tag) : content).trim();
			const copySuccess = this.copyTextToSection(newContent, section, filePath);
			//quickAddPlugin.executeChoice('Copy To Section', {section:sectionElObj.md, content:(this.removeTagFromString(contentAsList, tag)+'\n')});

			if (copySuccess) {
				/*if (this.ctrlCmdKey(e)) {
					

					// This will be replaced with the new insert/remove/whatever logic. 
					// We can't keep hacking these methods together.
					// So for now we'll just remove all the tags from the copied paragraph and not modify the original file.


					this.editTag (this.getTagElement(paragraph, tag));
					const notice = new Notice ('Copied to ' + section + ' and ' + tag + ' removed.\n🔗 Open source note.', 5000);
					this.registerDomEvent(notice.noticeEl, 'click', (e) => {
						this.app.workspace.openLinkText(filePath, '');
		 			});
				} else {*/
					new Notice ('Tag Buddy: Paragraph copied to ' + section + '.');
				//}
			} else {
				// errors currently from from the copy to. Will refactor.
			}

		});

		button.title = 'Copy paragraph to ' + section + '.\nCTRL/CMD+CLICK to remove tag(s) then copy.';
		return button;
	}

	makeCopyButton (content) {	
		const button = this.makeButton (' ❏ ', (e) => { 
			e.stopPropagation();
			navigator.clipboard.writeText(content);
			new Notice ('Tag Buddy: Copied to clipboard.');
		});
		button.title = 'Copy paragraph to clipboard.';
		return button;
	}

	/*tagsInString (string:string, tag:string=''):Array {
		const regex = new RegExp(tag.replace(/\//g, '\\/') + "(?![\\w\\/\\#])", "g");
		const matches = string.match(regex);
		console.log(matches)
		return matches || []; //matches ? matches.length : 0;
	}*/
	tagsInString(string: string, tag?: string): string[] {
	    let regex;

	    if (tag) {
	        regex = new RegExp(tag.replace(/\//g, '\\/') + "(?![\\w\\/\\#])", "g");
	    } else {
	        // Match any tag-like pattern starting with '#'
	        regex = /#(\w+)(?![\w\/#])/g;
	    }

	    const matches = string.match(regex);
	    return matches || [];
	}

	countOccurrences(summaryTags, contentTags) {
	    let count = 0;
	    //console.log (summaryTags, contentTags);
	    for (let tag of summaryTags) {
	        count += contentTags.filter(item => item === tag).length;
	    }

	    return count;
	}

	makeRemoveTagButton (paragraphEl, tag, filePath) {
		const button = this.makeButton (' ⌗ˣ ', (e) => { 
			e.stopPropagation();

			//const tagsToCheck = this.getTagsToCheckFromEl(paragraphEl.closest('.tag-summary-block'));
			//const tagsInContent = this.tagsInString(paragraphEl.innerText);
			//const tagCount = tagsInContent?.length;
			//const tagCount = this.countOccurrences(tagsToCheck, tagsInContent)

			//console.log('summary tags left: ' + tagCount)

			const tagEl = this.getTagElement(paragraphEl, tag);
			this.editTag(tagEl);
			/*if (tagCount >= 2 ) {
				//console.log('more than one left')
    			this.editTag(tagEl);
			} else {
				//console.log('last one, will remove paragraph')
				const notice = new Notice ('🔖 ' + tag + ' removed from paragraph.\n🔗 Open source note.', 5000);
				this.removeElementWithAnimation(paragraphEl, () => {
    				this.editTag(tagEl);
				});
				this.registerDomEvent(notice.noticeEl, 'click', (e) => {
			 	 	this.app.workspace.openLinkText(filePath, '');
				});
			}*/
		});
		button.title = 'Remove ' + tag + ' from paragraph (and from this summary).';
		return button;
	}

	removeElementWithAnimation(el, callback) {
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
	  
	  el.addEventListener('transitionend', function onEnd() {
    		el.removeEventListener('transitionend', onEnd);
    		callback();
	    	//setTimeout(() => { el.remove(); }, 10); // remove in the callback
	  });
	}

	makeButton (lable, clickFn, classId='tagsummary-button') {
		const button = document.createElement('button');
	    button.innerText = lable;
	    button.className = classId;
	    this.registerDomEvent(button, 'click', clickFn.bind(this));
	    return button;
	}

	getMarkdownHeadings(bodyLines: string[]): Heading[] {
		const headers: Heading[] = [];
		let accumulatedIndex = 0;

		bodyLines.forEach((line, index) => {
			const match = line.match(/^(#+)[\s]?(.*)$/);

			if (match) {
				headers.push({
					fullText: match[0],
					level: match[1].length,
					text: match[2],
					line: index,
					startIndex: accumulatedIndex,
	        		endIndex: (accumulatedIndex + match[0].length - 1)
				});
			}
			accumulatedIndex += line.length + 1;
		});

		return headers;
	}

	getLinesInString(input: string) {
		const lines: string[] = [];
		let tempString = input;

		while (tempString.includes("\n")) {
			const lineEndIndex = tempString.indexOf("\n");
			lines.push(tempString.slice(0, lineEndIndex));
			tempString = tempString.slice(lineEndIndex + 1);
		}
		lines.push(tempString);

		return lines;
	}

	insertTextAfterLine(text: string, body: string, line: number, filePath): string {
		const splitContent = body.split("\n");
		const pre = splitContent.slice(0, line + 1).join("\n");
		const post = splitContent.slice(line + 1).join("\n");

		return `${pre}\n${text}\n${post}`;
	}

	async copyTextToSection(text, section, filePath){
		//console.log(filePath)
		const file = await this.app.workspace.getActiveFile();
		const fileContent = await this.app.vault.read(file);
		const fileContentLines: string[] = this.getLinesInString(fileContent);
		const mdHeadings = this.getMarkdownHeadings(fileContentLines);
		if (mdHeadings.length > 0) { // if there are any headings
			const headingObj = mdHeadings.find(heading => heading.text.trim() === section);
			if (headingObj) {
				const textWithLink = text + ` [[${filePath}|🔗]]`
				//let newContent = this.insertTextAfterLine(text, fileContent, headingObj.line);
				let newContent = this.insertTextAfterLine(textWithLink, fileContent, headingObj.line);
				await this.app.vault.modify(file, newContent);
				return true;
			} else {
				new Notice (`Tag Buddy: ${section} not found.`);
				return false;
			}
		} else {
			new Notice ('Tag Buddy: There are no header sections in this note.');
			return false;
		}
	}

	removeTagFromString(inputText, hashtagToRemove, all:boolean=true) {
	    // Use a regular expression to globally replace the hashtag with an empty string
	    console.log('Tag to remove: ' + hashtagToRemove)
	    //const regex = new RegExp("\\s?" + hashtagToRemove + "\\b", all?"gi":"i");
	    const regex = new RegExp("\\s?" + hashtagToRemove.replace(/#/g, '\\#') + "(?!\\w|\\/)", all?"gi":"i");
	    return inputText.replace(regex, '').trim();
	}

	/*getSectionTitleWithHashes(sectionTitle) {
	    const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
	    if (!activeView) {
	        console.log('No active markdown view found.');
	        return null;
	    }

	    const contentEl = activeView.contentEl;

	    // Get all heading elements
	    // This doesn't work with super long notes. 
	    const headings = contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6');
	    //const headings = await contentEl.getElementsByClassName('h1, h2, h3, h4, h5, h6');
	    
	    //console.log(headings)
	    for (const heading of headings) {
	        if (heading.textContent.trim() === sectionTitle.trim()) {
	            // Determine the number of hashes based on the heading level
	            const level = parseInt(heading.tagName.substr(1), 10);  // e.g., "H2" -> 2
	            const hashes = '#'.repeat(level);
	            //console.log(heading);
	            return {md:`${hashes} ${sectionTitle}`, el:heading};
	        }
	    }

	    console.log(`Section "${sectionTitle}" not found.`);
	    return null;
	}*/

	truncateStringAtWord(str, maxChars) {
	    if (str.length <= maxChars) return str;
	    let truncated = str.substr(0, maxChars);  
	    const lastSpace = truncated.lastIndexOf(' '); 
	    if (lastSpace > 0) truncated = truncated.substr(0, lastSpace); // Truncate at the last full word
	    return truncated
	}

	async readFiles(listFiles: TFile[]): Promise<[TFile, string][]> {
		let list: [TFile, string][] = [];
		for (let t = 0; t < listFiles.length; t += 1) {
			const file = listFiles[t];
			let content = await this.app.vault.cachedRead(file);
			list.push([file, content]);
		}
		return list;
	}

	isValidText(listTags: string[], tags: string[], include: string[], exclude: string[]): boolean {
		let valid = true;

		// Check OR (tags)
		if (tags.length > 0) {
			valid = valid && tags.some((value) => listTags.includes(value));
		}
		// Check AND (include)
		if (include.length > 0) {
			valid = valid && include.every((value) => listTags.includes(value));
		}
		// Check NOT (exclude)
		if (valid && exclude.length > 0) {
			valid = !exclude.some((value) => listTags.includes(value));
		}
		return valid;		
	}

	async validateFilePath (filePath) {
		const matchingFiles = await app.vault.getFiles().filter(file => file.name === filePath);
		if (matchingFiles.length === 1) {
			const filePath = matchingFiles[0].path;
			const file = await this.app.vault.getAbstractFileByPath(filePath);
			//console.log('Validate file: ' + embedFile.name);
			return file;
		} else if (matchingFiles.length > 1) {
			new Notice('Tag Buddy: Multiple files found with the same name. Can\'t safely edit tag.');
			return null;
		} else {
			new Notice('Tag Buddy: No file found. Try again, or this tag might be in an unsupported embed type.');
			return null;
		}
	}

	contentChangedTooMuch(original, modified, tag, buffer = 5) {
	  const expectedChange = tag.length; // including the '#' symbol
	  const threshold = expectedChange + buffer; // allow for some minor unintended modifications
	  const actualChange = Math.abs(original.length - modified.length);

	  return actualChange > threshold;
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	isTagValid (tag:string):boolean { // including the #
		const tagPattern = /^#[\w]+$/;
		return tagPattern.test(tag);
	}

	saveRecentTag (tag:string) {

		if (this.isTagValid(tag)) {
			
			const recentTagsString = this.settings.recentlyAddedTags;
			let recentTags:Array;
			if (recentTagsString.indexOf(', ')) {
				recentTags = this.settings.recentlyAddedTags.split(', ');
			} else {
				recentTags = [this.settings.recentlyAddedTags]
			}

			if (recentTags.includes(tag)) {
				recentTags.splice(recentTags.indexOf(tag), 1);
			}

			recentTags.unshift(tag.trim());
			recentTags = recentTags.slice(0, 3);
			this.settings.recentlyAddedTags = recentTags.join(', ');
			this.saveSettings();
		}
	}

	getRecentTags ():Array {
		const recentTags = this.settings.recentlyAddedTags==''?[]:this.settings.recentlyAddedTags.split(', ');
		return recentTags;
	}

	// fuck.this.function
	/*cleanString(input) {
		let cleanedStr;

		// Check if input is a DOM element
		if (input instanceof Element) {
			//console.log('input is: Element');
			cleanedStr = input.outerHTML.trim();
		} else {
			//console.log('input is: String');
			cleanedStr = input.trim();
		}

		// Whitespace normalization
		//cleanedStr = cleanedStr.replace(/\s+/g, ' ');

		// Remove <br> elements
		//cleanedStr = cleanedStr.replace(/<br>/g, ' ');

		// Remove blockquote tags but keep their content
		//cleanedStr = cleanedStr.replace(/<\/?blockquote>/g, '');

		// Remove blockquote tags but keep their content
		//cleanedStr = cleanedStr.replace(/<\/?div>/g, '');

		// Remove spaces between tags
		//cleanedStr = cleanedStr.replace(/>\s+</g, '><');

		// Whitespace normalization
		cleanedStr = cleanedStr.replace(/\s+/g, ' ');

		// HTML entity decoding
		const textArea = document.createElement('textarea');
		textArea.innerHTML = cleanedStr;
		cleanedStr = textArea.value.trim();

		// Optional: convert to lowercase
		// cleanedStr = cleanedStr.toLowerCase();

		return cleanedStr;
	}*/

	/*async refreshView (){
		//console.log('Refresh view.');
		new Notice ('Refresh view.');
		// if using rerender,
		//const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();
		//await view.previewMode.rerender(true);

		await app.workspace.activeLeaf.rebuildView();
		// only needed if we use rerender above. do this on a timeout
		//this.app.workspace.getActiveViewOfType(MarkdownView).previewMode.applyScroll(scrollState);
	}*/

    injectStyles() {
    // Check if the styles have already been injected to avoid duplication
    //if (document.getElementById('my-plugin-styles')) return;

    	const styles = `
        .tagsummary-notags {
        	color: var(--link-color) !important;
        	font-weight: 500 !important;
        	border: 1px solid var(--link-color) !important; 
        	border-radius: 5px !important;
        	padding: 10px 10px;
        }

        .tagsummary-button {

            color: var(--text-primary);
            border: 1px solid var(--text-quote);  // Assuming this is the block quote color
            border-radius: var(--border-radius);
            padding: 2.5px 5px;  // Reduced padding
            font-size: 50%;  // Reduced font size
            transition: background-color 0.3s;
            margin: 0px 3px 0px 0px;
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

		/*@keyframes slideUp {
		  from {
		    height: initial;
		    opacity: 1;
		  }
		  to {
		    height: 0;
		    opacity: 0;
		  }
		}

		blockquote.tag-summary-paragraph.removing {
		  animation: slideUp 0.9s forwards;
		} */

		blockquote.tag-summary-paragraph {
		  /*transition: height 0.2s, opacity 0.2s;*/
		  transition: height 0.3s ease, margin 0.3s ease, padding 0.3s ease, opacity 0.3s ease;
		  overflow: hidden;
		}

		.removing {
		  height: 0 !important;  /* Important to ensure override */
		  opacity: 0;
		  margin: 0;
		  padding: 0;
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
		       border-radius: 4px;
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
		    color: white !important;
		    border: 2px solid var(--divider-color) !important;
		    z-index: 10000 !important;
		    overflow-y: auto !important;
		    /*max-height: 150px !important;*/
		    width: 150px !important;
		    box-shadow: 3px 3px 5px rgba(0, 0, 0, 0.2) !important;
	        border-radius: 8px !important;  // Rounded corners
	        font-family: Arial, sans-serif;  // Common OS font
	        font-size: 12px !important;
	        overflow: hidden !important;  // Hide overflow
			padding-right: 10px !important;  // Adjust padding to make space for scrollbar
			box-sizing: border-box !important; 
		}

		.tag-list {
			overflow-y: auto !important;
		    overflow-x: hidden !important; 
		    padding-right: 8px !important;  // Adjust padding to give space for scrollbar
		    margin-right: -8px !important;  // Adjust margin to move scrollbar into the padding
		    box-sizing: border-box !important; 
		}

		.tag-item {
			padding: 5px 10px 5px 10px !important;  // Adjusted padding
            cursor: pointer !important;
            border-bottom: 1px solid var(--divider-color) !important;  // Separator line
            font-size: 14px !important;
            width: 150px !important;
            /*height: 20px !important;*/
            text-overflow: ellipsis !important;  // Indicate content that overflows with an ellipsis
			white-space: nowrap !important;  // Ensure content does not wrap
			box-sizing: border-box !important; 
		}

		.tag-item:hover {
	        background-color: var(--interactive-accent) !important; // Added ,1 for opacity
	        color: white !important;
	    }
		.tag-item.active {
	        background-color: var(--interactive-accent) !important;
	        color: white !important;
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
	        box-sizing: border-box !important;  // Ensure padding doesn't expand width

    `;

	    const styleSheet = createEl("style");
	    styleSheet.type = "text/css";
	    styleSheet.innerText = styles;
	    styleSheet.id = 'tag-buddy-styles'; // ID to prevent injecting the styles multiple times
	    document.head.appendChild(styleSheet);
	}

	async getEmbedFile (el):TFile {
		let filePath = el.getAttribute('src');
		const linkArray = filePath.split('#');
		filePath = linkArray[0].trim() + '.md';
		const file = await this.validateFilePath(filePath);
		//const fileContent = await this.app.vault.read(file);
		return file; //Content;
	}

	async getSummaryFile (el):TFile {
		const filePath = el.getAttribute('file-source'); 
		const file = await this.app.vault.getAbstractFileByPath(filePath);
		//const fileContent = await this.app.vault.read(file);
		return file;
	}

	showTagSelector(x: number, y: number) {
		// Adjustments for the scrollbar and dynamic height
		const maxTagContainerHeight = 180; // This is a chosen max height, adjust as desired
		const tagItemHeight = 30; // Approximate height of one tag item, adjust based on your styles
		// 30 works perfect based on other padding and margin. 20 breaks it when there's one left.

	    // Remove any existing context menu
    	const existingMenu = document.getElementById('addtag-menu');
    	if (existingMenu) existingMenu.remove();

	    const menuEl = document.createElement('div');
	    menuEl.setAttribute('id', 'addtag-menu');
	    menuEl.classList.add('addtag-menu');
	    menuEl.style.left = `${x}px`;
		menuEl.style.top = `${y}px`;
		//menuEl.style.maxHeight = `${maxTagContainerHeight}px;`;

	    // Create and style the search input field
	    const searchEl = createEl('input');
	    searchEl.setAttribute('type', 'text');
	    //searchEl.setAttribute('id', 'tag-search');
	    searchEl.setAttribute('placeholder', 'Search tags...');
	    
	    menuEl.appendChild(searchEl);
	    // Container for the tags
	    const tagContainer = createEl('div');
	    //tagContainer.setAttribute('id', 'tag-list');
	    tagContainer.classList.add('tag-list');
	    //tagContainer.style.maxHeight = `${maxTagContainerHeight}px;`;
	    //tagContainer.style.setProperty('height', `${maxTagContainerHeight}px`, 'important');
	    tagContainer.style.setProperty('max-height', `${maxTagContainerHeight}px`, 'important');

	    menuEl.appendChild(tagContainer);

		const renderTags = (searchQuery: string) => {
	    	tagContainer.innerHTML = '';  // Clear existing tags
	    	//const filteredTags = this.fetchAllTags().filter(tag => tag.includes(searchQuery));
	    	const filteredTags = this.getTagsFromApp().filter(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
	    	// Set the dynamic height based on the number of results
	    	// +10 needed fixes an unsquashable bug when only one item remains in the search
	    	const dynamicHeight = Math.min(filteredTags.length * tagItemHeight, maxTagContainerHeight)//+10;
	    	
	    
		    filteredTags.forEach((tag, index) => {
		        const itemEl = createEl('div');
		        itemEl.innerText = `${tag}`;
		        itemEl.classList.add('tag-item');
		        itemEl.title = `#${tag}`;
	            if (index === 0) {
	                itemEl.classList.add('active');  // Add active class to the first tag
	            }
	            itemEl.style.setProperty('max-height', `${dynamicHeight}px`, 'important');

		        this.registerDomEvent(itemEl, 'click', (e) => {
		        //itemEl.addEventListener('click', () => {
				    //console.log(`-----> Selected tag: #${tag}`);
				    // Add your logic here to insert the tag into the note
		        	this.addTag('#'+tag, x, y)
				    // Close the menu after selection
				    menuEl.remove();
				}, true);

	        	tagContainer.appendChild(itemEl);
    		});


		    if (filteredTags.length * tagItemHeight > maxTagContainerHeight) {
		        tagContainer.style.overflowY = 'auto !important';
		    } else {
		        tagContainer.style.overflowY = 'hidden !important';
		    }
		};

		// Handle Enter key press
		this.registerDomEvent(searchEl, 'keyup', (e: KeyboardEvent) => {
		//searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
			const searchQuery = (e.target as HTMLInputElement).value.trim();
			const pattern = /^[^\s\p{P}]+$/u; 
			const isValid = pattern.test("example"); 


		    if (e.key === 'Enter') {
		        const activeTag = tagContainer.querySelector('.active');
		        if (activeTag) {
		            //activeTag.click();  // Simulate a click on the active tag
		            this.addTag('#'+activeTag.innerText, x, y);
		        } else if (pattern.test(searchQuery)) {
		        	this.addTag('#'+searchQuery, x, y);
		        }
		        menuEl.remove();
		    }
		});

	    // Initial render
	    renderTags('');

	    // Event listener for search input
	    searchEl.addEventListener('input', (e) => {
	        renderTags((e.target as HTMLInputElement).value);
	    });

		// const debouncedProcessTags = this.debounce(this.processTags.bind(this), 500);

	    // Add the menu to the document
	    document.body.appendChild(menuEl);

	    // Auto-focus on the search input
    	searchEl.focus();

		const closeMenu = (e: MouseEvent | KeyboardEvent) => {
		    if (e instanceof MouseEvent && (e.button === 0 || e.button === 2)) {
		        if (!menuEl.contains(e.target as Node)) {  // Check if the click was outside the menu
		            menuEl.remove();
		            //console.log('Enter 1')

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

		setTimeout(() => {
		    //document.body.addEventListener('click', closeMenu);
		    //document.body.addEventListener('contextmenu', closeMenu);  // Listen for right clicks too
		    //document.body.addEventListener('keydown', closeMenu);
		    this.registerDomEvent(document.body, 'click', closeMenu);
            this.registerDomEvent(document.body, 'contextmenu', closeMenu);
            this.registerDomEvent(document.body, 'keyup', closeMenu);
		}, 0);

		//tagContainer.addEventListener('mousemove', () => {
		this.registerDomEvent(tagContainer, 'mousemove', () => {
		    // Reactivate the hover effect
		    tagContainer.classList.remove('disable-hover');
		    
		    // Find any tag with the 'active' class and remove that class
		    const activeTag = tagContainer.querySelector('.tag-item.active');
		    if (activeTag) {
		        activeTag.classList.remove('active');
		    }
		});

		// Handle Enter key press
		//searchEl.addEventListener('blur', () => {
		this.registerDomEvent(searchEl, 'blur', () => {
		    tagContainer.classList.remove('disable-hover');
		});
	    //searchEl.addEventListener('keydown', (e: KeyboardEvent) => {
		this.registerDomEvent(searchEl, 'keydown', (e: KeyboardEvent) => {
		    const activeTag = tagContainer.querySelector('.active');
		    let nextActiveTag;
		    if (['ArrowUp', 'ArrowDown'].includes(e.key) || e.key.length === 1) { // Check for arrow keys or any single character key press
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
		        //	console.log('Enter 2') // this never happens.
		        //    activeTag.click();
		        //    return;
		       // }
		    }

		    if (nextActiveTag) {
		        if (activeTag) {
		            activeTag.classList.remove('active');
		        }
		        nextActiveTag.classList.add('active');
		        // Ensure the newly active tag is visible
		        nextActiveTag.scrollIntoView({ block: 'nearest' });
		    }
		});
	}


	async addTag (tag:string, x:number, y:number) {

		if (this.settings.debugMode) { console.log('Tag Buddy add'); console.log(x, y, tag); }

		let fileContent:string;
		let file:TFile;
		const clickedTextObj = this.getClickedTextObjFromDoc (x, y);
		const clickedText:string = clickedTextObj?.text;
		const clickedTextIndex:number = clickedTextObj?.index; // this is the index in document, for narrowing down to the word clicked.
		const clickedTextEl:HTMLElement = clickedTextObj?.el;
		let contentSourceType:string = null
		let summaryEl:HTMLElement;
		let embedEl:HTMLElement;

		// is this in a summary or embed?
		// !!!!!!!!! Check for nested embeds/summaries. issues?
		if (clickedTextObj) {

			summaryEl = clickedTextEl.closest('.tag-summary-paragraph');
			embedEl = clickedTextEl.closest('.markdown-embed');

			if (summaryEl) {
				
				file = await this.getSummaryFile(summaryEl);
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'plugin-summary';
				console.log('In a summary')

				//console.log(fileContent)
				
			} else if (embedEl) {
				console.log('In an embed');
				file = await this.getEmbedFile(embedEl);
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'native-embed';
				//console.log(fileContent)

				// !!!!!! we could be in some other kind of embed. Need to be sure about this.
			} else { 
				console.log('In a active file')
				file = await this.app.workspace.getActiveFile();
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'active';
			} 

		} else {
			new Notice ('⚠️ Tag Buddy: Can\'t find text position.\nTry a another text block.');
		    return;
		}


		if (clickedText) {
			//console.log (clickedText);
		} else {
			new Notice ('⚠️ Tag Buddy: Can\'t add tag here.\nTry a bigger text block.')
			return;
		}

		const escapedClickedText = this.escapeRegExp(clickedText);
		const regex = new RegExp(escapedClickedText, "g");  // The "g" flag means "global", so it will find all occurrences
		const matches = fileContent.match(regex);

		if (matches && matches.length > 1) {
		    //console.log(`Found ${matches.length} occurrences of "${pattern}" in "${subject}".`);
		    new Notice ('⚠️ Tag Buddy: Duplicate text blocks found.\nTry a another text block.');
		    return;
		} else if ((matches && matches.length === 0) || !matches) {
			new Notice ('⚠️ Tag Buddy: Can\'t find text position.\nTry a another text block.');
		    return;
		} 

		if (!this.settings.lockRecentTags) this.saveRecentTag (tag); 
		
		const startIndex = regex.exec(fileContent).index; // this is the index in the md source
		const endIndex = startIndex + clickedText.length-1;

		const clickedWordObj = this.getWordObjFromString (clickedText, clickedTextIndex);
		const clickedWord = clickedWordObj.text;
		const clickedWordIndex = clickedWordObj.index;
		
		const newContent = this.insertTextInString(tag, fileContent, startIndex+clickedWordIndex)
		

		// modify file
		//console.log(newContent)
		await this.app.vault.modify(file, newContent);

		if (contentSourceType == 'plugin-summary') {
			const summaryContainer = summaryEl.closest('.tag-summary-block')
			this.updateSummary(summaryContainer); 
		}

		setTimeout(async () => { this.processTags(); }, 200);
	}


	replaceTextInString (replaceText, sourceText, all:boolean=false) {

		const regex = new RegExp(this.escapeRegExp(replaceText), all ? "gi" : "i");
    	return sourceText.replace(regex, newText).trim();

	}

	insertTextInString (newText, sourceText, charPos) { // pass 0 for the start or sourceText.length-1 for the end

		// LATER: Proper white space or line break checking of the area we're adding
		return (sourceText.substring(0, charPos).trim() + ' ' + newText + ' ' + sourceText.substring(charPos)).trim();

	}

	removeTextFromString (removeText, sourceText, all:boolean=false) {

		const regex = new RegExp(this.escapeRegExp(removeText), all ? "gi" : "i");
    	return sourceText.replace(regex, '').trim();

	}

	getWordObjFromString(sourceText, offset):Object {
		let wordRegex = /[^\s]+(?=[.,:!?]?(\s|$))/g;
		let match;
		let index;
		let word = null;
        while ((match = wordRegex.exec(sourceText)) !== null) {
            if (match.index <= offset && offset <= match.index + match[0].length) {
                // This is our word
                //if (!/^[^\p{L}\p{N}]/u.test(match[0]) &&        // Not starting with any non-alphanumeric
                //    !/[^\p{L}\p{N}\s.,:!?]/u.test(match[0]) &&	// Not containing other than allowed chars
                //    !/[.,:!?](?=[^\s$])/u.test(match[0])) {     // If ends with punctuation, following character must be whitespace or end of string
                    word = match[0];
                    index = match.index;
                    break;
            }
           // }
        }
        return {text: word, index: index};
	}

	getClickedTextObjFromDoc(x, y):string {
		const minNodeLength:number = 20;

	    // Get the word under the click position
	    let range, nodeText, offset;

	    // This method is better supported and gives us a range object
	    if (document.caretRangeFromPoint) {
	        range = document.caretRangeFromPoint(x, y);
	        
	        //const containerEl = range.startContainer.parentNode as HTMLElement;
	        //console.log(containerEl.closest('.tag-summary-block'))
	        
	        //console.log(range.startContainer.parentNode.parentNode)
	        

	        if (range.startContainer.nodeType === Node.TEXT_NODE) {
        		nodeText = range.startContainer.nodeValue.trim();
    		} else {
    			console.log ('no text')
    			return null;
    		}
	        offset = range.startOffset;
	    }

	    if (nodeText.length < minNodeLength) {
	    	console.log ('text too short')
	    	return null;
		}

	    return {text: nodeText, index: offset, el: range.startContainer.parentNode};
	}

	/*async getClickedWord(e) {
		//Get the click position
	    let x = e.clientX, y = e.clientY;

	    // Get the word under the click position
	    let range, textNode, offset;

	    // This method is better supported and gives us a range object
	    if (document.caretRangeFromPoint) {
	        range = document.caretRangeFromPoint(x, y);
	        textNode = range.startContainer;
	        offset = range.startOffset;
	    }
	    //console.log(textNode)

	    // LATER, double check different notes types and around the interface

	    // Check if we have a valid text node
	    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
	        // Get the whole text of the clicked node
	        let fullText = textNode.textContent;

	        // LATER: if the word end in valid punctuation, add a space between word and punctuation it when adding the hash.
	        // LATER, have predefined tags we can insert with different key modifiers on click
	        // like, #todo or #inbox #later

	        let wordRegex = /[^\s]+(?=[.,:!?]?(\s|$))/g;
			let match;
			let clickedWord = null;
	        while ((match = wordRegex.exec(fullText)) !== null) {
	            if (match.index <= offset && offset <= match.index + match[0].length) {
	                // This is our word
	                if (!/^[^\p{L}\p{N}]/u.test(match[0]) &&        // Not starting with any non-alphanumeric
	                    !/[^\p{L}\p{N}\s.,:!?]/u.test(match[0]) &&	// Not containing other than allowed chars
	                    !/[.,:!?](?=[^\s$])/u.test(match[0])) {     // If ends with punctuation, following character must be whitespace or end of string
	                    clickedWord = match[0];
	                    break;
	                }
	            }
	        }


			let activeView = await this.app.workspace.getActiveViewOfType(MarkdownView);

			
		    let editor = activeView.sourceMode.cmEditor;  // Get the CodeMirror instance
		    let fullNote = editor.getValue(); 

			const globalStartPosition = fullNote.indexOf(textNode.textContent);

			if (globalStartPosition !== -1) {
			    // Assuming the click was right at the end of the word
			    let wordEndPosition = globalStartPosition + offset;

			    // Traverse backward until a space or start
			    while (wordEndPosition > 0 && fullNote[wordEndPosition] !== ' ' && fullNote[wordEndPosition] !== '\n') {
			        wordEndPosition--;
			    }

			    wordEndPosition++;

			    // Insert hash at wordEndPosition
			    const updatedNote = [fullNote.slice(0, wordEndPosition), '#', fullNote.slice(wordEndPosition)].join('');
			    console.log(updatedNote);
			}


		}

		// LATER, to make this work in embeds and summaries
		// and avoid adding when in the summary empty block. or other code blocks. maybe this check is earlier.
	}*/

	escapeRegExp(string):string {
    	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
	}

	getTagsFromApp(): string[] {
	    const tagsObject = this.app.metadataCache.getTags();

	    // Convert tagsObject to an array of [tag, count] tuples
	    const tagsArray = Object.entries(tagsObject);

	    // Sort by use count
	    tagsArray.sort((a, b) => b[1] - a[1]);

	    const recentTags = this.getRecentTags();
	   // console.log('recent tag length: ' + recentTags.length)

	    if (recentTags.length>0) {
	    	//console.log(recentTags)
	    	// convert them to [tag, count] tuples for consistency
	   		const recentTagsAsTuples = recentTags.map(tag => [tag, 0]);
	    	// Concatenate the two arrays
	    	const recentAndAllTags = recentTagsAsTuples.concat(tagsArray);
	    	// Extract tag names after removing the #
	    	return recentAndAllTags.map(([tag, _]) => tag.replace(/^#/, ""));
       	} else {
       		return tagsArray.map(([tag, _]) => tag.replace(/^#/, ""));
       	}
	}

	getTagElement(paragraphEl, tagText) {
	    //console.log('Get tag element')
	    const els = paragraphEl.querySelectorAll('.tag'); 
	    //Array.from(els).map(el => console.log(el.innerText));
	    let tagElText = '';
	    let tagElHasSub:boolean;
	    for (let el of els) {
	    	tagElText = el.innerText.trim();
	    	//console.log(tagElText + ' == ' + tagText)
	    	if (tagElText === tagText) {
	    		//console.log(el.innerText)
	    		//console.log(el)
	    		return el
	    	}
	    	//tagElText = el.innerText.trim();
	    	//tagElHasSub = tagElText.includes('/')
	    	//console.log(tagElText + ' has sub? ' + tagElHasSub)
	    }	
	    /*for (let el of els) {
	    	console.log(el.innerText)
	    	tagElText = el.innerText.trim();
	    	tagElHasSub = tagElText.includes('/')
	    	//console.log(tagElText + ' has sub? ' + tagElHasSub)
	        if (tagElHasSub) {
	        	//console.log(el);
	        	continue;
	        } else if (tagElText === tagText && (!tagElHasSub || (tagElHasSub && (tagElText === tagText)))) {
	            return el;
	        }
	    }*/

	    console.warn(`Element with text "${tagText}" not found`);
	    return null;
	}

	ctrlCmdKey (event) {
		const isMac = (navigator.platform.toUpperCase().indexOf('MAC') >= 0);

		if (isMac) return event.metaKey;
		else return event.ctrlKey;
	}

	debounce(func, wait) {
    	let timeout;
    	return function(...args) {
        	const context = this;
        	clearTimeout(timeout);
        	timeout = setTimeout(() => {
            	func.apply(context, args);
        	}, wait);
    	};
	}
}

class TempComponent extends Component {
	onload() {}
	onunload() {}
}

class DoubleTapHandler {
  constructor(plugin, element, callback) {
    this.plugin = plugin; // Store the plugin instance
    this.element = element;
    this.callback = callback;
    this.lastTap = 0;
    //new Notice('double tap created')
    this.plugin.registerDomEvent(this.element, 'touchend', this.handleTouchEnd.bind(this), true);
  }

  handleTouchEnd(event) {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - this.lastTap;
    clearTimeout(this.timeout);
    
    if (tapLength < 500 && tapLength > 0) {
      //event.preventDefault();
      //event.stopPropagation();
      //new Notice('double tap fired');
      this.callback(event);
    } else {
      this.timeout = setTimeout(() => {
        clearTimeout(this.timeout);
      }, 500);
    }
    this.lastTap = currentTime;
  }
}

class PressAndHoldHandler {
  constructor(plugin, element, callback, duration = 600) {
    this.plugin = plugin;
    this.element = element;
    this.callback = callback;
    this.duration = duration; // duration in milliseconds to consider as "hold"
    this.timeout = null;

    //new Notice ('pressAndHold created.')

    this.plugin.registerDomEvent(this.element, 'touchstart', this.handleTouchStart.bind(this), true);
    this.plugin.registerDomEvent(this.element, 'touchend', this.handleTouchEnd.bind(this), true);
  }

  handleTouchStart(event) {
    //event.preventDefault();
    //event.stopPropagation();
    this.timeout = setTimeout(() => {
    	//new Notice ('pressAndHold event fired.')
      this.callback(event);
      this.timeout = null;
    }, this.duration);
  }

  handleTouchEnd(event) {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
