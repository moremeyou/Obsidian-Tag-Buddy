import { TBSettingsTab } from "./settings";
import { App, debounce, Editor, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface TBSettings {
	removeOnClick: boolean; // ctrl
	removeChildTagsFirst; // 
	optToConvert: boolean; //alt
	mobileTagSearch: boolean; 
	mobileNotices: boolean; 
	debugMode: boolean;
}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, // when true, cmd is needed when clicking to remove the tag
	removeChildTagsFirst: true, // use shift when false
	optToConvert: true, // when false, clicking tag will do nothing
	mobileTagSearch: false, // toggle on use double tap for search. press+hold will then remove.
	mobileNotices: true,
	debugMode: false,
}; 


export default class TagBuddy extends Plugin {  
	settings: TBSettings;

	onunload() {}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TBSettingsTab(this.app, this));	
		
		console.log('Tag Buddy Plugin loaded on ' + (this.app.isMobile?'mobile at ':'desktop at ') + new Date().toUTCString().substring(17));

		this.app.workspace.onLayoutReady(async () => {
			
			// this.reload(); // no need for this atm.
			setTimeout(async () => { this.processTags(); }, 1000)
			
			// Don't need this event because we'll always need to switch between views to edit note and affect the tag indices.
			// this.registerEvent(this.app.workspace.on('editor-change', debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)));
			// Don't need this event because leaf changes don't effect the raw content.
			// this.registerEvent( this.app.workspace.on('active-leaf-change', debounce(async () => { console.log('active leaf change'); this.processTags(); }, 300, true)) );
			// But one of these might be useful when we click tags in other plugins like repeat or checklist
			// This event is best because we always need to switch modes to edit note or interact with tag (reading mode).
			
			this.registerEvent( this.app.on('layout-change', (event: EditorEvent) => { 
				setTimeout(async () => { 
					// console.log('layout change'); 
					this.processTags(); 
				}, 300); 
			}));
			
			// There is a little redundancy here because we also get layout events when switching files
			this.registerEvent(this.app.on('file-open', async (event: EditorEvent) => { 
				setTimeout(async () => { 
					// console.log('file open'); 
					this.processTags(); 
				}, 1000); 
			}));

			if (!this.app.isMobile) {

				// This event handles all the interactions on desktop
				this.registerDomEvent(document, 'click', this.onClickEvent.bind(this), true);

			} else { // Mobile interaction

				// This event catches all taps on mobile because we have custom double-tap and press-hold events.
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
		
		// If tag has no context properties, then try to figure out where it is?
		// Or maybe there's a way to have obsidian add the properties globally.
		//new Notice ('Tag Buddy event type: ' + event.type);

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
				//|| (Array.from(embed.querySelectorAll('.repeat-embedded_note')).length <= 0)) return;
			//repeat-embedded_note markdown-embed
		//} else {
		//	return;
		//}
		
		if (!this.app.isMobile) {
			if ((this.settings.removeOnClick && event.metaKey) || (!this.settings.removeOnClick && !event.metaKey)) { 
				return; 
			} else if (event.altKey && !this.settings.optToConvert) {  
				return; 
			}
		} else {
			// new Notice('mobile tag search is ' + this.settings.mobileTagSearch)
			// new Notice ('Tag Buddy event type: ' + event.type);
			if (this.settings.mobileTagSearch && event.type == 'touchend') {
				// if we get this far, this is a double tap
				return;
			}

			// maybe after mobile settings: long press can do convert or remove/edit
			// double tap can do remove/edit or search (via native click, without prop stop). if double-tap disabled, then native happens.
		}
		

		//if (view && target && target.matches('.tag')) {	
		if (target && target.matches('.tag')) {	
			// const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();

			if (this.settings.removeOnClick || (!this.settings.removeOnClick && event.metaKey)) {
				event.stopPropagation();
				event.preventDefault();
			}

			const clickedTag = target.closest('.tag'); //event.target as HTMLElement;
			const tag = clickedTag.innerText;

			let tagIndex = clickedTag.getAttribute('md-index');
			let tagFile = clickedTag.getAttribute('file-source');

			if (tagFile) {
				// Try
				this.editTag (event, tagIndex, tagFile);
			} else {
				// Try again
				setTimeout(async () => {
					tagIndex = clickedTag.getAttribute('md-index');
					tagFile = clickedTag.getAttribute('file-source');
					this.editTag (event, tagIndex, tagFile);
				}, 100);
			}
			//console.log(clickedTag.getAttribute('type'))

			if (clickedTag.getAttribute('type') == 'plugin-summary') {
				setTimeout(async () => {
					
					const summaryContainer = clickedTag.closest('.summary');
					const tagsStr = summaryContainer.getAttribute('codeblock-tags');
					const tags = tagsStr ? tagsStr.split(',') : [];

					const tagsIncludeStr = summaryContainer.getAttribute('codeblock-tags-include');
					const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];

					const tagsExcludeStr = summaryContainer.getAttribute('codeblock-tags-exclude');
					const tagsExclude = tagsExcludeStr ? tagsExcludeStr.split(',') : [];

					// Recreate summary after we've edited the file
					this.createSummary(summaryContainer, tags, tagsInclude, tagsExclude);

					setTimeout(async () => { this.processTags(); }, 200);

					// this.refreshView(); // no need for this atm

				}, 150);
			} else {
				setTimeout(async () => { this.processTags(); }, 50)
			}	
		//} else if (view == null && target && target.matches('.tag')) {
		} else if (!view && target.matches('.tag')) {
			new Notice('Tag Buddy: Can\'t edit tag. Might be in an unsupported view type.');
		}
	}

	async processTags () {

		if (this.settings.debugMode) console.log('Tag Buddy: Processing tags.');

		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		//setTimeout(async () => { 
		const activeNoteContainer = await this.app.workspace.activeLeaf.containerEl;
		//const activeNoteContainer = await document.querySelector('.view-content');
		//const activeNoteContainer = await document.querySelector('.markdown-reading-view');// this.app.workspace.activeLeaf.containerEl;
		//}, 200)
		//setTimeout(async () => { // All these timeouts were for testing. Issues seems to be resolved now.
		const activeFile = await this.app.workspace.getActiveFile();
		const fileContent = await app.vault.read(activeFile);
		const activeFileTagElements = await activeNoteContainer.querySelectorAll('.mod-active .tag:not(.markdown-embed .tag):not(.summary .tag)');
		//const activeFileTagElements = await activeNoteContainer.getElementsByClassName('cm-hashtag')
		//console.log(Array.from(activeFileTagElements).length)
		//console.log(Array.from(activeFileTagElements).map(element => element.innerText));


		//setTimeout(async () => { console.log(activeFileTagElements)}, 1000)
		const activeFileTags = await this.getMarkdownTags(activeFile, fileContent);
		this.assignMarkdownTags(activeFileTags, activeFileTagElements, 0, 'active');
		this.processEmbeds(activeNoteContainer);
		//}, 500)
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
		    //console.log(match.index)
		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
		}
		//console.log('markdown tag count: ' + tagPositions.length)

		return tagPositions;
	}

	assignMarkdownTags (tagPositions, tagElements, startIndex, type) {
		let tagEl;
		const tagElArray = Array.from(tagElements);
		let tagElIndex = 0;
		tagPositions.forEach((tagPos, index) => {

			if (tagPositions[index].index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
        		if (tagEl) {
        			tagEl.setAttribute('md-index', tagPositions[index].index);
        			tagEl.setAttribute('file-source', tagPositions[index].source);
        			tagEl.setAttribute('type', type);
        			tagElIndex++;
        		} 
    		} 
		}); 
		//console.log('tag element array length: ' + tagElArray.length);
		return tagElArray; //Array.from(tagElements); 
	}

	async processEmbeds (element) {
 		//const activeFileTagElements = await activeNoteContainer.querySelectorAll('.mod-active .tag:not(.markdown-embed .tag):not(.summary .tag)');
		
		const embeds = await element.querySelectorAll('.summary, .markdown-embed');
		//let embededTagFiles = [];

		embeds.forEach(async (embed) => {
			if (embed.classList.contains('summary')) {
				//console.log('this is a summary')

				// Moved this code to separate methods to process nested content
				/*let summaryBlocks = embed.querySelectorAll('blockquote'); 

				summaryBlocks.forEach(async (block, index) => {
					//const linkElement = block.querySelector('a[data-href$=".md"]');
					const filePath = block.getAttribute('file-source'); // linkElement.getAttribute('data-href')
					const file = this.app.vault.getAbstractFileByPath(filePath);

					if (file) {
						const fileContent = await app.vault.read(file);
						const embededTagFile = await this.getMarkdownTags(file, fileContent)
						//embededTagFiles.push(embededTagFile);
						
						// Create a temporty element block so we can match match text only content of this element with it's source note
						const tempBlock = block.cloneNode(true);
						tempBlock.querySelector('br')?.remove();
						tempBlock.querySelector('strong')?.remove(); 
						const blockText = this.cleanString(tempBlock.innerText);

						const startIndex = this.cleanString(fileContent).indexOf(blockText);

						this.assignMarkdownTags(embededTagFile, block.querySelectorAll('.tag'), startIndex, 'plugin-summary');
					}
				});	*/

				this.processTagSummary(embed);	

			} else if (embed.classList.contains('markdown-embed')) {
				//console.log('this is an embed')

				// Moved this code to separate methods to process nested content

				/*const linkElement = embed.getAttribute('src'); //this.findAncestor(clickedTag, 'span')
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
					
					const innerText = this.cleanString(embed.querySelector('.markdown-embed-content').innerText);
					const startIndex = this.cleanString(tempContainerHTML.innerText).indexOf(innerText);
					
					this.assignMarkdownTags(embededTagFile, embed.querySelectorAll('.tag'), startIndex, 'native-embed');
				}*/

				this.processNativeEmbed(embed);
				//console.log('found summary in embed, count: ' + Array.from(embed.querySelectorAll('.summary')).length)
				if (Array.from(embed.querySelectorAll('.summary')).length > 0) {
					//console.log('found a nested summary')
					this.processTagSummary(embed);
				}
				//} else {
				//	this.processNativeEmbed(embed);
				//}
				//if (embed.classList.querySelectorAll('summary')) {
					//console.log('embed contains summary')
				//}
				//this.processNativeEmbed(embed)

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
			
			const innerText = this.cleanString(embed.querySelector('.markdown-embed-content').innerText);
			const startIndex = this.cleanString(tempContainerHTML.innerText).indexOf(innerText);
			
			this.assignMarkdownTags(embededTagFile, embed.querySelectorAll('.tag'), startIndex, 'native-embed');
		}
	}

	async processTagSummary (embed) {


		let summaryBlocks = embed.querySelectorAll('blockquote'); 
		//console.log(summaryBlocks)
		summaryBlocks.forEach(async (block, index) => {
			//const linkElement = block.querySelector('a[data-href$=".md"]');
			//console.log(block)
			const filePath = block.getAttribute('file-source'); // linkElement.getAttribute('data-href')
			const file = this.app.vault.getAbstractFileByPath(filePath);

			if (file) {
				const fileContent = await app.vault.read(file);
				const embededTagFile = await this.getMarkdownTags(file, fileContent)
				//embededTagFiles.push(embededTagFile);
				
				// Create a temporty element block so we can match match text only content of this element with it's source note
				const tempBlock = block.cloneNode(true);
				tempBlock.querySelector('br')?.remove();
				tempBlock.querySelector('strong')?.remove(); 
				const blockText = this.cleanString(tempBlock.innerText);

				const startIndex = this.cleanString(fileContent).indexOf(blockText);

				this.assignMarkdownTags(embededTagFile, block.querySelectorAll('.tag'), startIndex, 'plugin-summary');
			}
		});		
	}

	async editTag (event, index, filePath) {
		//console.log(event.target)
		//console.log(index);
		if (this.settings.debugMode) console.log('Tag Buddy edit tag: ' + event.target.innerText + '\nIn file: ' + filePath);

		if (filePath) {

			const file: TFile = await this.validateFilePath(filePath); //app.vault.getAbstractFileByPath(filePath);
			let fileContent: String;
			let fileContentBackup: String;
			const tag: String = event.target.innerText.trim();

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
			//new Notice('convert to text: ' + ((event.type == 'touchstart') && this.settings.mobileTagSearch))
			//new Notice (event.type)
			if (event.altKey || ((event.type == 'touchstart') && !this.settings.mobileTagSearch)) { 

				// Remove the hash only

				const noHash = tag.substring(1);
				newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + noHash + afterTag;
				
				if (this.app.isMobile && this.settings.mobileNotices) { new Notice ('Tag Buddy: ' + tag + ' converted to text.'); }
				// Setting: make this a setting to show notices on mobile
			
			} else if (((event.type == 'touchend') || this.settings.mobileTagSearch) || (event.metaKey && !this.settings.removeOnClick) || (!event.metaKey && this.settings.removeOnClick)) {

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
				new Notice('Tag Buddy: Tag removed. The file is empty.');
			}

			try {
			
				await this.app.vault.modify(file, newContent);

				// When editing content in the active note, it's recommended to not use the modify because the folds and other state stuff is lost
				// see this link: https://docs.obsidian.md/Plugins/Editor/Editor

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
			new Notice('Tag Buddy error: Can\'t identify tag location.');
		}
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

	cleanString(input) {
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
	}

	async refreshView (){
		//console.log('Refresh view.');
		new Notice ('Refresh view.');
		// if using rerender,
		//const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();
		//await view.previewMode.rerender(true);

		await app.workspace.activeLeaf.rebuildView();
		// only needed if we use rerender above. do this on a timeout
		//this.app.workspace.getActiveViewOfType(MarkdownView).previewMode.applyScroll(scrollState);
	}

	//////////////// CUSTOM TAG-SUMMARY IMPLEMENTATION //////////////
	// ORIGINAL CODE BY https://github.com/macrojd/tag-summary //////
	/////////////////////////////////////////////////////////////////
	async summaryCodeBlockProcessor (source, el, ctx) {
		// Initialize tag list
		let tags: string[] = Array();
		let include: string[] = Array();
		let exclude: string[] = Array();

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
		});

		// Create summary only if the user specified some tags
		if (tags.length > 0 || include.length > 0) {
			await this.createSummary(el, tags, include, exclude, ctx.sourcePath);
		} else {
			this.createEmptySummary(el);
		} 
	}; 

	createEmptySummary(element: HTMLElement) {
		const container = createEl("div");
		container.setAttribute('class', 'summary');
		container.createEl("span", {
			attr: { style: 'color: var(--text-error) !important;' },
			text: "There are no files with blocks that match the specified tags." 
		});
		element.replaceWith(container);
	}

	async createSummary(element: HTMLElement, tags: string[], include: string[], exclude: string[], filePath: string) {
		
		const activeFile = await this.app.workspace.getActiveFile();
		const validTags = tags.concat(include); // All the tags selected by the user
		const tempComponent = new TempComponent();
		const summaryContainer = createEl("div");
		summaryContainer.setAttribute('class', 'summary');
		
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

		// Create summary
		let summary: string = "";
		listContents.forEach((item) => {

			// Get files name
			const fileName = item[0].name.replace(/.md$/g, "");
			const filePath = item[0].path;
			
			// Do not add this item if it's in the same file we're creating the summary
			if (activeFile.name == item[0].name) {
				//console.log('same file')
				return;
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

				// Removed list paragraphs functionality
				if (valid) {

					// Add paragraphs and the items of a list
					let listItems: string[] = Array();
					let itemText = "";

					paragraph.split('\n\s*\n').forEach((line) => {
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

				// Possible Button and QuickAdd Plugin usage
				// paragraph += '```button\nname Copy to ' + tagSection.replace('#', '') + ' section\ntype command\naction QuickAdd: Paste Clipboard Text\n```'

				// Add link to original note. Tag Buddy added deep linking.
				let blockLink = paragraph.match(/\^[\p{L}0-9_\-/^]+/gu); 
        		if (blockLink) { 
        			paragraph = "**[[" + filePath + "#" + blockLink + "|" + fileName + "]]**\n" + paragraph; 
        		} else { 
        			paragraph = "**[[" + filePath + "|" + fileName + "]]**\n" + paragraph; 
        		}

        		// Original formatting method. Will remove.
            	paragraph += "\n\n";
          		summary += paragraph;

          		// Tag Buddy added custom formatting for tag editing functionality. Fixed component error.
          		const paragraphContent = createEl("blockquote");
				paragraphContent.setAttribute('file-source', filePath);
          		await MarkdownRenderer.renderMarkdown(paragraph, paragraphContent, this.app.workspace.getActiveFile()?.path, tempComponent);
          		summaryContainer.appendChild(paragraphContent);
			});
		});

		// Add Summary
		if (summary != "") {
			// Original formatting method. Will remove.
			// await MarkdownRenderer.renderMarkdown(summary, summaryContainer, this.app.workspace.getActiveFile()?.path, tempComponent);
			summaryContainer.setAttribute('codeblock-tags', tags.join(','));
			summaryContainer.setAttribute('codeblock-tags-include', ((include.length>0)?include.join(','):''));
			summaryContainer.setAttribute('codeblock-tags-exclude', ((exclude.length>0)?exclude.join(','):''));
			element.replaceWith(summaryContainer);
		} else {
			this.createEmptySummary(element);
		}
	}
	/////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////

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
