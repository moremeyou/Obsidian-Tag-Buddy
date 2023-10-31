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

		this.debouncedProcessActiveFileTagEls = Utils.debounce(this.processActiveFileTags.bind(this), 500)

		this.debouncedProcessActiveFileTagEls();

	}

	reset() {
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

	// This method is just for the initial processing.
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
			if (this.plugin.settings.debugMode) console.log('Tag Buddy: renderPostProcessor'); 
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
		const mode = view.getMode();
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
		if (this.plugin.settings.debugMode) console.log('Tag Buddy: processTagSummaryParagraph')

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

	// adapt this method to use the cache tag info (line, offset, etc)
	getMarkdownTags (
		file: TFile, 
		fileContent: string
	): Array {

		const tagPositions = [];
		let match;
		//const regex = /(?:^|\s)#[^\s#]+|```/g; // BUG: wrong match.index. matches the space before the tag.
		//const regex = /(?<=^|\s)#[^\s#]+|```/g // FIX. But still matching punctuation after
		//const regex = /(?<=^|\s)(#[^\s#.,;!?:]+)(?=[.,;!?:\s]|$)|```/g  // matches punctuation after, but not included in the match
		//const regex = /(?<=^|\s)(#[^\s#.,;!?:]+)(?=[.,;!?:\s]|$)|(?<!`)```(?!`)/g; // Fix for matching ```` 
		const regex = /(?<=^|\s)(#[^\s#.',;!?:]+)(?=[.,;!?:'\s]|$)|(?<!`)```(?!`)/g; // Fix for matching but excluding ''s' in '#tag's'

		let insideCodeBlock = false;

		while ((match = regex.exec(fileContent)) !== null) {
		    if (match[0].trim() === "```") {
		        insideCodeBlock = !insideCodeBlock; 
		        continue; // Reject if tag in a code block
		    }	    
		    if (insideCodeBlock) continue;
		    const tag = match[0].trim();
		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
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
				new Notice('Markdown source and preview tags out of sync. Please close and reload this note.');
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
		    			this.outOfSync = true;
						new Notice('Markdown source and preview tags out of sync. Please close and reload this note.');
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
 		if (embed.getAttribute('src')) {
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

	logDifferences(tagPositions, tagElements) {
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