import { TBSettingsTab } from "./settings";
//import * as stringSimilarity from 'string-similarity';
import { App, Editor, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


interface TBSettings {
	removeOnClick: boolean; // ctrl
	removeChildTagsFirst; // 
	optToConvert: boolean; //alt
	debugMode: boolean;
}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, // when true, cmd is needed when clicking to remove the tag
	removeChildTagsFirst: true, // use shift when false
	optToConvert: true, // when false, clicking tag will do nothing
	debugMode: true,
}; 


export default class TagBuddy extends Plugin {  
	settings: TBSettings;

	onunload() {}

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new TBSettingsTab(this.app, this));	
		
		console.log('Tag Buddy Plugin loaded at ' + new Date().toUTCString().substring(17));

    	//this.registerEvent(this.app.on('file-open', (event: EditorEvent) => { }));
	    this.registerEvent(this.app.on('layout-change', (event: EditorEvent) => {
			//console.log('Layout change.');
			setTimeout(async () => {
				this.processTags();
			}, 100); }));
	    //this.registerEvent(this.app.workspace.on('active-leaf-change', () => { }));

		setTimeout(async () => { this.processTags(); }, 100)

		this.registerDomEvent(document, 'click', this.onClickEvent.bind(this), true);


		//////////////// CUSTOM TAG-SUMMARY IMPLEMENTATION //////////////
		// ORIGINAL CODE BY https://github.com/macrojd/tag-summary //////
		/////////////////////////////////////////////////////////////////

		// Create command to create a summary
		this.addCommand({
			id: "tag-summary-modal",
			name: "Add Tag Summary",
			editorCallback: (editor: Editor) => {
				new SummaryModal(this.app, (include, exclude) => {
					// Format code block to add summary
					let summary = "```tag-summary\n";

					// Add the tags label with the tag selected by the user
					summary += "tags: " + include + "\n";

					// Add the exclude label with the tags to exclude
					if (exclude != "None") {
						summary += "exclude: " + exclude + "\n";
					}
					summary += "```\n";
					editor.replaceRange(summary, editor.getCursor());
				}).open();
			}, });

		// Post processor
		this.registerMarkdownCodeBlockProcessor("tag-summary", async (source, el, ctx) => {
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
			} }); 

	}

	async onClickEvent (event: MouseEvent) {
		const target = event.target as HTMLElement;
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		if (this.settings.removeOnClick && event.metaKey) {
			return;
		} else if (event.altKey && !this.settings.optToConvert) {
			return;
		}
		if (view && target && target.matches('.tag')) {	
			if (!(view.getMode() === 'preview')) {  
				return;
			}
			//console.log(target);
			
			if (this.settings.removeOnClick) {
				event.preventDefault();
				event.stopPropagation();
			}

			const clickedTag = event.target as HTMLElement;
			const tag = target.innerText;
			let element = target as HTMLElement;

			//const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();
			let tagIndex = target.getAttribute('md-index');
			let tagFile = target.getAttribute('file-source');
			if (tagFile) {
				this.editTag (event, tagIndex, tagFile);
			} else {
				setTimeout(async () => {
					//console.log('Delayed')
					tagIndex = target.getAttribute('md-index');
					tagFile = target.getAttribute('file-source');
					//this.processTags();
					this.editTag2 (event, tagIndex, tagFile);
				}, 100)
			}

			if (target.getAttribute('type') == 'plugin-summary') {
				setTimeout(async () => {
					//await app.workspace.activeLeaf.rebuildView();
					this.refreshView();
					// only needed if we use rerender above.
					// this.app.workspace.getActiveViewOfType(MarkdownView).previewMode.applyScroll(scrollState);
				}, 100)
			} else {
				setTimeout(async () => {
					this.processTags();
				}, 50)
			}	
		} else if (view == null && target && target.matches('.tag')) {
			new Notice('Tag Buddy error: Can\'t edit that tag. Might be in a special view type');
		}
	}

	async getMarkdownTags (file, fileContent) {
		//console.log('Get markdown tags from: ' + file.name);

		//const fileContent = await app.vault.read(file)
		const tagPositions = [];
		let match;

		const regex = /(?:^|\s)#[^\s#]+|```/g; // Adjusted the regex to also match code block delimiters
		let insideCodeBlock = false;

		while ((match = regex.exec(fileContent)) !== null) {
		    // Determine if the match is a code block delimiter
		    if (match[0].trim() === "```") {
		        insideCodeBlock = !insideCodeBlock; // Toggle the state
		        continue;
		    }
		    
		    if (insideCodeBlock) {
		        // Skip this match since it is inside a code block
		        continue;
		    }

		    // Remove leading white space from the match, if any
		    const tag = match[0].trim();
		    // Look ahead from the current match and see if it's followed by ]]
		    if (fileContent.slice(match.index, match.index + tag.length + 2).endsWith("]]")) {
		        continue; // Skip this match as it's part of a wikilink
		    }

		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
			//---->console.log(tagPositions[tagPositions.length-1]);
		}
		//console.log(tagPositions);
		return tagPositions;
	}

	assignMarkdownTags (tagPositions, tagElements, startIndex, type) {
		//const activeFileTags = await dom.querySelectorAll('.tag');
		
		//console.log('Assign markdown indices.');
		let tagEl;
		const tagElArray = Array.from(tagElements);
		let tagElIndex = 0;
		tagPositions.forEach((tagPos, index) => {
			if (tagPositions[index].index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
				//console.log(tagEl);
        		if (tagEl) {
        			tagEl.setAttribute('md-index', tagPositions[index].index);
        			tagEl.setAttribute('file-source', tagPositions[index].source);
        			tagEl.setAttribute('type', type);
        			tagElIndex++;
        		}
    		} //else {
        		//console.error('No corresponding tag position found for', index, tagElement); 
    		//}
		});

		/*tagElements.forEach((tagElement, index) => {
			//console.log(tagPositions[index].source + ' | ' + tagElement.innerText);
			//console.log(tagPositions[index].index + ' >= ' + startIndex + ': ' + (tagPositions[index].index >= startIndex));
			if (tagPositions[index].index >= startIndex) {
        		tagElement.setAttribute('md-index', tagPositions[index].index);
        		tagElement.setAttribute('file-source', tagPositions[index].source);
    		} //else {
        		//console.error('No corresponding tag position found for', index, tagElement); 
    		//}
		});*/
		//const tagElements = Array.from(activeFileTags).map(tag => tag.outerHTML);
		//const tagElements = Array.from(activeFileTags); //.map(tag => tag.innerText);
		//const tagElements = activeFileTags;
		//console.log(tagElements); 

		return Array.from(tagElements); 
	}

	async validateFilePath (filePath) {
		const matchingFiles = await app.vault.getFiles().filter(file => file.name === filePath);
		//console.log(filePath);
		if (matchingFiles.length === 1) {
			const filePath = matchingFiles[0].path;
			const file = await this.app.vault.getAbstractFileByPath(filePath);
			//console.log('Validate file: ' + embedFile.name);
			return file;
		} else if (matchingFiles.length > 1) {
			new Notice('Multiple files found with the same name. Need to disambiguate. Can\'t safely edit tag.');
			return null;
			//console.warn('Multiple files found with the same name. Can\'t safely edit tag. Need to disambiguate.');
		} else {
			new Notice('No file found. Try again, or this tag might be in an unsupported embed type.');
			//console.warn('No file found with. Try again, or this tag might be in an unsupported embed type.');
			return null;
		}
	}

	async processEmbeds (dom) {

		//console.log('Process embeds.');
 
		const embeds = await dom.querySelectorAll('.summary, .markdown-embed');
		let embededTagFiles = [];

		// test nested emebeds and summaries... should be fine.

		embeds.forEach(async (embed) => {

			//  = await app.vault.read(activeFile);
			//console.log(embed);
			if (embed.classList.contains('summary')) {

				// test nested block quotes
				//console.log('Summary:');
				let summaryBlocks = embed.querySelectorAll('blockquote'); // need to only get one level down of block quotes.

				summaryBlocks.forEach(async (block, index) => {
			
					//console.log('Summary found.');
					const linkElement = block.querySelector('a[data-href$=".md"]');
					//console.log(block.getAttribute('file-source'));
					

					const filePath = block.getAttribute('file-source'); // linkElement.getAttribute('data-href')
					const file = this.app.vault.getAbstractFileByPath(filePath);
					//console.log(filePath);

					if (file) {
						const fileContent = await app.vault.read(file);
						//console.log('Block source file: ' + filePath);
						const embededTagFile = await this.getMarkdownTags(file, fileContent)
						embededTagFiles.push(embededTagFile);

						const tempBlock = block.cloneNode(true);

						tempBlock.querySelector('br')?.remove();
						tempBlock.querySelector('strong')?.remove(); 
						//console.log(tempBlock);
						const blockText = this.cleanString(tempBlock.innerText);
					
						const startIndex = this.cleanString(fileContent).indexOf(blockText);

						this.assignMarkdownTags(embededTagFile, block.querySelectorAll('.tag'), startIndex, 'plugin-summary');
					}
				});
				

			} else if (embed.classList.contains('markdown-embed')) {
				 
				const linkElement = embed.getAttribute('src'); //this.findAncestor(clickedTag, 'span')
				//console.log(linkElement)
				let filePath = embed.getAttribute('src');
				const linkArray = filePath.split('#');
				filePath = linkArray[0].trim() + '.md';
				const file = await this.validateFilePath(filePath)
				if (file) {
					const fileContent = await app.vault.read(file);
					//console.log('Embed source file: ' + filePath);

					const embededTagFile = await this.getMarkdownTags(file, fileContent)
					embededTagFiles.push(embededTagFile);


					const tempComponent = new TempComponent();
					const tempContainerHTML = createEl("div");
					await MarkdownRenderer.renderMarkdown(fileContent, tempContainerHTML, file.path, tempComponent);
					

					const innerText = this.cleanString(embed.querySelector('.markdown-embed-content').innerText);
					const startIndex = this.cleanString(tempContainerHTML.innerText).indexOf(innerText);

					//console.log(startIndex);
					//console.log(innerText);
					//console.log('----------------');
					//console.log(this.cleanString(tempContainerHTML.innerText));

					this.assignMarkdownTags(embededTagFile, embed.querySelectorAll('.tag'), startIndex, 'native-embed');
					//console.log(fileContent)
				}

			} else {
				new Notice('Tag embed type unknown.');
			}
			//filePath = linkElement.getAttribute('data-href');
			
		});
		return embededTagFiles;
		// Can't find this tag in embedded is possible if the source file also has an embed. 
	}

	async editTag (event, index, filePath) {
		if (this.settings.debugMode) { console.log('Edit tag: ' + event.target.innerText + '\nIn file: ' + filePath); }
		
		if (filePath) {
			const file = await this.validateFilePath(filePath);   //app.vault.getAbstractFileByPath(filePath);
			const fileContent = await this.app.vault.read(file);
			const fileContentBackup = fileContent;
			const tag = event.target.innerText.trim();
			
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
			//console.log('Before Tag: ', JSON.stringify(beforeTag));
			//console.log('The Tag: ', JSON.stringify(tag));
			//console.log('After Tag: ', JSON.stringify(afterTag));
	
			let newContent = '';

			if (event.altKey) {
				// just remove the hash
				const noHash = tag.substring(1);
				newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + noHash + afterTag;
				
			} else if ((event.metaKey && !this.settings.removeOnClick) || (!event.metaKey && this.settings.removeOnClick)) {

				let parentTag = '';

				// remove child tags first
				if (tag.includes('/') && (this.settings.removeChildTagsFirst || (event.shiftKey && !this.settings.removeChildTagsFirst))) {
					// Split the tag into its parts
					let parts = tag.split('/');

					// Remove the last child
					parts.pop();

					// Reform the parentTag
					parentTag = parts.join('/');

					// Update the new content with the parentTag
					newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + parentTag + afterTag;
				} else {
					newContent = beforeTag + afterTag;
				}
			}

			try {

				// File safety checks.
				if ((newContent == '' && !safeToEmptyFile) || this.contentChangedTooMuch(fileContentBackup, newContent, tag)) {
					// check if there was only one tag in the file, if so, don't restore backup;
					new Notice('Tag Buddy Error. File change error.');
					newContent = fileContentBackup;
				} else if (newContent == '' && safeToEmptyFile) {
					new Notice('Tag Buddy says: Tag removed. The file is empty.');
				}

				await this.app.vault.modify(file, newContent);

			} catch (error) {

				new Notice('Tag Buddy error:\n' + error.message);

			} 
			
			
		} else {
			new Notice('Tag Buddy error: Can\'t edit/remove that tag. Can\'t identify tag location.');
		}
	}

	async processTags () {
		//console.log('Process tags');

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const activeNoteContainer = await document.querySelector('.markdown-reading-view');// this.app.workspace.activeLeaf.containerEl;
		const activeFile = await this.app.workspace.getActiveFile();
		const fileContent = await app.vault.read(activeFile);
		const activeFileTagElements = await activeNoteContainer.querySelectorAll('.mod-active .tag:not(.markdown-embed .tag):not(.summary .tag)');

		const activeFileTags = await this.getMarkdownTags(activeFile, fileContent);

		this.assignMarkdownTags(activeFileTags, activeFileTagElements, 0, 'active')

 		await this.processEmbeds(activeNoteContainer);

 		// this is needed for the query blocks, I think. test when all otheer bugs done.
		/*this.app.workspace.iterateLeaves(leaf => {
			const markdownView = leaf.view as MarkdownView;
			//if (markdownView.file && markdownView.file.path === file.path) {
				const editor = markdownView.sourceMode.cmEditor;
				editor.setValue(newContent);
			//}
		});*/
	}

	createEmptySummary(element: HTMLElement) {
		const container = createEl("div");
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
			// console.log(activeFile.name + ' : ' + item[0].name)
			if (activeFile.name == item[0].name) {
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
					if (!paragraph.contains("```")) {
						valid = this.isValidText(listTags, tags, include, exclude);
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
			element.replaceWith(summaryContainer);
		} else {
			this.createEmptySummary(element);
		}
	}

	// Read Files
	async readFiles(listFiles: TFile[]): Promise<[TFile, string][]> {
		let list: [TFile, string][] = [];
		for (let t = 0; t < listFiles.length; t += 1) {
			const file = listFiles[t];
			let content = await this.app.vault.cachedRead(file);
			list.push([file, content]);
		}
		return list;
	}

	// Check if tags are valid
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
		
		// if using rerender,
		//const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();
		//await view.previewMode.rerender(true);

		await app.workspace.activeLeaf.rebuildView();
		// only needed if we use rerender above. do this on a timeout
		//this.app.workspace.getActiveViewOfType(MarkdownView).previewMode.applyScroll(scrollState);
	}

}

class TempComponent extends Component {
	onload() {}
	onunload() {}
}