import { App, MarkdownRenderer, debounce, Debouncer, MarkdownPostProcessorContext, Component, TFile, getAllTags, MarkdownView, Notice } from 'obsidian';
import TagBuddy from "main";
import * as Utils from './utils';
import { NOTICE_TEXT, markdownRenderedTagsOutOfSync } from './userText';
import { CODE_FENCE_MARKER, NUMBERED_LIST_LINE_PATTERN, createMarkdownTagOrCodeFencePattern } from './tagPatterns';

interface MarkdownTagPosition {
	tag: string;
	index: number;
	source: string;
	context?: string;
	line?: number;
}

interface SourceRange {
	start: number;
	end: number;
}

interface RenderSection {
	el: HTMLElement;
}

export class TagProcessor {
	app: App;
	plugin: TagBuddy;
	private outOfSync: boolean = false;
	private activeFileMismatchRetry: number | null = null;
	debouncedProcessActiveFileTagEls: Debouncer<[], Promise<void>>;

	constructor(
		app: App,
		plugin: TagBuddy
	) {

		this.app = app;
		this.plugin = plugin;

		this.debouncedProcessActiveFileTagEls = debounce(this.processActiveFileTags.bind(this), 500)

		this.debouncedProcessActiveFileTagEls();

	}

	reset() {
//console.log('tag processor reset');
		this.outOfSync = false;
	}

	isOutOfSync(): boolean {
		return this.outOfSync;
	}

	markOutOfSync(type: string) {
		if (type == 'active') this.outOfSync = true;

		new Notice(markdownRenderedTagsOutOfSync(type), 10000);
	}

	filterActiveFileTagEls (
		tags: HTMLElement[]
	): HTMLElement[] {
//console.log(tags.length)
		const filteredTagElements = Array.from(tags).filter(tag => {

		    // Exclude tags that are descendants of .frontmatter-section-data
		    // This is a bug on mobile. Mobile includes the yaml tags in rendered html
		    if (tag.closest('.frontmatter-section-data')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    if (tag.parentElement?.closest('.markdown-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    if (tag.closest('.markdown-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    //if (tag.parentElement.closest('.internal-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    //if (tag.closest('.internal-embed')) return false;

		    // Exclude tags that are descendants of .tag-summary-block
		    if (tag.parentElement?.closest('.tag-summary-block')) return false;

		    return true;
		});

//console.log(filteredTagElements.length)
		return filteredTagElements;
	}

		async renderPostProcessor (
			el: HTMLElement,
			ctx: MarkdownPostProcessorContext
		): Promise<void> {
			const activeFile = this.app.workspace.getActiveFile();
			const activeFilePath = activeFile?.path;

			const nativeEmbedEl = el.querySelector<HTMLElement>('.internal-embed');
			const tags = Array.from(el.querySelectorAll<HTMLElement>('.tag'));

		if ((nativeEmbedEl && ctx.sourcePath == activeFilePath) // embeds
			|| (ctx.sourcePath == activeFilePath && tags.length > 0) // active file tags
			|| el.classList.contains('tag-summary-paragraph') // summary tags
		) {
			//if (this.plugin.settings.debugMode) console.log('Tag Buddy: renderPostProcessor');
		}
		else { return; }

		if (nativeEmbedEl) {
				//this.nativeEmbeds.push(nativeEmbedEl);
				let nativeEmbedObserver: MutationObserver;
				nativeEmbedObserver = new MutationObserver((mutationsList) => {
					const target = mutationsList[0]?.target;
					if (!(target instanceof HTMLElement)) return;
					if (target.querySelectorAll('.tag').length > 0) {
						nativeEmbedObserver.disconnect();
						void this.processNativeEmbed(target);
					}
				});
			nativeEmbedObserver.observe(nativeEmbedEl, { childList: true, subtree: true });
		}

			if (el.classList.contains('tag-summary-paragraph')) {
				this.processTagSummaryParagraph(el);
				return;
			}

			const readingContainer = el.closest('.markdown-reading-view') as HTMLElement | null;
			if (readingContainer && ctx.sourcePath) {
				setTimeout(() => {
					void this.processRenderedTagContainer(readingContainer, ctx.sourcePath);
				}, 100);
			}

			this.debouncedProcessActiveFileTagEls();
		}

		async processRenderedTagContainer(
			container: HTMLElement,
			sourcePath: string
		): Promise<HTMLElement[] | null> {
			if (sourcePath == this.app.workspace.getActiveFile()?.path) {
				await this.processActiveFileTags();
				return null;
			}

			const file = this.app.vault.getAbstractFileByPath(sourcePath);
			if (!(file instanceof TFile)) return null;

			const fileContent = await this.app.vault.read(file);
			const tagElements = this.filterActiveFileTagEls(
				Array.from(container.querySelectorAll<HTMLElement>('.tag'))
			);
			if (tagElements.length == 0) return [];

			const markdownTags = this.getMarkdownTags(file, fileContent, false);
			return this.assignMarkdownTags(markdownTags, tagElements, 0, 'active');
		}

	async processActiveFileTags (
		//tags: HTMLElement[],
		allowMismatchRetry: boolean = true
	): Promise<void> {
		if (this.plugin.settings.debugMode) console.log('Tag Buddy: processing active file tags')

		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();
		//const preView = await view.containerEl.querySelector('.markdown-reading-view');
		if (mode == 'preview') {
			if (!view) return;
			const activeFile = this.app.workspace.getActiveFile();
			if (!activeFile) {
				this.outOfSync = false;
				return;
			}
			const fileContent = await this.app.vault.read(activeFile);
			// Use Obsidian's internal rendered sections so long notes include off-screen rendered tag elements.
			const previewMode = view.currentMode as unknown as { renderer?: { sections?: RenderSection[] } };
			const sections = previewMode.renderer?.sections ?? [];
			const activeFileTagEls: HTMLElement[] = [];

			const activeFileTags = this.getMarkdownTags(
				activeFile,
				fileContent,
				false
			);

			sections.forEach((section) => {
				Array.from(section.el.querySelectorAll<HTMLElement>('.tag')).forEach(tag => {
					activeFileTagEls.push(tag);
				});
			});

			// Filter tags
			const filteredTagElements = this.filterActiveFileTagEls(activeFileTagEls);

			if (filteredTagElements.length > 0) {
				if (allowMismatchRetry && activeFileTags.length != filteredTagElements.length) {
					this.retryActiveFileTagProcessing();
					return;
				}

				const assignedTags = this.assignMarkdownTags(
					activeFileTags,
					filteredTagElements,
					0, //startIndex,
					'active'
				);
				if (assignedTags) this.outOfSync = false;
			} else {
				this.outOfSync = false;
			}
		}
	}

	private retryActiveFileTagProcessing(): void {
		if (this.activeFileMismatchRetry != null) {
			window.clearTimeout(this.activeFileMismatchRetry);
		}

		this.activeFileMismatchRetry = window.setTimeout(() => {
			this.activeFileMismatchRetry = null;
			void this.processActiveFileTags(false);
		}, 500);
	}

	async processTagSummaryParagraph (
		paragraphEl: HTMLElement,
	): Promise<void> {
		//if (this.plugin.settings.debugMode) console.log('Tag Buddy: processTagSummaryParagraph')

		const filePath = paragraphEl.getAttribute('file-source');
		const markdownBlock = paragraphEl.getAttribute('md-source')?.trim();
		if (!filePath || !markdownBlock) return;
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (!(file instanceof TFile)) {
			new Notice(NOTICE_TEXT.cannotIdentifySummarySource);
			return;
		}
		const fileContent = await this.app.vault.read(file);
		const startIndex = fileContent.indexOf(markdownBlock);
		const mdTags = this.getMarkdownTags(
			file,
			fileContent,
			false
		);
		this.assignMarkdownTags(
			mdTags,
			paragraphEl.querySelectorAll<HTMLElement>('.tag'),
			startIndex,
			'plugin-summary'
		);
	}

	getMarkdownTags(
	    file: TFile,
	    fileContent: string,
	    includeFrontmatter: boolean = true
	): MarkdownTagPosition[] {
	    const tagPositions: MarkdownTagPosition[] = [];
	    const processedPositions = new Set<number>(); // Track positions to prevent duplicate processing
	    let match: RegExpExecArray | null;
    const regex = createMarkdownTagOrCodeFencePattern();
    const frontmatterRange = this.getFrontmatterRange(fileContent);

    // Context tracking
    let currentContext = "normal";
    let insideCodeBlock = false; // Track if we are inside a code block
    let invalidBlockquote = false; // Track if a blockquote has been invalidated

    // Match all tags and special contexts in one pass
    while ((match = regex.exec(fileContent)) !== null) {
        const matchedString = match[0].trim();
        const matchIndex = match.index;

        // Skip if this position has already been processed
        if (processedPositions.has(matchIndex)) {
            if (this.plugin.settings.debugMode) console.log(`Skipping duplicate tag at position ${matchIndex}: ${matchedString}`);
            continue;
        }

        // Toggle code block state when encountering a fence
        if (matchedString === CODE_FENCE_MARKER) {
            insideCodeBlock = !insideCodeBlock;
            if (this.plugin.settings.debugMode) console.log(`Toggled insideCodeBlock to ${insideCodeBlock}`);
            continue; // Skip processing the fence line itself
        }

        // Skip processing if inside a code block
        if (insideCodeBlock) {
            if (this.plugin.settings.debugMode) console.log(`Skipping tag ${matchedString} inside code block.`);
            continue;
        }

        // Determine the context of the current line
        const lineStart = fileContent.lastIndexOf("\n", matchIndex) + 1; // Get start of the line
        const lineEnd = fileContent.indexOf("\n", matchIndex); // Get end of the line
        const line = fileContent.slice(lineStart, lineEnd !== -1 ? lineEnd : undefined);

        if (!includeFrontmatter && this.isIndexInsideRange(matchIndex, frontmatterRange)) {
            if (this.plugin.settings.debugMode) console.log(`Skipping frontmatter tag ${matchedString}.`);
            continue;
        }

        if (line.trim().startsWith(">")) {
            currentContext = "blockquote";

            // Check for invalid blockquote condition (e.g., tab after `>`)
            if (line.startsWith("> \t") || line.startsWith(">\t") || line.includes("(not a tag)")) {
                invalidBlockquote = true;
                if (this.plugin.settings.debugMode) console.log(`Invalid blockquote triggered at line: ${fileContent.substring(0, matchIndex).split("\n").length}`);
            }
        } else if (line.trim().startsWith("-") || NUMBERED_LIST_LINE_PATTERN.test(line.trim())) {
            currentContext = "list";
            invalidBlockquote = false; // Reset invalid blockquote state
        } else if (line.startsWith("\t")) {
            currentContext = "indented"; // Correctly mark tab-indented lines
            invalidBlockquote = false; // Reset invalid blockquote state
        } else {
            currentContext = "normal";
            invalidBlockquote = false; // Reset invalid blockquote state
        }

        // Debug logging for context
        if (this.plugin.settings.debugMode) console.log(`Line ${fileContent.substring(0, matchIndex).split("\n").length}: ${currentContext} - ${line.trim()}`);

        // Skip processing if in an invalid blockquote context
        if (invalidBlockquote) {
            if (this.plugin.settings.debugMode)console.log(`Skipping tag ${matchedString} due to invalid blockquote context.`);
            continue;
        }

        // Context-specific exclusions
        const isValid =
            currentContext !== "indented" && // Exclude lines starting with tabs
            !(currentContext === "list" && line.includes("(not a tag)")) && // Exclude invalid list tags
            !(currentContext === "blockquote" && invalidBlockquote); // Exclude all invalid blockquotes

        if (isValid) {
            tagPositions.push({
                tag: matchedString,
                index: matchIndex,
                source: file.path,
                context: currentContext,
                line: fileContent.substring(0, matchIndex).split("\n").length, // Calculate line number
            });
            if (this.plugin.settings.debugMode) console.log(`Found tag: ${matchedString} in context: ${currentContext}`);
            processedPositions.add(matchIndex); // Mark this position as processed
        } else {
            if (this.plugin.settings.debugMode) console.log(`Excluded tag: ${matchedString} in invalid context: ${currentContext}`);
        }
    }

    return tagPositions;
}

	private getFrontmatterRange(fileContent: string): SourceRange | null {
		const lines = fileContent.split('\n');
		if (lines[0]?.trim() != '---') return null;

		let offset = lines[0].length + 1;
		for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
			if (lines[lineIndex].trim() == '---') {
				return {
					start: 0,
					end: offset + lines[lineIndex].length,
				};
			}
			offset += lines[lineIndex].length + 1;
		}

		return null;
	}

	private isIndexInsideRange(index: number, range: SourceRange | null): boolean {
		return !!range && index >= range.start && index <= range.end;
	}




		assignMarkdownTags (
			tagPositions: MarkdownTagPosition[],
			tagElements: ArrayLike<HTMLElement>,
			startIndex: number,
			type: string
		): HTMLElement[] | null {

		if (type == 'active') {
				//console.log(startIndex);
				if (this.plugin.settings.debugMode) {
					console.log(tagPositions.length, tagElements.length)
					//console.log(tagPositions, tagElements, this.tagFileManager.getTags(activeFilePath))
					const temp1 = tagPositions.map((nodeObj) => nodeObj.tag);
					const temp2 = Array.from(tagElements).map((nodeObj) => nodeObj.innerText);

				console.log(temp1, temp2)

				//if (tagPositions.length != tagElements.length || tagPositions.length != this.tagFileManager.getTags(activeFilePath).length) {
			}

			if (tagPositions.length != tagElements.length) {
					this.markOutOfSync(type);
					if (this.plugin.settings.debugMode) this.logDifferences(tagPositions, tagElements)
					return null;
				}
			}

			let tagEl: HTMLElement | undefined;
			const tagElArray = Array.from(tagElements);
			let tagElIndex = 0;
			let tagPos: MarkdownTagPosition;
		for (let i = 0; i < tagPositions.length; i++) {
		//tagPositions.forEach((tagPos, i) => {
			tagPos = tagPositions[i];
//console.log(tagElArray[tagElIndex])
			if (tagPos.index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
					if (tagEl) {
//console.log(tagEl, tagPositions[i].tag, tagPositions[i].index);
					if (tagEl.innerText.trim() == tagPos.tag.trim()) {
					tagEl.setAttribute('md-index', String(tagPos.index));
					tagEl.setAttribute('file-source', tagPos.source);
					tagEl.setAttribute('type', type);
					tagEl.setAttribute('pos', String(i));
				    tagElIndex++;
				} else {
					//console.log(tagEl.innerText.trim(), tagPos.tag.trim())
						this.markOutOfSync(type);
//console.log(tagPositions, tagElements)

							this.logDifferences(tagPositions, tagElements)
							return null;
					}
			}
		}
		};

		return tagElArray;
	}

	async processNativeEmbed (
		//tags: HTMLElement[]
		embed: HTMLElement,
		checkDuplicates: boolean = false
	): Promise<void> {
		if (this.plugin.settings.debugMode) console.log('Tag Buddy: processNativeEmbed')
		const markdownEmbed = embed.closest('.markdown-embed') as HTMLElement | null;
		if (!markdownEmbed) return;
		embed = markdownEmbed;
		const sourcePath = embed.getAttribute('src');
		if (sourcePath) {
			let filePath = sourcePath;
			const linkArray = filePath.split('#');
			const hasAnchorLink = linkArray.length > 1;
			let anchorLinkType = '';
			let anchorLink = '';
			if (hasAnchorLink) {
				anchorLink = linkArray[1] ?? '';
				anchorLinkType = anchorLink.startsWith('^') ? 'block' : 'header';
			}
			filePath = linkArray[0].trim() + '.md';
			const file = await Utils.validateFilePath(filePath)
			if (file) {
				const fileContent = await this.app.vault.read(file);
				const embededTagFile = this.getMarkdownTags(file, fileContent, false);

				if (hasAnchorLink && anchorLinkType != '') {
					if (
						anchorLinkType == 'header'
						&& !Utils.fileContainsHeading(fileContent, anchorLink)
					) {
						embed.setAttribute('embed-success', 'false');
						return; // Reject if this is a native "can't find #section" error
					} else {
						embed.setAttribute('embed-success', 'true');
					}
				}

				const tempComponent = new TempComponent();
				const tempContainerHTML = createEl("div");

				await MarkdownRenderer.render(
					this.app,
					fileContent,
					tempContainerHTML,
					'noFile', //file.path,
					tempComponent
				);

				const embedContentEl = embed.querySelector<HTMLElement>('.markdown-embed-content');
				if (!embedContentEl) return;
				const innerText = embedContentEl.innerText;
				const startIndex = tempContainerHTML.innerText.indexOf(innerText);

				this.assignMarkdownTags(
					embededTagFile,
					embed.querySelectorAll<HTMLElement>('.tag'),
					startIndex,
					'native-embed'
				);
			}
		}
	}

	logDifferences(tagPositions: MarkdownTagPosition[], tagElements: ArrayLike<HTMLElement>) {
		// Extract tags and innerTexts into separate arrays

		const tags = tagPositions.map(item => item.tag);
		const innerTexts1 = Array.from(tagElements).map(item => item.innerText);

		// Initialize arrays to store unique elements
		let uniqueToTagPositions: string[] = [];
		let uniqueToTagElements: string[] = [];

		// Helper function to find unique elements in one array compared to others
		const findUnique = (arr1: string[], arr2: string[]): string[] => {
			return arr1.filter(item => !arr2.includes(item));
		};

		uniqueToTagPositions = findUnique(tags, innerTexts1);
		uniqueToTagElements = findUnique(innerTexts1, tags);

		console.log('differences:', uniqueToTagPositions.length, uniqueToTagElements.length);
		// Log the differences
		if (uniqueToTagPositions.length) {
			console.log("Unique to tagPositions based on tag:", uniqueToTagPositions);
		}
		if (uniqueToTagElements.length) {
			console.log("Unique to tagElements based on innerText:", uniqueToTagElements);
		}
	}

}

class TempComponent extends Component {
	onload() {}
	onunload() {}
}
