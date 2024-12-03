import { App, MarkdownRenderer, MarkdownPostProcessor, debounce, MarkdownPostProcessorContext, Component, TFile, getAllTags, MarkdownPreviewView, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import * as Utils from './utils';

export class TagProcessor {
	app: App; 
	plugin: TagBuddy;
	private outOfSync: boolean = false;
	debouncedProcessActiveFileTagEls: Function;

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

	filterActiveFileTagEls (
		tags: HTMLElement[]
	): Array {		
//console.log(tags.length)
		const filteredTagElements = Array.from(tags).filter(tag => {

		    // Exclude tags that are descendants of .frontmatter-section-data
		    // This is a bug on mobile. Mobile includes the yaml tags in rendered html
		    if (tag.closest('.frontmatter-section-data')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    if (tag.parentElement.closest('.markdown-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    if (tag.closest('.markdown-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    //if (tag.parentElement.closest('.internal-embed')) return false;

		    // Exclude tags that are descendants of .markdown-embed
		    //if (tag.closest('.internal-embed')) return false;

		    // Exclude tags that are descendants of .tag-summary-block
		    if (tag.parentElement.closest('.tag-summary-block')) return false;

		    return true;
		});

//console.log(filteredTagElements.length)
		return filteredTagElements;
	}

	async renderPostProcessor (
		el: HTMLElement, 
		ctx: MarkdownPostProcessorContext
	): void {	
		const processingFile: TFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		const activeFile: TFile = this.app.workspace.getActiveFile();
		const activeFilePath: string = activeFile?.path;
		
		const nativeEmbedEl: HTMLElement = el.querySelector('.internal-embed');
		const tags: HTMLElement[] = el.querySelectorAll('.tag');

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
				const target: HTMLElement = mutationsList[0].target;
				if (target.querySelectorAll('.tag').length > 0) {
					nativeEmbedObserver.disconnect();
					this.processNativeEmbed(target);
				}
			});
			nativeEmbedObserver.observe(nativeEmbedEl, { childList: true, subtree: true });
		}
	
		if (el.classList.contains('tag-summary-paragraph')) {
			this.processTagSummaryParagraph(el);
			return; 
		} 

		this.debouncedProcessActiveFileTagEls();	
	}

	async processActiveFileTags (
		//tags: HTMLElement[],
	): void {		
		if (this.plugin.settings.debugMode) console.log('Tag Buddy: processing active file tags')		

		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();
		//const preView = await view.containerEl.querySelector('.markdown-reading-view');
		if (mode == 'preview') {
			const activeFile = await this.app.workspace.getActiveFile();
			const fileContent = await this.app.vault.read(activeFile);
			const sections = view.currentMode.renderer.sections;
			const activeFileTagEls = [];

			const activeFileTags = await this.getMarkdownTags(
				activeFile, 
				fileContent
			);

			sections.forEach(section => {
				Array.from(section.el.querySelectorAll('.tag')).forEach(tag => {
					activeFileTagEls.push(tag);
				});
			});

			// Filter tags 
			const filteredTagElements = this.filterActiveFileTagEls(activeFileTagEls);
			
			if (filteredTagElements.length > 0) {
				this.assignMarkdownTags(
					activeFileTags, 
					filteredTagElements,  
					0, //startIndex,
					'active'
				);
			}
		}
	}

	async processTagSummaryParagraph (
		paragraphEl: HTMLElement,
	):void {
		//if (this.plugin.settings.debugMode) console.log('Tag Buddy: processTagSummaryParagraph')

		const filePath = paragraphEl.getAttribute('file-source');
		const markdownBlock = paragraphEl.getAttribute('md-source').trim();
		const file = await this.app.vault.getAbstractFileByPath(filePath);
		const fileContent = await this.app.vault.read(file);
		const startIndex = fileContent.indexOf(markdownBlock);
		const mdTags = this.getMarkdownTags(
			file, 
			fileContent
		);
		this.assignMarkdownTags(
			mdTags, 
			paragraphEl.querySelectorAll('.tag'), 
			startIndex, 
			'plugin-summary'
		);
	}


/*
	// adapt this method to use the cache tag info (line, offset, etc)
	getMarkdownTags (
		file: TFile,  
		fileContent: string 
	): Array {

		const tagPositions = [];
		let match;
		// Obsidian tag spec: https://help.obsidian.md/Editing+and+formatting/Tags#Tag+format
		//const regex = /(?:^|\s)#[^\s#]+|```/g; // BUG: wrong match.index. matches the space before the tag.
		//const regex = /(?<=^|\s)#[^\s#]+|```/g // FIX. But still matching punctuation after
		//const regex = /(?<=^|\s)(#[^\s#.,;!?:]+)(?=[.,;!?:\s]|$)|```/g  // matches punctuation after, but not included in the match
		//const regex = /(?<=^|\s)(#[^\s#.,;!?:]+)(?=[.,;!?:\s]|$)|(?<!`)```(?!`)/g; // Fix for matching ```` 
		//const regex = /(?<=^|\s)(#[^\s#.',;!?:]+)(?=[.,;!?:'\s]|$)|(?<!`)```(?!`)/g; // Fix for matching but excluding ''s' in '#tag's'
		const regex = /(?<=^|\s)(#(?=[^\s#.'’,;!?:]*[^\d\s#.'’,;!?:])[^\s#.'’,;!?:]+)(?=[.,;!?:'’\s]|$)|(?<!`)```(?!`)/g; // fix for number-only and typographic apostrophy's



		let insideCodeBlock = false;

		while ((match = regex.exec(fileContent)) !== null) {
		    if (match[0].trim() === "```") {
		        insideCodeBlock = !insideCodeBlock; 
		        continue; // Reject if tag in a code block
		    }	    
		    if (insideCodeBlock) continue;
		    const tag = match[0].trim();
		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
//console.log(tag)
		}
		return tagPositions;
	}
*/


getMarkdownTags(
    file: TFile,
    fileContent: string
): Array {
    const tagPositions = [];
    const processedPositions = new Set(); // Track positions to prevent duplicate processing
    let match;
    const regex = /(?<=^|\s)(#(?=[^\s#.'’,;!?:]*[^\d\s#.'’,;!?:])[^\s#.'’,;!?:]+)(?=[.,;!?:'’\s]|$)|(?<!`)```(?!`)/g; // Original regex

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
        if (matchedString === "```") {
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

        if (line.trim().startsWith(">")) {
            currentContext = "blockquote";

            // Check for invalid blockquote condition (e.g., tab after `>`)
            if (line.startsWith("> \t") || line.startsWith(">\t") || line.includes("(not a tag)")) {
                invalidBlockquote = true;
                if (this.plugin.settings.debugMode) console.log(`Invalid blockquote triggered at line: ${fileContent.substring(0, matchIndex).split("\n").length}`);
            }
        } else if (line.trim().startsWith("-") || line.trim().match(/^\d+\./)) {
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
                source: file.name,
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

	


	async assignMarkdownTags (
		tagPositions:Array, 
		tagElements: HTMLElement[],
		startIndex: number, 
		type: string
	): HTMLElement[] {

		if (type == 'active') {
			//console.log(startIndex);
			if (this.plugin.settings.debugMode) {
				const activeFilePath = this.app.workspace.getActiveFile().path;
				console.log(tagPositions.length, tagElements.length) 
				//console.log(tagPositions, tagElements, this.tagFileManager.getTags(activeFilePath)) 
				const temp1 = [];
				tagPositions.forEach(nodeObj => { temp1.push(nodeObj.tag) });
				const temp2 = [];
				tagElements.forEach(nodeObj => { temp2.push(nodeObj.innerText) });
				
				console.log(temp1, temp2)
				
				//if (tagPositions.length != tagElements.length || tagPositions.length != this.tagFileManager.getTags(activeFilePath).length) {			
			}

			if (tagPositions.length != tagElements.length) {
				this.outOfSync = true;
				new Notice('Tag Buddy: Markdown source and preview tags out of sync. Try refreshing this summary. Then check for tag syntax errors or conflicts in metadata. Please report if this error persists.',10000);
				if (this.plugin.settings.debugMode) this.logDifferences(tagPositions, tagElements)
				return;
			}
		}

		let tagEl;
		const tagElArray = Array.from(tagElements); 
		let tagElIndex = 0;
		let tagPos;
		for (let i = 0; i < tagPositions.length; i++) {
		//tagPositions.forEach((tagPos, i) => {
			tagPos = tagPositions[i];
//console.log(tagElArray[tagElIndex])
			if (tagPos.index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
				if (tagEl) {
//console.log(tagEl, tagPositions[i].tag, tagPositions[i].index);
					if (tagEl.innerText.trim() == tagPos.tag.trim()) {
		    			tagEl.setAttribute('md-index', tagPos.index);
		    			tagEl.setAttribute('file-source', tagPos.source);
		    			tagEl.setAttribute('type', type);
		    			tagEl.setAttribute('pos', i);
		    		    tagElIndex++;
		    		} else {
		    			//console.log(tagEl.innerText.trim(), tagPos.tag.trim())
		    			this.outOfSync = true;
						new Notice('Tag Buddy: Markdown source and preview tags out of sync. Try refreshing this summary. Then check for tag syntax errors or conflicts in metadata. Please report if this error persists.');
//console.log(tagPositions, tagElements)

						this.logDifferences(tagPositions, tagElements)
						return;
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
	):void {
		if (this.plugin.settings.debugMode) console.log('Tag Buddy: processNativeEmbed')
		embed = embed.closest('.markdown-embed');
 		if (embed?.getAttribute('src')) {
			const linkElement = embed.getAttribute('src');
			let filePath = embed.getAttribute('src');
			const linkArray = filePath.split('#');
			const hasAnchorLink = linkArray.length > 1;
			let anchorLinkType = '';
			let anchorLink;
			if (hasAnchorLink) {
				anchorLink = linkArray[1];
				anchorLinkType = anchorLink.startsWith('^') ? 'block' : 'header';
			}
			filePath = linkArray[0].trim() + '.md';
			const file = await Utils.validateFilePath(filePath)			
			if (file) {
				const fileContent = await this.app.vault.read(file);
				const embededTagFile = await this.getMarkdownTags(file, fileContent);
				
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
				
				await MarkdownRenderer.renderMarkdown(
					fileContent, 
					tempContainerHTML, 
					'noFile', //file.path, 
					tempComponent
				);
				
				const innerText = await embed.querySelector('.markdown-embed-content').innerText;
				const startIndex = tempContainerHTML.innerText.indexOf(innerText);
				
				this.assignMarkdownTags(
					embededTagFile, 
					embed.querySelectorAll('.tag'), 
					startIndex, 
					'native-embed'
				);
			}
		}
	}

	logDifferences(tagPositions: Array, tagElements: Array) {
		// Extract tags and innerTexts into separate arrays

		const tags = tagPositions.map(item => item.tag);
		const innerTexts1 = tagElements.map(item => item.innerText);

		// Initialize arrays to store unique elements
		let uniqueToTagPositions = [];
		let uniqueToTagElements = [];

		// Helper function to find unique elements in one array compared to others
		const findUnique = (arr1, arr2) => {
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