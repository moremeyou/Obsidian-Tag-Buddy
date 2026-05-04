import { App, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import { TagSummary } from './TagSummary';
import * as Utils from './utils';

interface MarkdownTagPosition {
	tag: string;
	index: number;
	source: string;
}

export class ReadingModeTagEditor {
	app: App;
	plugin: TagBuddy;

	constructor(
		app: App,
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;
	}

	getValidatedTagIndex(
		tag: string,
		index: string | number | null,
		fileContent: string
	): number | null {
		const tagIndex = Number(index);
		if (!Number.isInteger(tagIndex) || tagIndex < 0) {
			new Notice('⚠️ Can\'t identify tag location. Please refresh and try again.');
			return null;
		}

		if (fileContent.substring(tagIndex, tagIndex + tag.length) !== tag) {
			new Notice('⚠️ Can\'t safely edit tag: source text changed. Edit blocked.');
			return null;
		}

		return tagIndex;
	}

	async refreshStaleTagSource(
		tagEl?: HTMLElement | null,
		tagContainer?: HTMLElement | null
	): Promise<void> {
		const tagContainerType = tagEl?.getAttribute('type');
		const activeFilePath = this.app.workspace.getActiveFile()?.path;
		const tagFilePath = tagEl?.getAttribute('file-source');
		let refreshNotice = 'Tag Buddy: Tried refreshing rendered tag positions. Try again.';

		try {
			if (tagContainerType == 'active' || tagFilePath == activeFilePath) {
				await this.plugin.tagProcessor.processActiveFileTags();
				refreshNotice = 'Tag Buddy: Refreshed rendered tag positions. Try again.';
			} else if (tagContainerType == 'native-embed') {
				const embedEl = tagContainer ?? tagEl?.closest('.markdown-embed') as HTMLElement;
				if (embedEl) {
					await this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
					refreshNotice = 'Tag Buddy: Refreshed embedded tag positions. Try again.';
				}
			} else if (tagContainerType == 'plugin-summary') {
				const paragraphEl = tagContainer ?? tagEl?.closest('.tag-summary-paragraph') as HTMLElement;
				if (paragraphEl) {
					await this.plugin.tagProcessor.processTagSummaryParagraph(paragraphEl);
					refreshNotice = 'Tag Buddy: Refreshed summary tag positions. Try again.';
				}
			} else {
				await this.plugin.tagProcessor.processActiveFileTags();
			}
		} catch (error) {
			if (this.plugin.settings.debugMode) console.warn('Tag Buddy stale tag refresh failed:', error);
		} finally {
			new Notice(refreshNotice, 5000);
		}
	}

	//async renameTag (tag, newName, batchAction: string | number, specificFile:TFile = null) {
	async renameTag (
		tag: string,
		newName: string,
		batchAction: string | number,
		filePath: string | null = null,
		tagEl?: HTMLElement | null
	): Promise<void> {

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

		const activeFile = this.app.workspace.getActiveFile();
		const file = filePath == null ? activeFile : await Utils.validateFilePath(filePath);

		if (!file) return;

		//const file: TFile = await Utils.validateFilePath(filePath);

		if (typeof batchAction === 'number') {

	//const file: TFile = await this.app.workspace.getActiveFile()
	const fileContent = await this.app.vault.read(file);
	const newFileContent = this.renameTagInStringByIndex (
		tag,
		newName,
		batchAction,
		fileContent
		)
		if (!newFileContent) {
			await this.refreshStaleTagSource(tagEl);
			return;
		}
		await this.app.vault.modify(file, newFileContent);

        } else if (batchAction == 'note') {

	//const file: TFile = await this.app.workspace.getActiveFile();
	await this.renameTagsInFileByIndex (
		tag,
		newName,
		file
		)



        } else if (batchAction == 'vault') {

		await this.renameTagsInVaultByIndex (
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

    async renameTagsInVaultByIndex (tag: string, newName: string): Promise<void> {

	const validTags = [tag]
		let listFiles = this.app.vault.getMarkdownFiles();

		listFiles = listFiles.filter((file) => {
			// Remove files that do not contain the tags selected by the user
			const cache = this.app.metadataCache.getFileCache(file);
			const tagsInFile = cache ? getAllTags(cache) : null;

			if (validTags.some((value) => tagsInFile?.includes(value))) {
				return true;
			}
			return false;
        });

        let listContents: [TFile, string][] = await this.plugin.tagSummary.readFiles(listFiles);
        // listContents[n][0] is the file, listContents[n][[1] is the file content

        for (const note of listContents) {
	//this.renameTagInFile (tag, newName, note[0]);
	await this.renameTagsInFileByIndex (
		tag,
		newName,
		note[0]
			)
        }

    }

    async renameTagsInFileByIndex (
	tag: string,
	newName: string,
	file: TFile
	): Promise<void> {

		if (!file) {
			new Notice('Tag Buddy: Can\'t identify file to rename.');
			return;
		}

	const fileContent = await this.app.vault.read(file);
        let newFileContent = fileContent;
	const tagPositions = this.plugin.tagProcessor.getMarkdownTags (file, fileContent) as MarkdownTagPosition[];
	// {tag:tag, index:match.index, source:file.path}

	let filteredTagObjs = tagPositions.filter(tagObj => tagObj.tag === tag);

	if (filteredTagObjs.length > 0) {

		filteredTagObjs.sort((a, b) => a.index - b.index);
		let offset = 0;
		    for (const tagObj of filteredTagObjs) {
		        // Calculate the new index considering the offset
	        const newIndex = tagObj.index + offset;
		        // Replace the tag at the correct position
		        const updatedContent = this.renameTagInStringByIndex(tagObj.tag, newName, newIndex, newFileContent);
		        if (!updatedContent) return;
		        newFileContent = updatedContent;
		        //newFileContent = this.renameTagInStringByIndex (tag, newName, newIndex, fileContent)
		        // Update the offset for the next iteration
		        offset += newName.length - tagObj.tag.length;
		    }

		await this.app.vault.modify(file, newFileContent);

	} else {
		//new Notice ('No tags to rename.')
	}
    }

    renameTagInStringByIndex (
	tag: string,
	newName: string,
	index: number,
	fileContent: string
	): string | null {
	//console.log(fileContent)
	const tagIndex = this.getValidatedTagIndex(tag, index, fileContent);
	if (tagIndex == null) return null;
	const newContent = fileContent.substring (0, tagIndex) + newName + fileContent.substring((tagIndex + tag.length))
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
		): Promise<void> {
			if (this.plugin.settings.debugMode) { console.log('Tag Buddy add ' + tag + ' at (' + x + ', ' + y + ')'); }

			let fileContent = '';
			let file: TFile | null = null;
			const clickedTextObj = Utils.getClickedTextObjFromDoc(x, y);
			if (!clickedTextObj) {
				new Notice ('⚠️ Can\'t find text position or area too busy.\nTry a another text area.');
			    return;
			}
			const clickedText = clickedTextObj.text;
			const clickedTextIndex = clickedTextObj.index; // this is the index in document, for narrowing down to the clicked word.
			const clickedTextEl = clickedTextObj.el instanceof HTMLElement ? clickedTextObj.el : null;
			let contentSourceType: string | null = null
			let summaryEl: HTMLElement | null = null;
			let embedEl: HTMLElement | null = null;

//console.log(clickedTextObj)
			if (!clickedTextEl) {
				new Notice ('⚠️ Can\'t find text position or area too busy.\nTry a another text area.');
			    return;
			}

			summaryEl = clickedTextEl.closest('.tag-summary-paragraph') as HTMLElement | null;
			embedEl = clickedTextEl.closest('.markdown-embed') as HTMLElement | null;

			if (summaryEl) {
//console.log('is summary')
				file = await this.plugin.tagSummary.getFile(summaryEl);
				if (!file) {
					new Notice ('⚠️ Can\'t identify source note for this summary item.');
					return;
				}
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'plugin-summary';

			} else if (embedEl) {
//console.log('is embed')
				file = await Utils.getEmbedFile(embedEl);
				if (!file) {
					new Notice ('⚠️ Can\'t identify source note for this embed.');
					return;
				}
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'native-embed';

			} else {
//console.log('is active file')
				file = this.app.workspace.getActiveFile();
				if (!file) {
					new Notice ('⚠️ Can\'t identify active note.');
					return;
				}
				fileContent = await this.app.vault.read(file);
				contentSourceType = 'active';
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

			const firstMatch = regex.exec(fileContent);
			if (!firstMatch) {
				new Notice ('⚠️ Can\'t find text position or area too busy.\nTry a another text area.');
			    return;
			}
			const startIndex = firstMatch.index; // this is the index in the md source
		const endIndex = startIndex + clickedText.length; // use this to add tag at end of block

		const clickedWordObj = Utils.getWordObjFromString (clickedText, clickedTextIndex);
		const clickedWord = clickedWordObj.text;
		const clickedWordIndex = clickedWordObj.index;
			let newContent = '';

			if (clickedWord && clickedWordIndex != null) {
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
				const summaryContainer = summaryEl?.closest('.tag-summary-block') as HTMLElement | null;
				if (summaryContainer) this.plugin.tagSummary.update(summaryContainer);
			} else if (contentSourceType == 'native-embed') {
				//console.log('added to native embed:', embedEl)
				setTimeout(async () => {
					if (embedEl) await this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
				}, 200);
			}
		}

		async edit (
			tagEl: HTMLElement,
			event: Event | null,
			pragraphEl: HTMLElement | null,
			editType: string,
			newName: string = ''
		): Promise<void> {
//console.log(tagEl)
		if (!tagEl) {
			new Notice('⚠️ Can\'t identify tag location. Please try again.');
			return;
		}

			let tagContainer: HTMLElement | null = null;
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

			if (tagContainerType == 'native-embed') tagContainer = tagEl.closest('.markdown-embed') as HTMLElement | null;
			else if (tagContainerType == 'plugin-summary') tagContainer = tagEl.closest('.tag-summary-paragraph') as HTMLElement | null;
			else {
				const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
				tagContainer = activeView?.containerEl.querySelector('.markdown-reading-view') as HTMLElement | null;
			}

		if (filePath) {

				const file = await Utils.validateFilePath(filePath);
				if (!file) return;

				let fileContent: string;
				let fileContentBackup: string;
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

			const tagIndex = this.getValidatedTagIndex(tag, index, fileContent);
			if (tagIndex == null) {
				await this.refreshStaleTagSource(tagEl, tagContainer);
				return;
			}

			let beforeTag = fileContent.substring(0, tagIndex);
			//let afterTag = fileContent.substring((Number(index)+Number(tag.length)+1));
			let afterTag = fileContent.substring(
				tagIndex + Number(tag.length)
			);

			//console.log (JSON.stringify(beforeTag));
			//console.log (JSON.stringify(tag));
			//console.log (JSON.stringify(afterTag));

			let afterTagChr = '';


			// Can't remember why I have this...
			// need to refactor all this line break space stuff
			if (fileContent[tagIndex] === '\n') beforeTag += '\n';
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

			let refreshAfterModify = () => {};

			if (tagEl.getAttribute('type') == 'plugin-summary') {
			// can we be using tagContainerType from above?

				// Safety check 1
					const summaryEl = tagEl.closest('.tag-summary-paragraph');
					const mdSource = summaryEl?.getAttribute('md-source')?.trim();
					if (!mdSource) {
						new Notice ('⚠️ Can\'t identify source text for this summary item.');
						return;
					}

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

					refreshAfterModify = () => setTimeout(async () => {

						const tagParagraphEl = tagEl.closest('.tag-summary-paragraph') as HTMLElement | null;
						const tagSummaryBlock = tagEl.closest('.tag-summary-block') as HTMLElement | null;
						if (!tagParagraphEl || !tagSummaryBlock) return;
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

					refreshAfterModify = () => setTimeout(async () => {
						if (tagContainer) await this.plugin.tagProcessor.processNativeEmbed(tagContainer, true);
					}, 200)

			}

			try {

				await this.app.vault.modify(file, newContent);
				refreshAfterModify();

			} catch (error) {

				try {

					const backupFileName = String(file.name.substring(0, file.name.indexOf('.md')) + ' BACKUP.md');
					await this.app.vault.create(backupFileName, fileContentBackup);

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
