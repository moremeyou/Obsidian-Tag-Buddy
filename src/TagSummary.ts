import { App, MarkdownRenderer, MarkdownPostProcessorContext, DropdownComponent, Component, TFile, getAllTags, Notice } from 'obsidian';
import TagBuddy from "main";
import * as Utils from './utils';
import {
	TAG_SUMMARY_BLOCK_SPLIT_PATTERN,
	TAG_SUMMARY_EXCLUDE_PREFIX_PATTERN,
	TAG_SUMMARY_INCLUDE_PREFIX_PATTERN,
	TAG_SUMMARY_MAX_LINE_PATTERN,
	TAG_SUMMARY_SECTIONS_PREFIX_PATTERN,
	TAG_SUMMARY_TAG_TOKEN_PATTERN,
	TAG_SUMMARY_TAGS_PREFIX_PATTERN,
	createTagSummaryBlockLinkPattern,
	createTagSummaryMatchedTagPattern,
	createTagSummaryParagraphTagPattern,
	createTagSummarySectionsLinePattern,
	createTagSummaryTagListLinePattern,
} from './tagPatterns';
import type { TagSummaryTagListField } from './tagPatterns';
import {
	NOTICE_TEXT,
	copiedToSection,
	copiedToSectionCannotUpdateSource,
	copiedToSectionInNote,
	sectionNotFoundPastingTop,
	tagSummaryEmptyHtml,
} from './userText';

const SUMMARY_CODEBLOCK_ATTRS = {
	tags: 'codeblock-tags',
	include: 'codeblock-tags-include',
	exclude: 'codeblock-tags-exclude',
	sections: 'codeblock-sections',
	max: 'codeblock-max',
	code: 'codeblock-code',
} as const;

interface SummaryCodeBlockAttrs {
	tags: string[];
	include: string[];
	exclude: string[];
	sections: string[];
	max: number;
	mdSource: string;
}

interface SummaryItemLinkInfo {
	summaryLink: string;
	sourcePath: string;
}

type SummaryCopyMode = 'link' | 'copy' | 'move' | 'note';

export class TagSummary {
	app: App;
	plugin: TagBuddy;
	selectedBlocks: number[];

	constructor(
		app: App,
		plugin: TagBuddy
	) {
		this.app = app;
		this.plugin = plugin;
	}

	async bakeSummaryBtnHandler (
		summaryMd: string,
		summaryEl: HTMLElement,
		filePath: string
	) {
		const mdSource = summaryEl.getAttribute(SUMMARY_CODEBLOCK_ATTRS.code);

		if (mdSource) {
			const file = await this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				new Notice(NOTICE_TEXT.cannotIdentifySourceNoteForSummary);
				return;
			}
			const fileContent = await this.app.vault.read(file);
			const newFileContent = Utils.replaceTextInString (
				mdSource,
				fileContent,
				summaryMd
			);
			await this.app.vault.modify(file, newFileContent);

			new Notice(NOTICE_TEXT.tagSummaryFlattenedToActiveNote);
		} else {
			new Notice(NOTICE_TEXT.cannotFindSummaryCodeBlockSourceBug);
		}
	}

	copyBtnHandler (e: Event, content: string): void {
		const selection = window.getSelection()?.toString() ?? '';

		if (selection != '') {
			navigator.clipboard.writeText(selection);
			new Notice(NOTICE_TEXT.selectionCopiedToClipboard);
		} else {
			navigator.clipboard.writeText(content);
			new Notice(NOTICE_TEXT.taggedParagraphCopiedToClipboard);
		}
	}

	async removeTagBtnHandler (e: Event, paragraphEl: HTMLElement, tag: string): Promise<void> {
		if (!tag) {
			new Notice(NOTICE_TEXT.cannotIdentifyTagSummaryItem);
			return;
		}
		const tagEl = Utils.getTagElement(paragraphEl, tag);
		const summaryEl = paragraphEl.closest('.tag-summary-block') as HTMLElement | null;
		if (!tagEl || !summaryEl) {
			new Notice(NOTICE_TEXT.cannotIdentifyTagSummaryItem);
			return;
		}
		await this.plugin.tagEditor.edit(tagEl, e, paragraphEl, 'remove', '');
		setTimeout(async () => {
			this.update(summaryEl);
		}, 800);
	}

	async copyToBtnHandler (
		e: Event,
		mode: SummaryCopyMode,
		dropdown: DropdownComponent,
		paragraphEl: HTMLElement,
		summaryEl: HTMLElement,
		content: string,
		tags: string[],
		filePath: string,
		selectedFile: TFile | null = null
	): Promise<void> {
		const section = dropdown.getValue();
		const selection = window.getSelection()?.toString() ?? '';
		const newContent = this.buildCopyToContent(mode, content, selection, tags, filePath);
		let notice;

		const copySuccess = await this.copyTextToSection(
			newContent,
			section,
			filePath,
			mode != 'link',
			selectedFile
		);

		if (copySuccess) {
			if (mode == 'note') {
				if (!selectedFile) {
					new Notice(NOTICE_TEXT.cannotIdentifyDestinationNote);
					return;
				}

				notice = new Notice(
					copiedToSectionInNote(section, selectedFile.name),
					5000
				);
				this.registerNoticeLinkToSection(notice, selectedFile.path, section);

			} else if (mode == 'move' && !selection) {
				const file = await this.app.vault.getAbstractFileByPath(filePath.split('#')[0]);
				if (!(file instanceof TFile)) {
					new Notice(NOTICE_TEXT.cannotIdentifySummaryItemSourceShort);
					return;
				}

				let fileContent = await this.app.vault.read(file);
				fileContent = fileContent.trim();
				const newFileContent = Utils.replaceTextInString(
					content.trim(),
					fileContent,
					newContent
				).trim();
				if (fileContent != newFileContent) {
					await this.app.vault.modify(file, newFileContent);

					notice = new Notice(
						this.getCopiedToSectionNoticeText(section),
						5000
					);

					setTimeout(async () => {
						this.update(summaryEl);
					}, 300);

					this.registerNoticeLinkToActiveSection(notice, section);

				} else {
					new Notice(copiedToSectionCannotUpdateSource(section));
				}

			} else if (mode == 'copy' || mode == 'link') {
				notice = new Notice (this.getCopiedToSectionNoticeText(section));
				this.registerNoticeLinkToActiveSection(notice, section);
			}
		}
	}

	async makeSummaryBtnHandler (
		summaryMd: string,
		tags: string[],
		code: boolean = false,
		incrementFile: boolean = false
	): Promise<void> {
		const newNoteObj = Utils.fileObjFromTags(tags);
		let fileContent = code ? summaryMd : '## ' + newNoteObj.title + '\n\n' + summaryMd;
		const filePath = Utils.getActiveFileFolder(this.app.workspace.getActiveFile()) ?? '';
		const fileName = filePath + newNoteObj.fileName;
		const file = this.app.vault.getAbstractFileByPath(fileName);
		let notice;

		if (file instanceof TFile && !incrementFile) {

			notice = new Notice(NOTICE_TEXT.noteAlreadyExistsOverwrite, 8000);
			this.plugin.registerDomEvent(notice.noticeEl, 'click', async (e) => {
				await this.app.vault.modify(file, fileContent);
				notice = new Notice(NOTICE_TEXT.noteUpdatedOpen, 5000);
				this.plugin.registerDomEvent(notice.noticeEl, 'click', () => {
					this.app.workspace.openLinkText(fileName, '');
				});
			});

		} else if (!file) {
			await this.app.vault.create(fileName, fileContent);
			const notice = new Notice(NOTICE_TEXT.summaryNoteCreatedOpen);
			this.plugin.registerDomEvent(notice.noticeEl, 'click', () => {
				this.app.workspace.openLinkText(newNoteObj.fileName, '');
			});
		}
	}

	async createCodeBlock (tagsArray: string[], pos: string): Promise<void> {
		const codeBlockString =
			'```tag-summary\n' +
			'tags: ' + tagsArray.join(' ') + '\n' +
			'```';

		if (pos == 'note') {
			await this.makeSummaryBtnHandler (codeBlockString, tagsArray, true);
		} else {
			await this.copyTextToSection(
				codeBlockString,
				pos,
				'',
				false
			);
		}
	}

	async codeBlockProcessor (
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		let tags: string[] = [];
		let include: string[] = [];
		let exclude: string[] = [];
		let sections: string[] = [];
		let max = 50;

		// Parse tag-summary directive rows; invalid directive rows are ignored.
		const rows = source.split('\n').filter((row) => row.length > 0);
		rows.forEach((line) => {
			tags = this.parseTagSummaryTagListLine(line, 'tags') ?? tags;
			include = this.parseTagSummaryTagListLine(line, 'include') ?? include;
			exclude = this.parseTagSummaryTagListLine(line, 'exclude') ?? exclude;

			if (line.match(createTagSummarySectionsLinePattern())) {
				const content = line.replace(TAG_SUMMARY_SECTIONS_PREFIX_PATTERN, '').trim();
				sections = content.split(',').map((sec) => sec.trim());
			}

			const match = line.match(TAG_SUMMARY_MAX_LINE_PATTERN);
			if (match) {
				max = Math.min(50, Number(match[1]));
			}
		});

		const codeBlock = '```tag-summary\n' + source.trim() + '\n```';
		if (tags.length > 0 || include.length > 0) {
			await this.create(
				el,
				tags,
				include,
				exclude,
				sections,
				max,
				ctx.sourcePath,
				codeBlock
			);
		} else {
			this.createEmpty(
				el,
				tags ? tags : [],
				include ? include : [],
				exclude ? exclude : [],
				sections ? sections : [],
				max,
				ctx.sourcePath ? ctx.sourcePath : '',
				codeBlock
			);
		}
	}

	createEmpty(
		element: HTMLElement,
		tags: string[],
		include: string[],
		exclude: string[],
		sections: string[],
		max: number,
		fileCtx: string,
		mdSource: string
	): void {
		const container = createEl('div');
		const textDiv = createEl('blockquote');
		textDiv.innerHTML = tagSummaryEmptyHtml(tags);

		container.appendChild(textDiv);
		TagSummary.writeCodeBlockAttrs(container, {
			tags,
			include,
			exclude,
			sections,
			max,
			mdSource
		});

		container.appendChild(this.plugin.gui.makeSummaryRefreshButton(container));

		element.replaceWith(container);
	}

	async create(
		element: HTMLElement,
		tags: string[],
		include: string[],
		exclude: string[],
		sections: string[],
		max: number,
		fileCtx: string,
		mdSource: string
	): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		const validTags = tags.concat(include);
		const tempComponent = new TempComponent();
		const summaryContainer = createEl('div');
		this.selectedBlocks = [];

		summaryContainer.setAttribute(
			'class',
			'tag-summary-block'
		);

		let listFiles = this.app.vault.getMarkdownFiles();

		listFiles = listFiles.filter((file) => {
			const cache = this.app.metadataCache.getFileCache(file);
			const tagsInFile = cache ? getAllTags(cache) : null;
			if (file.path.includes('_exclude')) return false;
			if (activeFile && activeFile.path == file.path) return false;

			if (validTags.some((value) => tagsInFile?.includes(value))) {
				return true;
			}
			return false;
		});

		listFiles = listFiles.sort((file1, file2) => {
			return file2.stat.ctime - file1.stat.ctime;
		});

		const listContents: [TFile, string][] = await this.readFiles(listFiles);
		let count = 0;
		let summary: string = "";

		// Build source paragraphs first; each item is rendered by Obsidian below.
		for (const item of listContents) {
			const fileName = item[0].name.replace(/.md$/g, '');
			const filePath = item[0].path;

			const blocks = item[1]
				.split(TAG_SUMMARY_BLOCK_SPLIT_PATTERN)
				.filter((row) => row.trim().length > 0);

			const listParagraphs = blocks.filter((paragraph) => {
				const listTags = paragraph.match(createTagSummaryParagraphTagPattern());
				if (!listTags || listTags.length <= 0) return false;
				if (paragraph.includes("```") || paragraph.includes("---")) return false;
				return this.isValidText(listTags, tags, include, exclude);
			});

			for (let paragraph of listParagraphs) {
				if (count >= max) break;
				count++;

				paragraph += '\n';

				const tagSection = this.getMatchedSummaryTag(paragraph, tags);
				const linkInfo = this.getSummaryItemLinkInfo(paragraph, filePath, fileName);

				const buttonContainer = createEl('div');
				buttonContainer.setAttribute('class', 'tagsummary-buttons');

				const paragraphEl = createEl('blockquote');
				paragraphEl.setAttribute('file-source', filePath);
				paragraphEl.setAttribute('index', String(count - 1));
				paragraphEl.setAttribute('class', 'tag-summary-paragraph');

				buttonContainer.appendChild(
					this.plugin.gui.makeCopyToSection(
						this.copyToBtnHandler.bind(this),
						paragraph,
						sections,
						tags,
						linkInfo.sourcePath,
						paragraphEl,
						summaryContainer
					)
				);

				if (Utils.platformSettingCheck (this.app, this.plugin.settings.copyToCBBtn)) {
					buttonContainer.appendChild(
						this.plugin.gui.makeCopyButton(
							this.copyBtnHandler.bind(this),
							paragraph.trim()
						)
					);
				}

				if (Utils.platformSettingCheck (this.app, this.plugin.settings.removeTagBtn)) {
					buttonContainer.appendChild(
						this.plugin.gui.makeRemoveTagButton(
							this.removeTagBtnHandler.bind(this),
							paragraphEl,
							tagSection ?? ''
						)
					);
				}

				const mdParagraph = paragraph;
				const displayParagraph = this.buildSummaryDisplayMarkdown(linkInfo.summaryLink, mdParagraph);
				summary += displayParagraph + '\n';

				paragraphEl.setAttribute('md-source', mdParagraph);

				// Obsidian renders markdown/tags/links first; Tag Buddy decorates the DOM after.
				await MarkdownRenderer.render(this.app, displayParagraph, paragraphEl, '', tempComponent);
				this.decorateRenderedSummaryParagraph(paragraphEl, buttonContainer);

				summaryContainer.appendChild(paragraphEl);
			}
		}

		if (summary != '') {
			TagSummary.writeCodeBlockAttrs(summaryContainer, {
				tags,
				include,
				exclude,
				sections,
				max,
				mdSource
			});

			const summaryHeader = this.createSummaryHeader(
				tags,
				include,
				exclude,
				summary,
				summaryContainer,
				activeFile?.path ?? fileCtx
			);
			if (summaryHeader) {
				summaryContainer.insertBefore(summaryHeader, summaryContainer.firstChild);
			}

			element.replaceWith(summaryContainer);
		} else {
			this.createEmpty(
				element,
				tags ? tags : [],
				include ? include : [],
				exclude ? exclude : [],
				sections ? sections : [],
				max,
				'',
				mdSource
			);
		}
	}

	update (
		summaryEl: HTMLElement
	): void {
		const attrs = TagSummary.readCodeBlockAttrs(summaryEl);

		this.create(
			summaryEl,
			attrs.tags,
			attrs.include,
			attrs.exclude,
			attrs.sections,
			attrs.max,
			'',
			attrs.mdSource
		);
	}

	async copyTextToSection(
		text: string,
		section: string,
		filePath: string,
		addLink: boolean = true,
		selectedFile: TFile | null = null,
		detectPrefix: boolean = true
	): Promise<boolean> {
		const file = selectedFile ? selectedFile : (await this.app.workspace.getActiveFile());
		if (!file) {
			new Notice(NOTICE_TEXT.cannotIdentifyDestinationNote);
			return false;
		}

		let fileContent = await this.app.vault.read(file);
		const fileContentLines: string[] = Utils.getLinesInString(fileContent);
		const mdHeadings = Utils.getMarkdownHeadings(fileContentLines);
		let targetLine = fileContentLines.length - 1;

		if (mdHeadings.length <= 0 || section == 'end' || section == 'top') {
			if (section == 'top') {
				targetLine = Utils.findFirstLineAfterFrontMatter(fileContent);
				if (targetLine == 0) fileContent = '\n' + fileContent;
			} else if (section == 'end') {
				targetLine = fileContentLines.length - 1;
			}
		} else if (mdHeadings.length > 0) {
			const headingObj = mdHeadings.find(heading => heading.text.trim() === section);
			if (headingObj) {
				targetLine = headingObj.line;
			} else {
				new Notice(sectionNotFoundPastingTop(section));
				targetLine = Utils.findFirstLineAfterFrontMatter(fileContent);
				if (targetLine == 0) fileContent = '\n' + fileContent;
			}
		}

		const linePrefix: string = detectPrefix ? Utils.getListTypeFromLineNumber(fileContent, targetLine + 1) : '';
		let finalText = linePrefix + text;
		if (addLink) finalText += ` [[${filePath}|🔗]]`;

		const newContent = Utils.insertTextAfterLine(finalText, fileContent, targetLine);
		await this.app.vault.modify(file, newContent);
		return true;
	}

	private buildCopyToContent(
		mode: SummaryCopyMode,
		content: string,
		selection: string,
		tags: string[],
		filePath: string
	): string {
		if (mode == 'link') {
			const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') ?? filePath.replace(/\.md$/, '');
			return '[[' + filePath + '|' + fileName + ']]';
		}

		let newContent = selection == '' ? content : selection;
		if (!selection) {
			for (const tag of tags) {
				newContent = Utils.removeTagFromString(newContent, tag).trim();
			}
		}
		return newContent;
	}

	private getCopiedToSectionNoticeText(section: string): string {
		return copiedToSection(section, this.canLinkToSection(section));
	}

	private registerNoticeLinkToActiveSection(notice: Notice, section: string): void {
		if (!this.canLinkToSection(section)) return;

		this.plugin.registerDomEvent(notice.noticeEl, 'click', () => {
			const activeFile = this.app.workspace.getActiveFile();
			if (activeFile) this.app.workspace.openLinkText(activeFile.path + '#' + section, '');
		});
	}

	private registerNoticeLinkToSection(notice: Notice, filePath: string, section: string): void {
		this.plugin.registerDomEvent(notice.noticeEl, 'click', () => {
			this.app.workspace.openLinkText(filePath + '#' + section, '');
		});
	}

	private canLinkToSection(section: string): boolean {
		return section != 'top' && section != 'end';
	}

	async readFiles(
		listFiles: TFile[]
	): Promise<[TFile, string][]> {
		const list: [TFile, string][] = [];
		for (let t = 0; t < listFiles.length; t += 1) {
			const file = listFiles[t];
			const content = await this.app.vault.cachedRead(file);
			list.push([file, content]);
		}

		return list;
	}

	isValidText(
		listTags: string[],
		tags: string[],
		include: string[],
		exclude: string[]
	): boolean {
		let valid = true;

		// Query tags are OR, include tags are AND, exclude tags are NOT.
		if (tags.length > 0) {
			valid = valid && tags.some((value) => listTags.includes(value));
		}
		if (include.length > 0) {
			valid = valid && include.every((value) => listTags.includes(value));
		}
		if (valid && exclude.length > 0) {
			valid = !exclude.some((value) => listTags.includes(value));
		}
		return valid;
	}

	private parseTagSummaryTagListLine(
		line: string,
		field: TagSummaryTagListField
	): string[] | null {
		if (!line.match(createTagSummaryTagListLinePattern(field))) {
			return null;
		}

		const prefixPattern = field == 'tags'
			? TAG_SUMMARY_TAGS_PREFIX_PATTERN
			: field == 'include'
				? TAG_SUMMARY_INCLUDE_PREFIX_PATTERN
				: TAG_SUMMARY_EXCLUDE_PREFIX_PATTERN;

		const content = line.replace(prefixPattern, '').trim();
		return content
			.split(/\s+/)
			.map((tag) => tag.trim())
			.filter((tag) => tag.match(TAG_SUMMARY_TAG_TOKEN_PATTERN) != null);
	}

	private getMatchedSummaryTag(paragraph: string, tags: string[]): string | null {
		let matchedTag: string | null = null;
		for (const tag of tags) {
			if (paragraph.match(createTagSummaryMatchedTagPattern(tag)) != null) {
				matchedTag = tag;
			}
		}
		return matchedTag;
	}

	private getSummaryItemLinkInfo(
		paragraph: string,
		filePath: string,
		fileName: string
	): SummaryItemLinkInfo {
		const blockLink = paragraph.match(createTagSummaryBlockLinkPattern());

		if (blockLink) {
			return {
				summaryLink: '[[' + filePath + '#' + blockLink[0] + '|' + fileName + ']]',
				sourcePath: filePath + '#' + blockLink[0],
			};
		}

		// Prefer the closest header link when there is no block id.
		const header = Utils.findClosestHeaderWithLink(paragraph);
		let headerLink = Utils.removeTextFromString('#', header.link, true);
		headerLink = Utils.removeTextFromString('[', headerLink, true);
		headerLink = Utils.removeTextFromString(']', headerLink, true);

		if (header.text != '') {
			return {
				summaryLink: '[[' + filePath + '#' + headerLink + ']]',
				sourcePath: filePath,
			};
		}

		return {
			summaryLink: '[[' + filePath + '|' + fileName + ']]',
			sourcePath: filePath,
		};
	}

	private buildSummaryDisplayMarkdown(link: string, sourceParagraph: string): string {
		return '**' + link + '**\n' + this.compactLeadingTagLines(sourceParagraph);
	}

	private compactLeadingTagLines(sourceParagraph: string): string {
		const lines = sourceParagraph.split('\n');
		const tagLines: string[] = [];
		let bodyLineIndex = 0;

		while (
			bodyLineIndex < lines.length
			&& this.isTagOnlySummaryLine(lines[bodyLineIndex])
		) {
			tagLines.push(lines[bodyLineIndex].trim());
			bodyLineIndex++;
		}

		if (
			tagLines.length <= 0
			|| bodyLineIndex >= lines.length
			|| lines[bodyLineIndex].trim() == ''
			|| lines[bodyLineIndex].match(/^#{1,6}\s/)
		) {
			return sourceParagraph;
		}

		const compactedLine = tagLines.join(' ') + ' ' + lines[bodyLineIndex].trimStart();
		return [compactedLine, ...lines.slice(bodyLineIndex + 1)].join('\n');
	}

	private isTagOnlySummaryLine(line: string): boolean {
		const tokens = line.trim().split(/\s+/).filter((token) => token.length > 0);
		return tokens.length > 0 && tokens.every((token) => token.match(/^#[^\s#.,;!?:]+$/) != null);
	}

	private createSummaryHeader(
		tags: string[],
		include: string[],
		exclude: string[],
		summaryMd: string,
		summaryContainer: HTMLElement,
		sourcePath: string
	): HTMLElement | null {
		const outputSummaryMd = this.buildSummaryOutputMarkdown(summaryMd, tags.concat(include));
		const tagListEl = Utils.platformSettingCheck(this.app, this.plugin.settings.showSummaryTags)
			? this.createSummaryTagList(tags, include, exclude)
			: null;
		const buttonListEl = this.createSummaryActionButtons(outputSummaryMd, summaryContainer, sourcePath, tags);

		if (!tagListEl && !buttonListEl) return null;

		const headerEl = createEl('div');
		headerEl.setAttribute('class', 'tagsummary-header');
		if (tagListEl) headerEl.appendChild(tagListEl);
		if (buttonListEl) headerEl.appendChild(buttonListEl);
		return headerEl;
	}

	private createSummaryTagList(
		tags: string[],
		include: string[],
		exclude: string[]
	): HTMLElement | null {
		const queryTags = this.getSummaryHeaderTags(tags, include, exclude);
		if (queryTags.length <= 0) return null;

		const tagListEl = createEl('span');
		tagListEl.setAttribute('class', 'tagsummary-query-tags');

		queryTags.forEach((queryTag) => {
			const tagEl = createEl('span');
			tagEl.setAttribute('class', 'tagsummary-query-tag tagsummary-query-tag-' + queryTag.kind);
			tagEl.setAttribute('title', queryTag.tag);
			tagEl.setText(queryTag.tag);
			tagListEl.appendChild(tagEl);
		});

		return tagListEl;
	}

	private getSummaryHeaderTags(
		tags: string[],
		include: string[],
		exclude: string[]
	): { tag: string; kind: string }[] {
		const uniqueTags = new Map<string, { tag: string; kind: string }>();
		const addTags = (values: string[], kind: string) => {
			values.forEach((tag) => {
				if (!uniqueTags.has(tag)) uniqueTags.set(tag, { tag, kind });
			});
		};

		addTags(tags, 'tag');
		addTags(include, 'include');
		addTags(exclude, 'exclude');
		return Array.from(uniqueTags.values());
	}

	private buildSummaryOutputMarkdown(summaryMd: string, tagsToRemove: string[]): string {
		let outputMd = summaryMd;
		tagsToRemove.forEach((tag) => {
			outputMd = this.removeTagFromSummaryOutput(outputMd, tag);
		});
		return this.normalizeSummaryOutputSpacing(outputMd.replace(/[^\S\r\n]+(?=\r?\n|$)/g, ''));
	}

	private removeTagFromSummaryOutput(summaryMd: string, tag: string): string {
		const tagText = Utils.escapeRegExp(tag);
		return summaryMd
			.replace(new RegExp(`(^|\\r?\\n)([^\\S\\r\\n]*)${tagText}(?!\\w|\\/)[^\\S\\r\\n]?`, 'gi'), '$1$2')
			.replace(new RegExp(`([^\\S\\r\\n])${tagText}(?!\\w|\\/)[^\\S\\r\\n]?`, 'gi'), '$1')
			.replace(new RegExp(`^${tagText}(?!\\w|\\/)[^\\S\\r\\n]?`, 'i'), '');
	}

	private normalizeSummaryOutputSpacing(summaryMd: string): string {
		return summaryMd.replace(/(\*\*\[\[[^\n]+\]\]\*\*)[^\S\r\n]*(?:\r?\n){2,}([^\r\n])/g, '$1\n$2');
	}

	private createSummaryActionButtons(
		summaryMd: string,
		summaryContainer: HTMLElement,
		sourcePath: string,
		tags: string[]
	): HTMLElement | null {
		const buttonListEl = createEl('span');
		buttonListEl.setAttribute('class', 'tagsummary-summary-buttons');

		if (Utils.platformSettingCheck(this.app, this.plugin.settings.copySummaryBtn)) {
			buttonListEl.appendChild(this.plugin.gui.makeCopySummaryButton(summaryMd));
		}
		if (Utils.platformSettingCheck(this.app, this.plugin.settings.summaryNoteBtn)) {
			buttonListEl.appendChild(
				this.plugin.gui.makeSummaryNoteButton(
					this.makeSummaryBtnHandler.bind(this),
					summaryMd,
					tags
				)
			);
		}
		if (Utils.platformSettingCheck(this.app, this.plugin.settings.bakeSummaryBtn)) {
			buttonListEl.appendChild(
				this.plugin.gui.makeBakeButton(
					this.bakeSummaryBtnHandler.bind(this),
					summaryMd,
					summaryContainer,
					sourcePath
				)
			);
		}
		if (Utils.platformSettingCheck(this.app, this.plugin.settings.summaryRefreshBtn)) {
			buttonListEl.appendChild(this.plugin.gui.makeSummaryRefreshButton(summaryContainer));
		}

		return buttonListEl.children.length > 0 ? buttonListEl : null;
	}

	private decorateRenderedSummaryParagraph(
		paragraphEl: HTMLElement,
		buttonContainer: HTMLDivElement
	): void {
		// Keep this order: render markdown first, then move the rendered link and
		// action buttons into a header row above the summary body.
		const headerEl = createEl('div');
		headerEl.setAttribute('class', 'tagsummary-item-header');

		const titleEl = createEl('span');
		titleEl.setAttribute('class', 'tagsummary-item-title');

		const strongEl = paragraphEl.querySelector('strong');
		if (strongEl) {
			titleEl.appendChild(strongEl.cloneNode(true));
			headerEl.appendChild(titleEl);
			headerEl.appendChild(buttonContainer);
			const bodyContainer = strongEl.parentElement;
			if (bodyContainer && bodyContainer != paragraphEl) {
				paragraphEl.insertBefore(headerEl, bodyContainer);
				this.removeRenderedTitleFromBody(strongEl);
			} else {
				strongEl.replaceWith(headerEl);
				this.removeLeadingBreakAfterItemHeader(headerEl);
			}
			this.appendItemDivider(paragraphEl);
			return;
		}

		headerEl.appendChild(buttonContainer);
		paragraphEl.prepend(headerEl);
		this.appendItemDivider(paragraphEl);
	}

	private appendItemDivider(paragraphEl: HTMLElement): void {
		const dividerEl = createEl('div');
		dividerEl.setAttribute('class', 'tagsummary-item-divider');
		paragraphEl.appendChild(dividerEl);
	}

	private removeRenderedTitleFromBody(titleEl: HTMLElement): void {
		const nextSibling = titleEl.nextSibling;
		titleEl.remove();
		this.removeLeadingBreakFromNode(nextSibling);
	}

	private removeLeadingBreakAfterItemHeader(headerEl: HTMLElement): void {
		this.removeLeadingBreakFromNode(headerEl.nextSibling);
	}

	private removeLeadingBreakFromNode(startNode: ChildNode | null): void {
		let sibling = startNode;
		while (sibling && sibling.nodeType == Node.TEXT_NODE && sibling.textContent?.trim() == '') {
			const nextSibling = sibling.nextSibling;
			sibling.remove();
			sibling = nextSibling;
		}

		if (sibling instanceof HTMLBRElement) {
			sibling.remove();
		}
	}

	static getTagsToCheckFromEl (
		tagSummaryEl: HTMLElement
	): string[] {
		const attrs = TagSummary.readCodeBlockAttrs(tagSummaryEl);
		return attrs.tags.concat(attrs.include);
	}

	async getFile (
		el: HTMLElement
	): Promise<TFile | null> {
		const filePath = el.getAttribute('file-source');
		if (!filePath) return null;
		const file = this.app.vault.getAbstractFileByPath(filePath);
		return file instanceof TFile ? file : null;
	}

	updateSelection (
		index: number,
		bool: boolean
	): void {
		if (bool) {
			if (!this.selectedBlocks.includes(index)) {
				this.selectedBlocks.push(index);
			}
		} else {
			this.selectedBlocks = this.selectedBlocks.filter(itemIndex => itemIndex !== index);
		}
	}


	getSelectedMarkdownBlocks (): string[] {
		// Bulk selection is parked until copy/move/share paths use one content builder.
		return [];
	}

	private static writeCodeBlockAttrs(
		element: HTMLElement,
		attrs: SummaryCodeBlockAttrs
	): void {
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.tags, attrs.tags.join(','));
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.include, attrs.include.join(','));
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.exclude, attrs.exclude.join(','));
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.sections, attrs.sections.join(','));
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.max, String(attrs.max));
		element.setAttribute(SUMMARY_CODEBLOCK_ATTRS.code, attrs.mdSource);
	}

	private static readCodeBlockAttrs(element: HTMLElement): SummaryCodeBlockAttrs {
		return {
			tags: TagSummary.splitCodeBlockAttrList(element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.tags)),
			include: TagSummary.splitCodeBlockAttrList(element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.include)),
			exclude: TagSummary.splitCodeBlockAttrList(element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.exclude)),
			sections: TagSummary.splitCodeBlockAttrList(element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.sections)),
			max: Number(element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.max)),
			mdSource: element.getAttribute(SUMMARY_CODEBLOCK_ATTRS.code) ?? '',
		};
	}

	private static splitCodeBlockAttrList(value: string | null): string[] {
		return value ? value.split(',') : [];
	}

}

class TempComponent extends Component {
	doNotPostProcess = true;
	onload() {}
	onunload() {}
}
