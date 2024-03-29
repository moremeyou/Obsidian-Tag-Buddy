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

	//async renameTag (tag, newName, batchAction: string | number, specificFile:TFile = null) {
	async renameTag (tag, newName, batchAction: string | number, filePath: string = null, tagEl: HTMLElement) {
		
		//console.log (newName, batchAction, filePath)
	
		//const tagContainerType = tagEl.getAttribute(
		//	'type'
		//);
		//const index = tagEl.getAttribute(
		//	'md-index'
		//);
		//const filePath = tagEl.getAttribute(
		//	'file-source'
		//);
		
		const activeFile: TFile = await this.app.workspace.getActiveFile();
		const file: TFile = filePath == null ? activeFile : await Utils.validateFilePath(filePath);
		
		if (!file) return;

		const fileContent: string = await this.app.vault.read(file);
		//const file: TFile = await Utils.validateFilePath(filePath);

		if (typeof batchAction === 'number') {

        	//const file: TFile = await this.app.workspace.getActiveFile()
        	//const fileContent: String = await this.app.vault.read(file);
        	const newFileContent = this.renameTagInStringByIndex (
        		tag,
        		newName,
        		parseInt(batchAction),
        		fileContent
    		)
    		this.app.vault.modify(file, newFileContent);

        } else if (batchAction == 'note') {

        	//const file: TFile = await this.app.workspace.getActiveFile();
        	this.renameTagsInFileByIndex (
        		tag,
        		newName,
        		file
    		)

    		
           
        } else if (batchAction == 'vault') {
        	
	    	this.renameTagsInVaultByIndex (
	    		tag,
	    		newName
			)

			//if (activeFile != file) {
        		//this.app.workspace.activeLeaf.rebuildView()
        		//new Notice ('Tags have been updated in external notes. Please refresh this summary or reload this note.')
        	//}
           
        }

        if (activeFile != file && tagEl) {
        		//this.app.workspace.activeLeaf.rebuildView()
        		new Notice ('Refresh this summary to see changes.', 5000)
        	//console.log(tagEl.closest('.tag-summary-block'))
        	//this.plugin.tagSummary.update(tagEl.closest('.tag-summary-block')); 
    	}
        

    }

    async renameTagsInVaultByIndex (tag, newName) {

    	const validTags = [tag]
		let listFiles = this.app.vault.getMarkdownFiles();

		listFiles = listFiles.filter((file) => {
			// Remove files that do not contain the tags selected by the user
			const cache = this.app.metadataCache.getFileCache(file);
			const tagsInFile = getAllTags(cache);

			if (validTags.some((value) => tagsInFile?.includes(value))) {
				return true;
			}
			return false;
        });

        let listContents: [TFile, string][] = await this.plugin.tagSummary.readFiles(listFiles);
        // listContents[n][0] is the file, listContents[n][[1] is the file content
        
        listContents.forEach(async (note) => {
        	//this.renameTagInFile (tag, newName, note[0]);
        	this.renameTagsInFileByIndex (
        		tag,
        		newName,
        		note[0]
			)

        });

    }

    async renameTagsInFileByIndex (
    	tag: String, 
    	newName: String, 
    	file: TFile
	):Void {

    	const fileContent: String = await this.app.vault.read(file);
        let newFileContent: String = fileContent;
    	const tagPositions = this.plugin.tagProcessor.getMarkdownTags (file, fileContent);
    	// {tag:tag, index:match.index, source:file.name}

    	let filteredTagObjs = tagPositions.filter(tagObj => tagObj.tag === tag);

    	if (filteredTagObjs.length > 0) {

    		filteredTagObjs.sort((a, b) => a.index - b.index);
    		let offset = 0;
		    filteredTagObjs.forEach(tagObj => {
		        // Calculate the new index considering the offset
		        const newIndex: Number = tagObj.index + offset;
		        // Replace the tag at the correct position
		        newFileContent = newFileContent.substring(0, newIndex) + newName + newFileContent.substring(newIndex + tagObj.tag.length);
		        //newFileContent = this.renameTagInStringByIndex (tag, newName, newIndex, fileContent)
		        // Update the offset for the next iteration
		        offset += newName.length - tagObj.tag.length;
		    });

    		this.app.vault.modify(file, newFileContent);

    	} else {
    		//new Notice ('No tags to rename.')
    	}
    }

    renameTagInStringByIndex (
    	tag: String, 
    	newName: String, 
    	index: Number,
    	fileContent: String
	):String {
    	//console.log(fileContent)
    	const newContent: String = fileContent.substring (0, parseInt(index)) + newName + fileContent.substring((parseInt(index) + parseInt(tag.length)))
    	//console.log(newContent)
    	//console.log(index + tag.length)
    	return (newContent);
    	//this.app.vault.modify(file, newFileContent);

    }


	async add (
		tag: string, 
		x: number, 
		y: number//,
		//mobileObj: Object
	):void {
		if (this.plugin.settings.debugMode) { console.log('Tag Buddy add ' + tag + ' at (' + x + ', ' + y + ')'); }

		let fileContent: string;
		let file: TFile;
		const clickedTextObj = Utils.getClickedTextObjFromDoc(x, y);
		const clickedText: string = clickedTextObj?.text;
		const clickedTextIndex:number = clickedTextObj?.index; // this is the index in document, for narrowing down to the clicked word.
		const clickedTextEl: HTMLElement = clickedTextObj?.el;
		let contentSourceType: string = null
		let summaryEl: HTMLElement = undefined;
		let embedEl: HTMLElement = undefined;

//console.log(clickedTextObj)		
		if (clickedTextObj) {
			try {
				summaryEl = clickedTextEl?.closest('.tag-summary-paragraph');
				embedEl = clickedTextEl?.closest('.markdown-embed');
			} catch {
			}

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
		
		await this.app.vault.modify(file, newContent);

		if (contentSourceType == 'plugin-summary') {
			const summaryContainer = summaryEl.closest('.tag-summary-block')
			this.plugin.tagSummary.update(summaryContainer); 
		} else if (contentSourceType == 'native-embed') {
			//console.log('added to native embed:', embedEl)
			setTimeout(async () => { 
				this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
			}, 200);
		}
	}

	async edit (
		tagEl: HTMLElement, 
		event: Event, 
		pragraphEl: HTMLElement,
		editType: String,
		newName: String
	):void {
//console.log(tagEl)
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
			
			
			// Can't remember why I have this...
			// need to refactor all this line break space stuff
			if (fileContent[index] === '\n') beforeTag += '\n';
			let newContent = '';

			////////////////////////////////////////////////////////////////
			// TO-DO: REFACTOR
			////////////////////////////////////////////////////////////////

			if (editType == 'rename') { // this only happens from edit modal

				//newContent = this.renameTagInStringByIndex ('#'+tag, newName, index, fileContent);

			} else if (!event) { // then we're calling this method from a button. need to rethink how this is organized.
				
				newContent = beforeTag + afterTagChr + afterTag;

			} else if (editType == 'hash') { 
				// Remove the hash only
				const noHash = tag.substring(1);
				//newContent = beforeTag + (!beforeTag.endsWith(' ')?' ':'') + noHash + afterTag;
				newContent = beforeTag + noHash + afterTagChr + afterTag;
				
				if (this.app.isMobile && this.plugin.settings.mobileNotices) 
					{ new Notice ('Tag Buddy: ' + tag + ' converted to text.'); }
			
			/*} else if (((event.type == 'touchend') 
				|| this.plugin.settings.mobileTagSearch) 
					|| (Utils.ctrlCmdKey(event) && !this.plugin.settings.removeOnClick) 
					|| (!Utils.ctrlCmdKey(event) && this.plugin.settings.removeOnClick)
				) 
			{*/
			} else if (((event.type == 'touchend') 
				|| this.plugin.settings.mobileTagSearch) // don't need this check any more. 
					|| (editType == 'remove') 
				) 
			{

				// Remove tag (or child first, if exists)
				let parentTag = '';

				if (tag.includes('/') 

					//&& (this.plugin.settings.removeChildTagsFirst 
					//|| (event.shiftKey 
						//&& !this.plugin.settings.removeChildTagsFirst)
					)
					 
				{
					let parts = tag.split('/');
					const removedChild = parts.pop();
					parentTag = parts.join('/');
					newContent = beforeTag 
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
					// remove extra space
					
//console.log ('>' + beforeTag.substring(beforeTag.length-1) + afterTag.substring(0,1) + '<')
					/*if (beforeTag.substring(beforeTag.length-1) == ' ' && afterTag.substring(0,1) == ' ') {
						newContent = beforeTag + afterTag.substring(1);
					} else {
						newContent = beforeTag + afterTag;
					}*/

					const startsWithPunctuation = /^[.,!:?;]/.test(afterTag.trimStart()[0]);
//console.log('>'+afterTag.trimStart()[0]+'<')
					if (beforeTag.endsWith(' ') && afterTag.startsWith(' ')) {
				        newContent = beforeTag + afterTag.substring(1);
				    } else if (startsWithPunctuation) {
				    	newContent = beforeTag.trimEnd() + afterTag.trimStart();
				    } else {
				        // If there's no leading space in afterTag or special handling for punctuation isn't needed, concatenate directly
				        newContent = beforeTag + afterTag;
				    }

					if (this.app.isMobile 
						&& this.plugin.settings.mobileNotices) { 
						new Notice ('Tag Buddy: ' + tag + ' removed.'); 
					}
				}
			} 
			
			if (tagEl.getAttribute('type') == 'plugin-summary') {
			// can we be using tagContainerType from above?

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
					const tagsToCheck = TagSummary.getTagsToCheckFromEl(tagSummaryBlock);
					const tagsInContent = Utils.tagsInString(tagParagraphEl.innerText);

					if (tagsToCheck.includes(tag)) {
						const tagCount = Utils.countOccurrences(tagsToCheck, tagsInContent)
						
						if (tagCount >= 2) {
							this.plugin.tagSummary.update(tagSummaryBlock); 
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
					}
				}, 200);

			} else if (tagEl.getAttribute('type') == 'native-embed') {

				setTimeout(async () => { 
					this.plugin.tagProcessor.processNativeEmbed(tagContainer, true);
				}, 200)

			}

			try {

 				await this.app.vault.modify(file, newContent);

			} catch (error) {

				try {

					const backupFileName = String(file.name.substring(0, file.name.indexOf('.md')) + ' BACKUP.md');
					this.app.vault.create(backupFileName, fileContentBackup);

					new Notice('⚠️ Tag/note editing error: ' + error.message + '\n' + backupFileName + ' saved to vault root.', 10000);
				
				} catch (error) {

					navigator.clipboard.writeText(fileContentBackup);
					new Notice('⚠️ Tag/note editing error: ' + error.message + '\nNote content copied to clipboard.', 10000);

				}
			} 

			this.plugin.tagProcessor.debouncedProcessActiveFileTagEls();

		} else {
			new Notice('⚠️ Can\'t identify tag location. Please try again.');
		}
	}

}