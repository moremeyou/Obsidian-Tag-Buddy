import { App, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import { TagSummary } from './TagSummary';
import * as Utils from './utils';


export class ReadingModeTagEditor {
	app: App; 
	plugin: TagBuddy;

	constructor(
		app: App, 
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;
	}

	async add (
		tag: string, 
		x:number, 
		y:number
	):void {
		if (this.plugin.settings.debugMode) { console.log('Tag Buddy add ' + tag + ' at (' + x + ', ' + y); }

		let fileContent: string;
		let file: TFile;
		const clickedTextObj = Utils.getClickedTextObjFromDoc (x, y);
		const clickedText: string = clickedTextObj?.text;
		const clickedTextIndex:number = clickedTextObj?.index; // this is the index in document, for narrowing down to the clicked word.
		const clickedTextEl: HTMLElement = clickedTextObj?.el;
		let contentSourceType: string = null
		let summaryEl: HTMLElement;
		let embedEl: HTMLElement;

		if (clickedTextObj) {

			summaryEl = clickedTextEl.closest('.tag-summary-paragraph');
			embedEl = clickedTextEl.closest('.markdown-embed');

			if (summaryEl) {
//console.log('is summary')
				file = await this.plugin.tagSummary.getFile(summaryEl);
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'plugin-summary';
				
			} else if (embedEl) {
//console.log('is embed')
				file = await Utils.getEmbedFile(embedEl);
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'native-embed';

				// !!!!!! we could be in some other kind of embed/view/plugin. Need to be sure about this.
			} else { 
//console.log('is active file')
				file = await this.app.workspace.getActiveFile();
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'active';
			} 

		} else {
			new Notice ('⚠️ Can\'t find text position or area too busy.\nTry a another text area.');
		    return;
		}


		if (clickedText) {
			//console.log (clickedText);
		} else {
			new Notice ('⚠️ Can\'t add tag.\nTry a different text area.')
			return;
		}

		const escapedClickedText = Utils.escapeRegExp(clickedText);
		const regex = new RegExp(escapedClickedText, "g");  
		const matches = fileContent.match(regex);

		if (matches && matches.length > 1) {
		    new Notice ('⚠️ Can\'t add tag: Clicked text repeated in note. Try a another text block.');
		    return;

		} else if ((matches && matches.length === 0) || !matches) {
			new Notice ('⚠️ Can\'t find text position or area too busy.\nTry a another text area.');
		    return;
		} 

		if (!this.plugin.settings.lockRecentTags) this.plugin.saveRecentTag(tag); 
		
		const startIndex = regex.exec(fileContent).index; // this is the index in the md source
		const endIndex = startIndex + clickedText.length; // use this to add tag at end of block

		const clickedWordObj = Utils.getWordObjFromString (clickedText, clickedTextIndex);
		const clickedWord = clickedWordObj.text;
		const clickedWordIndex = clickedWordObj.index;
		let newContent;

		if (clickedWord) {
			if (Utils.isWordNearEnd(clickedText, clickedWord)) 
				newContent = Utils.insertTextInString(' ' + tag, fileContent, endIndex);
			else
				newContent = Utils.insertTextInString(tag, fileContent, startIndex+clickedWordIndex);
		} else {
			new Notice ('⚠️ Can\'t find clicked word.\nPlease try again.');
		    return;
		}
		//const newContent = Utils.insertTextInString(' ' + tag, fileContent, endIndex)//startIndex+clickedWordIndex)
		//const newContent = Utils.insertTextInString(tag, fileContent, startIndex+clickedWordIndex)
		
		if (contentSourceType != 'plugin-summary' && contentSourceType != 'native-embed') 
			this.plugin.tagProcessor.resume();

		await this.app.vault.modify(file, newContent);

		// we do this on debounce in the mutation handler
		setTimeout(async () => { 
			//this.plugin.tagProcessor.pause();
		}, 300);

		if (contentSourceType == 'plugin-summary') {
			const summaryContainer = summaryEl.closest('.tag-summary-block')
			this.plugin.tagSummary.update(summaryContainer); 
		} else if (contentSourceType == 'native-embed') {
			//console.log('added to native embed:', embedEl)
			setTimeout(async () => { 
				this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
			}, 200);
		}

		setTimeout(async () => { 
			//this.plugin.tagProcessor.pause();
		}, 300);
	}

	async edit (
		tagEl: HTMLElement, 
		event: Event, 
		pragraphEl: HTMLElement
	):void {

		let tagContainer: HTMLElement;
		const tagContainerType = tagEl.getAttribute(
			'type'
		);
		const index = tagEl.getAttribute(
			'md-index'
		);
		const filePath = tagEl.getAttribute(
			'file-source'
		);

		if (this.plugin.settings.debugMode) {
			console.log('Tag Buddy edit tag: ' + tagEl.innerText 
				+ '\nIn file: ' + filePath);
		}

		if (tagContainerType == 'native-embed') tagContainer = tagEl.closest('.markdown-embed');
		else if (tagContainerType == 'plugin-summary') tagContainer = tagEl.closest('.tag-summary-paragraph');
		else tagContainer = this.app.workspace.activeLeaf.containerEl.querySelector('.markdown-reading-view');
		
		if (filePath) {
 
			const file: TFile = await Utils.validateFilePath(filePath);
			let fileContent: String;
			let fileContentBackup: String;
			const tag: string = tagEl.innerText.trim();

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
			//let afterTag = fileContent.substring((Number(index)+Number(tag.length)+1));
			let afterTag = fileContent.substring(
				Number(index) + Number(tag.length)
			);

			//console.log (JSON.stringify(beforeTag));
			//console.log (JSON.stringify(tag));
			//console.log (JSON.stringify(afterTag));

			let afterTagChr = '';
			
			/*if (afterTag.startsWith(' ')) {
				afterTagChr = ' ';
			} else if (afterTag.startsWith('\n')) {
				afterTagChr = '\n';
			}*/
			
			// Can't remember why I have this...
			// need to refactor all this line break space stuff
			if (fileContent[index] === '\n') beforeTag += '\n';
			
			let newContent = '';

			////////////////////////////////////////////////////////////////
			// SUPER MESSY. NEED TO REFACTOR
			////////////////////////////////////////////////////////////////


			if (!event) { // then we're calling this method from a button. need to rethink how this is organized.
				
				newContent = beforeTag + afterTagChr + afterTag;

			} else if (event.altKey 
						|| ((event.type == 'touchstart') 
							&& !this.plugin.settings.mobileTagSearch)) 
			{ 
				// Remove the hash only
				const noHash = tag.substring(1);
				//newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + noHash + afterTag;
				newContent = beforeTag + noHash + afterTagChr + afterTag;
				
				if (this.app.isMobile && this.plugin.settings.mobileNotices) 
					{ new Notice ('Tag Buddy: ' + tag + ' converted to text.'); }
			
			} else if (((event.type == 'touchend') 
				|| this.plugin.settings.mobileTagSearch) 
					|| (Utils.ctrlCmdKey(event) && !this.plugin.settings.removeOnClick) 
					|| (!Utils.ctrlCmdKey(event) && this.plugin.settings.removeOnClick)
				) 
			{

				// Remove tag (or child first, if exists)
				let parentTag = '';

				if (tag.includes('/') 
					&& (this.plugin.settings.removeChildTagsFirst 
						|| (event.shiftKey 
							&& !this.plugin.settings.removeChildTagsFirst)
						)
					) 
				{
					let parts = tag.split('/');
					const removedChild = parts.pop();
					parentTag = parts.join('/');
					newContent = beforeTag 
						//+ (!beforeTag.endsWith(' ') ? ' ' : '') // might be where extra space is coming from
						+ parentTag 
						+ afterTagChr 
						+ afterTag;

					if (this.app.isMobile 
						&& this.plugin.settings.mobileNotices) 
					{ 
						new Notice ('Tag Buddy: \'' 
							+ removedChild 
							+ '\' removed from parent tag.'); 
					}
				
				} else {
					newContent = beforeTag + afterTag;
					if (this.app.isMobile 
						&& this.plugin.settings.mobileNotices) { 
						new Notice ('Tag Buddy: ' + tag + ' removed.'); 
					}
				}
			} 

			try {
			
				if (tagEl.getAttribute('type') == 'plugin-summary') {

					// Safety check 1
					const summaryEl = tagEl.closest('.tag-summary-paragraph');
					const mdSource = summaryEl.getAttribute('md-source').trim();
					
					const escapedText = Utils.escapeRegExp(mdSource);
					const regex = new RegExp(escapedText, 'g');
					const matches = fileContent.match(regex);
					
					if (matches && matches.length > 1) {
					    new Notice ('⚠️ Can\'t safely remove/edit tag:\nSurrounding text repeated in source note.');
					    return;

					} else if ((matches && matches.length === 0) || !matches) {
						new Notice ('⚠️ Can\'t find tag in source note.\n');
					    return;
					}

					// Safety check 2
					if ((newContent == '' && !safeToEmptyFile) 
						|| Utils.contentChangedTooMuch(
							fileContentBackup, 
							newContent, 
							tag, 
							2)
						) 
					{
						new Notice('Tag Buddy: File change error.');
						newContent = fileContentBackup;

					} else if (newContent == '' && safeToEmptyFile) {
						new Notice('Tag Buddy: Tag removed. The note is empty.');
					}

					setTimeout(async () => {
						
						const tagParagraphEl = tagEl.closest('.tag-summary-paragraph');
						const tagSummaryBlock = tagEl.closest('.tag-summary-block');
						//const tagsToCheck = this.getTagsToCheckFromEl(tagSummaryBlock);
						const tagsToCheck = TagSummary.getTagsToCheckFromEl(tagSummaryBlock);
						const tagsInContent = Utils.tagsInString(tagParagraphEl.innerText);

						if (tagsToCheck.includes(tag)) {
							//let tagCount = this.tagsInString(tagParagraphEl.innerText, tag).length;
							const tagCount = Utils.countOccurrences(tagsToCheck, tagsInContent)
							
							if (tagCount >= 2) {
								this.plugin.tagSummary.update(tagSummaryBlock); 
								//this.updateSummaries(); // causes screen flicker
							    setTimeout(async () => { 
							    	//this.plugin.tagProcessor.run(); 
							    }, 200);

							} else {
								//console.log('last one, will remove paragraph')
								const notice = new Notice (tag + ' removed from paragraph.\n🔗 Open source note.', 5000);
								
								this.plugin.gui.removeElementWithAnimation(
									tagParagraphEl, 
									() => {
				    					setTimeout(async () => { 
				    						this.plugin.tagSummary.update(tagSummaryBlock); 
				    						tagParagraphEl.remove(); 
			    						}, 500);

									//this.updateSummaries(); // causes screen flicker
							    	setTimeout(async () => { 
							    		//this.plugin.tagProcessor.run(); 
							    	}, 800);
								});

								this.plugin.registerDomEvent(
									notice.noticeEl, 
									'click', 
									(e: Event) => {
							 	 		this.app.workspace.openLinkText(filePath, '');
									}
								);
							}

						} else {
							this.plugin.tagSummary.update(tagSummaryBlock); 
							//this.updateSummaries(); // causes screen flicker
						    setTimeout(async () => { 
						    	//this.plugin.tagProcessor.run(); 
						    }, 200);
							// this.refreshView(); // no need for this atm
						}
					}, 200);

					//await this.app.vault.modify(file, newContent);

				} else if (tagEl.getAttribute('type') == 'native-embed') {

					//await this.app.vault.modify(file, newContent);
					//console.log('edit in native embed')
					setTimeout(async () => { 
						//this.plugin.tagProcessor.processNativeEmbed(tagEl.closest('.markdown-embed'));

						//this.plugin.tagProcessor.run2(tagEl.closest('.markdown-embed'))
						this.plugin.tagProcessor.processNativeEmbed(tagContainer, true);

					}, 200)

					//await this.app.vault.modify(file, newContent);
				} else {

					this.plugin.tagProcessor.resume();
					
					setTimeout(async () => { 
						//this.plugin.tagProcessor.processNativeEmbed(tagEl.closest('.markdown-embed'));
					}, 200)
				}
				
				

 				await this.app.vault.modify(file, newContent);

 				// we do this on debounce in the mutation handler
 				setTimeout(async () => { 
					//this.plugin.tagProcessor.pause();
				}, 300);

			} catch (error) {

				try {

					const backupFileName = String(file.name.substring(0, file.name.indexOf('.md')) + ' BACKUP.md');
					this.app.vault.create(backupFileName, fileContentBackup);

					new Notice('⚠️ Tag/note editing error: ' + error.message + '\n' + backupFileName + ' saved to vault root.');
				
				} catch (error) {

					navigator.clipboard.writeText(fileContentBackup);
					new Notice('⚠️ Tag/note editing error: ' + error.message + '\nNote content copied to clipboard.');

				}
			} 

			setTimeout(async () => { 
				//this.plugin.tagProcessor.pause();
			}, 300);

		} else {
			//this.plugin.tagProcessor.run();
			new Notice('⚠️ Can\'t identify tag location. Please try again.');
		}
	}

}