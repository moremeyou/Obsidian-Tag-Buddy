import { TBSettingsTab } from "./settings";
import * as stringSimilarity from 'string-similarity';
import { App, Editor, MarkdownRenderer, Component, TFile, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';

// Bug: should be ignoring the yaml and any code blocks. indexs will need to account for this

interface TBSettings {
	removeOnClick: boolean; //ctrl
	removeChildTagsFirst; // shift
	optToConvert: boolean; //alt
}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, // when true, cmd is needed when clicking to remove the tag
	removeChildTagsFirst: true, // shift
	optToConvert: true, // when false, clicking tag will do nothing
}; 


export default class TagBuddy extends Plugin {  
	settings: TBSettings;

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

	async editTag2 (event, index, filePath) {
		

		console.log('Edit tag: ' + event.target.innerText + '\nIn file: ' + filePath);
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
				if (tag.includes('/')) {
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
					new Notice('Tag Buddy Error. Can\'t edit tag or file error.');
					newContent = fileContentBackup;
				} else if (newContent == '' && safeToEmptyFile) {
					new Notice('Tag Buddy says: Tag removed. The file is empty.');
				}

				await this.app.vault.modify(file, newContent);

			} catch (error) {

				new Notice('Tag Buddy error: ' + error.message);

			} 
			
			
		} else {
			new Notice('Tag Buddy says: Can\'t edit/remove that tag.');
		}
	}

	async editTag (event, index, filePath) {
		//console.log('Edit tag: ' + event.target.innerText + '\nIn file: ' + filePath);
		if (filePath) {
			const file = await this.validateFilePath(filePath);   //app.vault.getAbstractFileByPath(filePath);
			const fileContent = await this.app.vault.read(file);
			const fileContentBackup = fileContent;
			const tag = event.target.innerText.trim();
			//const tag = fileContent.substring(index, (Number(index)+Number(event.target.innerText.trim().length)));

			// check if the file has only one tag left
			let safeToEmptyFile = false;
			const tagRegex = /^\s*#(\w+)\s*$/;
			if (tagRegex.test(fileContent)) {
		    	safeToEmptyFile = true;
			}
			
			let beforeTag = fileContent.substring(0, index);
			let afterTag = fileContent.substring(index);
			//console.log('chr before hash', JSON.stringify(fileContent[index]));
			if (fileContent[index] === '\n') {
    			//console.log('new line chr found')
    			beforeTag += '\n'; // appending the newline character to beforeTag
			}
			//console.log('new line after tag? ', JSON.stringify(fileContent[Number(index)+Number(tag.length)]))
			if (fileContent[Number(index)+Number(tag.length)] === '\n') {
    			//console.log('new line chr found')
    			//afterTag = '\n' + afterTag; // appending the newline character to beforeTag
			}
			
			/*console.log('File content: ', JSON.stringify(fileContent));
			console.log('Before Tag: ', JSON.stringify(beforeTag));
			console.log('The Tag: ', JSON.stringify(tag));
			console.log('After Tag: ', JSON.stringify(afterTag));
			*/
	
			let newContent = '';

			if (event.altKey) {
				// just remove the hash
				newContent = fileContent.substring(0, index) + ' ' + tag.substring(1) + ((fileContent[Number(index)+Number(tag.length)] === '\n')?'\n':'') + fileContent.substring(Number(index) + Number(tag.length) + 1);

			} else if ((event.metaKey && !this.settings.removeOnClick) || (!event.metaKey && this.settings.removeOnClick)) {

				// Extracting the content before the tag
				//beforeTag = fileContent.substring(0, index);

				// If there's a space character right before the tag, remove it
				if (beforeTag.endsWith(' ')) {
					beforeTag = beforeTag.slice(0, -1);
				}

				// Extracting the tag itself
				let theTag = tag;//fileContent.substring(index, Number(index) + Number(tag.length));

				// Extracting the content after the tag
				afterTag = fileContent.substring(Number(index) + Number(tag.length) + 1);


				let parentTag = '';

				// remove child tags first
				if (theTag.includes('/')) {
					// Split the tag into its constituent parts
					let parts = theTag.split('/');

					// Remove the last child
					parts.pop();

					// Reform the parentTag
					parentTag = parts.join('/');

					// Ensure there's a space before the parentTag (if it's not at the start of the file)
					if (beforeTag && !beforeTag.endsWith(' ')) {
						beforeTag += ' ';
					}
					// Update the new content with the parentTag
					newContent = beforeTag + parentTag + ((fileContent[Number(index)+Number(tag.length)] === '\n')?'\n':'') + afterTag;
				} else {
					// No child tags, so just use the existing logic
					if (beforeTag && !beforeTag.endsWith(' ')) {
						beforeTag += ' ';
					}

					newContent = beforeTag + ((fileContent[Number(index)+Number(tag.length)] === '\n')?'\n':'') + afterTag;
				}
			}

			if (newContent == '' && !safeToEmptyFile) {
				// check if there was only one tag in the file, if so, don't restore backup;
				new Notice('Tag Buddy Error. Can\'t edit tag or file error.');
				newContent = fileContentBackup;
			} else if (newContent == '' && safeToEmptyFile) {
				new Notice('Tag Buddy says: Tag removed. The file is empty.');
			}

			//console.log('New content: ', JSON.stringify(newContent));
			
			await this.app.vault.modify(file, newContent);

			// this is needed for the query blocks, I think. test when all otheer bugs done.
			/*this.app.workspace.iterateLeaves(leaf => {
				const markdownView = leaf.view as MarkdownView;
				//if (markdownView.file && markdownView.file.path === file.path) {
					const editor = markdownView.sourceMode.cmEditor;
					editor.setValue(newContent);
				//}
			});*/
		} else {
			new Notice('Tag Buddy says: Can\'t edit/remove that tag.');
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

	onunload() {}

	async onload() {
		// This adds a settings tab so the user can configure various aspects of the plugin 
		await this.loadSettings();
		this.addSettingTab(new TBSettingsTab(this.app, this));	
		console.log('Tag Buddy Plugin loaded at ' + new Date().toUTCString().substring(17));

    	this.registerEvent(this.app.on('file-open', (event: EditorEvent) => {
    		//console.log('File open.');
    		//this.processTags();
    	}));
	    this.registerEvent(this.app.on('layout-change', (event: EditorEvent) => {
			//console.log('Layout change.');
			setTimeout(async () => {
				this.processTags();
			}, 100)
	    }));
	    this.registerEvent(this.app.workspace.on('active-leaf-change', () => {
	    	//console.log('Active leaf change.');
	    	//this.processTags();
	    }));


		setTimeout(async () => {
				this.processTags();
		}, 100)

		// test when the active file also has the tag summary tag


 		// separate this function out of the onload?
		this.registerDomEvent(document, 'click', async (event: MouseEvent) => {
			const target = event.target as HTMLElement;
			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			if (this.settings.removeOnClick && event.metaKey) {
				return;
			} else if (event.altKey && !this.settings.optToConvert) {
				return;
			}

			if (target && target.matches('.tag')) {	
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
					this.editTag2 (event, tagIndex, tagFile);
				} else {
					setTimeout(async () => {
						//console.log('Delayed')
						tagIndex = target.getAttribute('md-index');
						tagFile = target.getAttribute('file-source');
						//this.processTags();
						this.editTag2 (event, tagIndex, tagFile);
					}, 100)
				}
				
				//console.log(tagFile + ' == ' + this.app.workspace.getActiveFile().name + ' = ' + (tagFile == this.app.workspace.getActiveFile().name))
				//if (tagFile.trim() != this.app.workspace.getActiveFile().name.trim()) {
					//console.log('Rerender');

					//await view.previewMode.rerender(true);
					//await app.workspace.activeLeaf.rebuildView();

				if (target.getAttribute('type') == 'plugin-summary') {
					setTimeout(async () => {
						//await app.workspace.activeLeaf.rebuildView();
						this.refreshView();
						// only needed if we use rerender above.
						//this.app.workspace.getActiveViewOfType(MarkdownView).previewMode.applyScroll(scrollState);
					}, 100)
				} else {
					setTimeout(async () => {
						this.processTags();
					}, 50)
				}

				//setTimeout(async () => {
				//	this.processTags();
				//}, 100)
				
			}
					
		}, true);
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