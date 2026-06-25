import { App, TFile, getAllTags, MarkdownView, Notice } from 'obsidian';
import TagBuddy from "main";
import { TagSummary } from './TagSummary';
import * as Utils from './utils';
import {
	NOTICE_TEXT,
	childTagRemovedFromParent,
	fileReadError,
	tagConvertedToText,
	tagNoteEditingErrorBackup,
	tagNoteEditingErrorClipboard,
	tagRemoved,
	tagRemovedFromParagraph,
} from './userText';

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
			new Notice(NOTICE_TEXT.cannotIdentifyTagLocationRefresh);
			return null;
		}

		if (fileContent.substring(tagIndex, tagIndex + tag.length) !== tag) {
			new Notice(NOTICE_TEXT.cannotSafelyEditChangedSource);
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
		let refreshNotice: string = NOTICE_TEXT.refreshRenderedTagPositionsAttempt;

		try {
			if (tagContainerType == 'active' || tagFilePath == activeFilePath) {
				await this.plugin.tagProcessor.processActiveFileTags();
				refreshNotice = NOTICE_TEXT.refreshRenderedTagPositionsSuccess;
			} else if (tagContainerType == 'native-embed') {
				const embedEl = tagContainer ?? (tagEl?.closest('.markdown-embed') as HTMLElement | null);
				if (embedEl) {
					await this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
					refreshNotice = NOTICE_TEXT.refreshEmbeddedTagPositionsSuccess;
				}
			} else if (tagContainerType == 'plugin-summary') {
				const paragraphEl = tagContainer ?? (tagEl?.closest('.tag-summary-paragraph') as HTMLElement | null);
				if (paragraphEl) {
					await this.plugin.tagProcessor.processTagSummaryParagraph(paragraphEl);
					refreshNotice = NOTICE_TEXT.refreshSummaryTagPositionsSuccess;
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

	async renameTag (
		tag: string,
		newName: string,
		batchAction: string | number,
		filePath: string | null = null,
		tagEl?: HTMLElement | null
	): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		const file = filePath == null ? activeFile : await Utils.validateFilePath(filePath);

		if (!file) return;

		if (typeof batchAction === 'number') {
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
		}

		if (activeFile != file && tagEl) {
			new Notice(NOTICE_TEXT.refreshSummaryToSeeChanges, 5000)
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

		for (const note of listContents) {
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
			new Notice(NOTICE_TEXT.cannotIdentifyFileToRename);
			return;
		}

		const fileContent = await this.app.vault.read(file);
		let newFileContent = fileContent;
		const tagPositions = this.plugin.tagProcessor.getMarkdownTags (file, fileContent) as MarkdownTagPosition[];
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
				// Update the offset for the next iteration
				offset += newName.length - tagObj.tag.length;
			}

			await this.app.vault.modify(file, newFileContent);
		}
	}

	renameTagInStringByIndex (
		tag: string,
		newName: string,
		index: number,
		fileContent: string
	): string | null {
		const tagIndex = this.getValidatedTagIndex(tag, index, fileContent);
		if (tagIndex == null) return null;
		const newContent = fileContent.substring (0, tagIndex) + newName + fileContent.substring((tagIndex + tag.length))
		return (newContent);
	}


	async add (
		tag: string,
		x: number,
		y: number
	): Promise<void> {
		if (this.plugin.settings.debugMode) {
			console.log('Tag Buddy add ' + tag + ' at (' + x + ', ' + y + ')');
		}

		let fileContent = '';
		let file: TFile | null = null;
		const clickedTextObj = Utils.getClickedTextObjFromDoc(x, y);
		if (!clickedTextObj) {
			new Notice(NOTICE_TEXT.cannotFindStableTextPosition);
			return;
		}

		const clickedText = clickedTextObj.text;
		const clickedTextIndex = clickedTextObj.index;
		const clickedTextEl = clickedTextObj.el instanceof HTMLElement ? clickedTextObj.el : null;
		let contentSourceType: string | null = null;
		let summaryEl: HTMLElement | null = null;
		let embedEl: HTMLElement | null = null;

		if (!clickedTextEl) {
			new Notice(NOTICE_TEXT.cannotFindStableTextPosition);
			return;
		}

		summaryEl = clickedTextEl.closest('.tag-summary-paragraph') as HTMLElement | null;
		embedEl = clickedTextEl.closest('.markdown-embed') as HTMLElement | null;

		if (summaryEl) {
			file = await this.plugin.tagSummary.getFile(summaryEl);
			if (!file) {
				new Notice(NOTICE_TEXT.cannotIdentifySummaryItemSource);
				return;
			}
			fileContent = await this.app.vault.read(file);
			contentSourceType = 'plugin-summary';

		} else if (embedEl) {
			file = await Utils.getEmbedFile(embedEl);
			if (!file) {
				new Notice(NOTICE_TEXT.cannotIdentifyEmbedSource);
				return;
			}
			fileContent = await this.app.vault.read(file);
			contentSourceType = 'native-embed';

		} else {
			file = this.app.workspace.getActiveFile();
			if (!file) {
				new Notice(NOTICE_TEXT.cannotIdentifyActiveNote);
				return;
			}
			fileContent = await this.app.vault.read(file);
			contentSourceType = 'active';
		}

		if (!clickedText) {
			new Notice(NOTICE_TEXT.cannotAddTagNoText);
			return;
		}

		const escapedClickedText = Utils.escapeRegExp(clickedText);
		const regex = new RegExp(escapedClickedText, 'g');
		const matches = fileContent.match(regex);

		if (matches && matches.length > 1) {
			new Notice(NOTICE_TEXT.cannotAddTagRepeatedText);
			return;
		} else if ((matches && matches.length === 0) || !matches) {
			new Notice(NOTICE_TEXT.cannotFindStableTextPosition);
			return;
		}

		if (!this.plugin.settings.lockRecentTags) this.plugin.saveRecentTag(tag);

		const firstMatch = regex.exec(fileContent);
		if (!firstMatch) {
			new Notice(NOTICE_TEXT.cannotFindStableTextPosition);
			return;
		}
		const startIndex = firstMatch.index;
		const endIndex = startIndex + clickedText.length;

		const clickedWordObj = Utils.getWordObjFromString (clickedText, clickedTextIndex);
		const clickedWord = clickedWordObj.text;
		const clickedWordIndex = clickedWordObj.index;
		let newContent = '';

		if (clickedWord && clickedWordIndex != null) {
			if (Utils.isWordNearEnd(clickedText, clickedWord)) {
				newContent = Utils.insertTextInString(' ' + tag, fileContent, endIndex);
			} else {
				newContent = Utils.insertTextInString(tag, fileContent, startIndex + clickedWordIndex);
			}
		} else {
			new Notice(NOTICE_TEXT.cannotFindClickedWord);
			return;
		}

		await this.app.vault.modify(file, newContent);

		if (contentSourceType == 'plugin-summary') {
			const summaryContainer = summaryEl?.closest('.tag-summary-block') as HTMLElement | null;
			if (summaryContainer) this.plugin.tagSummary.update(summaryContainer);
		} else if (contentSourceType == 'native-embed') {
			setTimeout(async () => {
				if (embedEl) await this.plugin.tagProcessor.processNativeEmbed(embedEl, true);
			}, 200);
		}
	}

	private getTagSourceContainer(
		tagEl: HTMLElement,
		tagContainerType: string | null
	): HTMLElement | null {
		if (tagContainerType == 'native-embed') {
			return tagEl.closest('.markdown-embed') as HTMLElement | null;
		}
		if (tagContainerType == 'plugin-summary') {
			return tagEl.closest('.tag-summary-paragraph') as HTMLElement | null;
		}

		const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
		return activeView?.containerEl.querySelector('.markdown-reading-view') as HTMLElement | null;
	}

	private showMobileEditNotice(message: string): void {
		if (this.app.isMobile && this.plugin.settings.mobileNotices) {
			new Notice(message);
		}
	}

	private buildTagEditContent(
		tag: string,
		beforeTag: string,
		afterTag: string,
		event: Event | null,
		editType: string
	): string {
		if (editType == 'rename') return '';
		if (!event) return beforeTag + afterTag;

		if (editType == 'hash') {
			this.showMobileEditNotice(tagConvertedToText(tag));
			return beforeTag + tag.substring(1) + afterTag;
		}

		if (event.type == 'touchend'
			|| this.plugin.settings.mobileTagSearch
			|| editType == 'remove'
		) {
			return this.buildTagRemoveContent(tag, beforeTag, afterTag);
		}

		return '';
	}

	private buildTagRemoveContent(
		tag: string,
		beforeTag: string,
		afterTag: string
	): string {
		if (tag.includes('/')) {
			const parts = tag.split('/');
			const removedChild = parts.pop();
			this.showMobileEditNotice(childTagRemovedFromParent(removedChild));
			return beforeTag + parts.join('/') + afterTag;
		}

		this.showMobileEditNotice(tagRemoved(tag));
		return this.removeFullTagFromSourceParts(beforeTag, afterTag);
	}

	private removeFullTagFromSourceParts(
		beforeTag: string,
		afterTag: string
	): string {
		const startsWithPunctuation = /^[.,!:?;]/.test(afterTag.trimStart()[0]);
		if (beforeTag.endsWith(' ') && afterTag.startsWith(' ')) {
			return beforeTag + afterTag.substring(1);
		}
		if (startsWithPunctuation) {
			return beforeTag.trimEnd() + afterTag.trimStart();
		}
		return beforeTag + afterTag;
	}

	private summarySourceMappingIsStable(
		tagEl: HTMLElement,
		fileContent: string
	): boolean {
		const summaryEl = tagEl.closest('.tag-summary-paragraph');
		const mdSource = summaryEl?.getAttribute('md-source')?.trim();
		if (!mdSource) {
			new Notice(NOTICE_TEXT.cannotIdentifySummaryItemSourceText);
			return false;
		}

		const escapedText = Utils.escapeRegExp(mdSource);
		const regex = new RegExp(escapedText, 'g');
		const matches = fileContent.match(regex);

		if (matches && matches.length > 1) {
			new Notice(NOTICE_TEXT.cannotSafelyEditRepeatedSummarySource);
			return false;
		}
		if ((matches && matches.length === 0) || !matches) {
			new Notice(NOTICE_TEXT.cannotFindTagInSourceNote);
			return false;
		}

		return true;
	}

	private applySummaryEditSafety(
		newContent: string,
		fileContentBackup: string,
		tag: string,
		safeToEmptyFile: boolean
	): string {
		if ((newContent == '' && !safeToEmptyFile)
			|| Utils.contentChangedTooMuch(
				fileContentBackup,
				newContent,
				tag,
				2)
		) {
			new Notice(NOTICE_TEXT.fileChangeError);
			return fileContentBackup;
		}

		if (newContent == '' && safeToEmptyFile) {
			new Notice(NOTICE_TEXT.tagRemovedEmptyNote);
		}

		return newContent;
	}

	private makeSummaryRefreshAfterModify(
		tagEl: HTMLElement,
		tag: string,
		filePath: string
	): () => void {
		return () => setTimeout(() => {
			void this.refreshSummaryAfterTagEdit(tagEl, tag, filePath);
		}, 200);
	}

	private async refreshSummaryAfterTagEdit(
		tagEl: HTMLElement,
		tag: string,
		filePath: string
	): Promise<void> {
		const tagParagraphEl = tagEl.closest('.tag-summary-paragraph') as HTMLElement | null;
		const tagSummaryBlock = tagEl.closest('.tag-summary-block') as HTMLElement | null;
		if (!tagParagraphEl || !tagSummaryBlock) return;

		const tagsToCheck = TagSummary.getTagsToCheckFromEl(tagSummaryBlock);
		const tagsInContent = Utils.tagsInString(tagParagraphEl.innerText);

		if (!tagsToCheck.includes(tag)) {
			this.plugin.tagSummary.update(tagSummaryBlock);
			return;
		}

		const tagCount = Utils.countOccurrences(tagsToCheck, tagsInContent)
		if (tagCount >= 2) {
			this.plugin.tagSummary.update(tagSummaryBlock);
			return;
		}

		const notice = new Notice(tagRemovedFromParagraph(tag), 5000);
		this.plugin.gui.removeElementWithAnimation(
			tagParagraphEl,
			() => {
				setTimeout(async () => {
					this.plugin.tagSummary.update(tagSummaryBlock);
					tagParagraphEl.remove();
				}, 500);
			}
		);

		this.plugin.registerDomEvent(
			notice.noticeEl,
			'click',
			() => {
				this.app.workspace.openLinkText(filePath, '');
			}
		);
	}

	private makeNativeEmbedRefreshAfterModify(tagContainer: HTMLElement | null): () => void {
		return () => setTimeout(async () => {
			if (tagContainer) await this.plugin.tagProcessor.processNativeEmbed(tagContainer, true);
		}, 200)
	}

	async edit (
		tagEl: HTMLElement,
		event: Event | null,
		_paragraphEl: HTMLElement | null,
		editType: string,
		newName: string = ''
	): Promise<void> {
		if (!tagEl) {
			new Notice(NOTICE_TEXT.cannotIdentifyTagLocationTryAgain);
			return;
		}

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

		const tagContainer = this.getTagSourceContainer(tagEl, tagContainerType);

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
				new Notice(fileReadError(error.message));
				return;
			}

			const safeToEmptyFile = /^\s*#(\w+)\s*$/.test(fileContent.trim());

			const tagIndex = this.getValidatedTagIndex(tag, index, fileContent);
			if (tagIndex == null) {
				await this.refreshStaleTagSource(tagEl, tagContainer);
				return;
			}

			const beforeTag = fileContent.substring(0, tagIndex);
			const afterTag = fileContent.substring(
				tagIndex + Number(tag.length)
			);
			let newContent = this.buildTagEditContent(tag, beforeTag, afterTag, event, editType);

			let refreshAfterModify = () => {};

			if (tagContainerType == 'plugin-summary') {
				if (!this.summarySourceMappingIsStable(tagEl, fileContent)) return;
				newContent = this.applySummaryEditSafety(newContent, fileContentBackup, tag, safeToEmptyFile);
				refreshAfterModify = this.makeSummaryRefreshAfterModify(tagEl, tag, filePath);

			} else if (tagContainerType == 'native-embed') {
				refreshAfterModify = this.makeNativeEmbedRefreshAfterModify(tagContainer);
			}

			try {

				await this.app.vault.modify(file, newContent);
				refreshAfterModify();

			} catch (error) {

				try {

					const backupFileName = String(file.name.substring(0, file.name.indexOf('.md')) + ' BACKUP.md');
					await this.app.vault.create(backupFileName, fileContentBackup);

					new Notice(tagNoteEditingErrorBackup(error.message, backupFileName), 10000);

				} catch (error) {

					navigator.clipboard.writeText(fileContentBackup);
					new Notice(tagNoteEditingErrorClipboard(error.message), 10000);

				}
			}

			this.plugin.tagProcessor.debouncedProcessActiveFileTagEls();

		} else {
			new Notice(NOTICE_TEXT.cannotIdentifyTagLocationTryAgain);
		}
	}

}
