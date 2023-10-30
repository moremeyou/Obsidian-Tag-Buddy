import { App, MarkdownRenderer, MarkdownPostProcessor, debounce, MarkdownPostProcessorContext, Component, TFile, getAllTags, MarkdownPreviewView, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
//import TagSummary from "TagSummary";
import { MutationEvent } from "./MutationEvent";
import { TagFileManager } from "./TagFileManager";
import * as Utils from './utils';



// AND/OR when autoloaded file has tags, when we go <back> it keeps that tag in our list. the reset...
// I think we need to keep track of files loaded AND if we've already processed that file
// but then we have to keep track of when it's actually closed.
// I think we should do a big clean before anything else.	
// also, what if we edit 2+ different sections of note? will we get those as separate batches?	
// if not, then we should do a full reprocess through renderer. so maybe we check if lots has changed to renable it?		

// we are working on editing in the active file. not switching between files yet.
// seems to work perfectly, except when editing areas without tags. say end of file <---
// then it loses sync. I think we need to always run through all the tags, 
// when switching back to preview mode, only if there were no tags removed.
// AND lock out the post renderer after initial load.

// maybe we keep the renderer going, and store new elements. 
// then in the active file processor we check for unassigned nodes?
// fix the unassigned then remove any empty. FLAG it, and keep the position??
// or keep the mutation system, but flag the removed tags. don't remove them...
// ADHD isn't being tracked as removed
// so, in the cleanup, remove any tag element that isn't in the markdown
// can we just check if it exists?

// WHERE ISADHD and tools15 - GONE. Because we deleted them before the view switch


// normal mobile test
// test when editing from mobile. both modes


export class TagProcessor {
	app: App; 
	plugin: TagBuddy;
	sourceModeObserver: MutationObserver;
	sourceMutationEvent: MutationObserver;
	debouncedProcessActiveTags: Function;
	mutationEvent: MutationEvent;
	tagFileManager: TagFileManager;
	tempTagFileManager: TagFileManager;
	addedTagsManager: TagFileManager;
	removedTagsManager: TagFileManager;
	nativeEmbeds: HTMLElement[] = [];
	outOfSync: boolean = false;
	private _activeFileTagEls: HTMLElement[] = [];
	private mutationPauseDebounce: Function;
	private processActiveFileTagsDebounce: Function;
	private paused: boolean = false;
	activeFileTagsSetup: boolean = false;
	tempTimeout;
	logDb: Function;

	constructor(
		app: App, 
		plugin: TagBuddy
	) {

		this.app = app;
		this.plugin = plugin;
		this.tagFileManager = new TagFileManager();	
		this.tempTagFileManager = new TagFileManager();	
		this.addedTagsManager = new TagFileManager();
		this.removedTagsManager = new TagFileManager();	

		this.processActiveFileTagsDebounce = Utils.debounce(this.processActiveFileTags.bind(this), 100);

		this.setupSourceMutationEvent();

	}

	async setupSourceMutationEvent () {
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
//console.log(view)
		const sourceView = await view.containerEl.querySelector('.markdown-source-view');
//console.log(sourceView)
		if (!this.sourceMutationEvent) {
			//this.mutationPauseDebounce = Utils.debounce(this.pause.bind(this), 110)
			this.sourceMutationEvent = new MutationEvent(
			    sourceView,
			    '.cm-hashtag',
			    'removed',
			    this.handleSourceMutation.bind(this),
			    250, false
	  		)
		} else {
			this.sourceMutationEvent.changeListenNode(sourceView);
		}
		// event is always paused. only resume when we're making a tag change
		// this is so we don't handle obsidian adding/removing based on visibility
		this.sourceMutationEvent.pause(); 
	}

	async handleSourceMutation (
		changedNodeObjs: Node | Node[]
	):void {
		if (changedNodeObjs.node.innerText.trim() != '#') {
			const activeFile: TFile = this.app.workspace.getActiveFile();
			const activeFilePath: string = activeFile.path;
			const removedTag = TagFileManager.newAbstractTag(changedNodeObjs.node.innerText);
			//this.removeTagsFromFile(activeFilePath, removedTag)
		}
	}

	async setupMutationEvent () {
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		const preView = await view.containerEl.querySelector('.markdown-reading-view');

		if (!this.mutationEvent) {
			this.mutationPauseDebounce = Utils.debounce(this.pause.bind(this), 110)
			this.mutationEvent = new MutationEvent(
			    preView,
			    '.tag',
			    ['added', 'removed'],
			    this.handleMutation.bind(this),
			    100, false
	  		)
		} else {
			this.mutationEvent.changeListenNode(preView);
		}
		// event is always paused. only resume when we're making a tag change
		// this is so we don't handle obsidian adding/removing based on visibility
		this.pause(); 
	}

	resolveTagEls () {


		// when done, THIS is where we reset the added/removed tag managers
	}

	public pause() {
		if (!this.paused) {
			this.paused = true;
			this.mutationEvent?.pause();
		}
	}

	public resume() {
		if (this.paused) {
			this.paused = false;
			this.mutationEvent?.resume();
		}
	}

	async handleMutation (
		changedNodeObjs: Node | Node[]
	):void {
		// This assumes we get an ungrouped batch of node objects
		const activeFile: TFile = this.app.workspace.getActiveFile();
		const activeFilePath: string = activeFile.path;

		if (Array.isArray(changedNodeObjs)) {
			let nodes: Array = [];
			changedNodeObjs.forEach(nodeObj => { nodes.push(nodeObj.node); });
//console.log("Changed nodes are:", nodes);
		} else { 
//console.log("Individual Callback: " + changedNodeObjs.type + " node is: ", changedNodeObjs.node); 
			const tagNode = changedNodeObjs.node; 
			const tagType = changedNodeObjs.type;

			if (tagType == 'removed') {
				this.removedTagsManager.setFileTags(activeFilePath, tagNode);
				this.tagFileManager.flagTag(activeFilePath, tagNode)

				//this.tagFileManager.removeTagsFromFile(activeFilePath, tagNode)
			} else if (tagType == 'added') {
				//if (tagNode.getAttribute('pos') == undefined) { // sneaky obsidian visibility added
					this.addedTagsManager.setFileTags(activeFilePath, tagNode);

					//this.tagFileManager.setFileTags(activeFilePath, tagNode)
				//}
			}

			if (this.tempTimeout) clearTimeout(this.tempTimeout);
			this.tempTimeout = setTimeout(async () => { 
				let tags = this.removedTagsManager.getTags(activeFilePath).map(tag => tag.innerText);
console.log('removed:', tags)
				tags = this.addedTagsManager.getTags(activeFilePath).map(tag => tag.innerText);
console.log('added:', tags)
				tags = this.tagFileManager.getTags(activeFilePath).map(tag => tag);
console.log('activeFileTags:', tags)
				this.tempTimeout = undefined;


				//this.processActiveFileTagsDebounce(this.tagFileManager.getTags(activeFilePath))
			}, 100);

			
			this.mutationPauseDebounce();
			return;
		}

console.log('-------> add/remove batch tags')
		let addedTags = changedNodeObjs.filter(nodeObj => nodeObj.type === 'added').map(nodeObj => nodeObj.node);
		let removedTags = changedNodeObjs.filter(nodeObj => nodeObj.type === 'removed').map(nodeObj => nodeObj.node);
		addedTags = this.filterActiveFileTagEls(addedTags)
		removedTags = this.filterActiveFileTagEls(removedTags)

		/*this.addedTagsManager.setFileTags(activeFilePath, addedTags);
		this.removedTagsManager.setFileTags(activeFilePath, removedTags);
		addedTags = this.addedTagsManager.getTags(activeFilePath);
		removedTags = this.removedTagsManager.getTags(activeFilePath);*/

		// Filter any obsidian added tags based on visiblity that snunk in during this edit
		addedTags = addedTags.filter(node => node.getAttribute('pos') == undefined)
		
		const removedTags2 = removedTags.map(node => node.innerText);
		const addedTags2 = addedTags.map(node => node.innerText);
		const lowestTagPos: number = this.getLowestTagPos(removedTags);
		//this.activeFileTagEls.splice(lowestTagPos, removedTags.length, ...addedTags);
//removedTags.forEach(tag => {console.log('Tag removed: ', tag.innerText);})
//addedTags.forEach(tag => {console.log('Tag added: ', tag.innerText);})
console.log('Tags removed: ', removedTags2);
console.log('Tags added: ', addedTags2);
const firstRemovedEl = Utils.outerHTMLToElement(removedTags[0]?.outerHTML)
console.log('First tag removed: ', firstRemovedEl.innerText, lowestTagPos);

		this.tagFileManager.getTags(activeFilePath).splice(lowestTagPos, removedTags.length, ...addedTags);

		// Important so we dont handle obsidian add/removing nodes based on visibility
		this.mutationPauseDebounce();

		//this.processActiveFileTags(this.activeFileTagEls); 
		this.processActiveFileTags(this.tagFileManager.getTags(activeFilePath));
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

	getLowestTagPos(
		tags: HTMLElement[]
	): number {
	  let lowestPos: number = Infinity; 
	  
	  tags.forEach((tag) => {
	    const pos = parseInt(tag.getAttribute('pos') || 'Infinity'); 
	    if (pos < lowestPos) {
	      lowestPos = pos;
	    }
	    //console.log(tag, pos, lowestPos)
	  });
	  
	  return isFinite(lowestPos) ? lowestPos : 0;
	}

	// This method is just for the initial processing.
	async renderPostProcessor (
		el: HTMLElement, 
		ctx: MarkdownPostProcessorContext
	): void {

		//if (this.activeFileTagsSetup) return;
		// enable this again when file open is different from last open file.
		//if (this.app.workspace.getActiveViewOfType(MarkdownView)?.getMode() != 'preview') return;
		
		const processingFile: TFile = this.app.vault.getAbstractFileByPath(ctx.sourcePath);
		const activeFile: TFile = this.app.workspace.getActiveFile();
		const activeFilePath: string = activeFile?.path;
//console.log(ctx.sourcePath)
		
		// Native embeds are processed asynchronously
		// If there are tags in the embed, they won't be accessible until later
		// But at that time, we'll have lost context to the embed.
		// So we setup a mutation observer to capture them.
		const nativeEmbedEl: HTMLElement = el.querySelector('.internal-embed');
		const tags: HTMLElement[] = el.querySelectorAll('.tag');
//console.log(el)

		//if (nativeEmbedEl || tags.length > 0 && ctx.sourcePath != 'noFile') console.log('renderPostProcessor');
		if (
			(nativeEmbedEl && ctx.sourcePath == activeFilePath) // embeds
			|| (ctx.sourcePath == activeFilePath && tags.length > 0) // active file tags
			|| el.classList.contains('tag-summary-paragraph') // summary tags
		) {
			console.log('renderPostProcessor'); 
		}
		else { return; }
	
		if (nativeEmbedEl) {
			this.nativeEmbeds.push(nativeEmbedEl);
			let nativeEmbedObserver: MutationObserver;
			nativeEmbedObserver = new MutationObserver((mutationsList) => {			
				const target: HTMLElement = mutationsList[0].target;
				if (target.querySelectorAll('.tag').length > 0) {
					nativeEmbedObserver.disconnect();
					this.processNativeEmbed(target);
				}
			});
			nativeEmbedObserver.observe(nativeEmbedEl, { childList: true, subtree: true });
			//return; // does this help filter the active file tags?
		}
	
		if (el.classList.contains('tag-summary-paragraph')) {
			this.processTagSummaryParagraph(el);
			return; // does this help filter the active file tags?
		} 

		/*if (this.mutationEvent?.pauseState === false 
			|| this.activeFileTagsSetup
		) {
			//debounce(this.processActiveFileTags(this.tagFileManager.getTags(activeFilePath)), 200);
			return;
		} else {
			
		}*/
		// Return because the mutations are handling active file tags after initial setup

// check if new file is different from old file. then enable renderer?
console.log('renderPostProcessor---> activeFileTags')
		// ACTIVE FILE TAG ARRAY SETUP
		this.tempTagFileManager.setFileTags(ctx.sourcePath, tags)

		if (this.tempTimeout) clearTimeout(this.tempTimeout);
		this.tempTimeout = setTimeout(async () => { 

			//if (this.activeFileTagEls.length === 0) {
				//this.activeFileTagEls = [...this.tempTagFileManager.getTags(activeFilePath)];
				if (!this.activeFileTagsSetup) {
					this.tagFileManager.setFileTags(activeFilePath, [...this.tempTagFileManager.getTags(activeFilePath)])
				} else {
					const tempTags = []
					this.tempTagFileManager.getTags(activeFilePath).forEach(tag => {
						tempTags.push(tag.innerText)
					})
console.log('new render tags:', tempTags);
				}
				//console.log(this.activeFileTagEls.length, this.tagFileManager.getTags(activeFilePath).length)
			//} else {
				// Return because the mutations are handling active file tags after initial setup
				//return;
			//}

			

			//this.processActiveFileTags();
			//this.processActiveFileTags(this.activeFileTagEls);
		   

			if (!this.activeFileTagsSetup) this.processActiveFileTags(this.tagFileManager.getTags(activeFilePath));
			this.tempTimeout = undefined;

			//if (!this.activeFileTagsSetup) 
				this.setupMutationEvent();

			 this.activeFileTagsSetup = true; // use this for now - but later make it a mode. 
		    // like, the render is not making a new array. just logging the new renders
		    // the mode should be in the tag file manager object?

			 // have to reset here because file-open events sometimes happened between markdown renders... :/
			this.tempTagFileManager.reset();

		}, 100);
		
	
	}

	async processActiveFileTags (
		tags: HTMLElement[],
	): void {		
console.log('processing active file tags')		

		const activeFile = await this.app.workspace.getActiveFile();
		const fileContent = await this.app.vault.read(activeFile);
		const activeFileTags = await this.getMarkdownTags(
			activeFile, 
			fileContent
		);

		// Filter tags 
		const filteredTagElements = this.filterActiveFileTagEls(tags);
		
		if (filteredTagElements.length > 0) {
			this.assignMarkdownTags(
				activeFileTags, 
				filteredTagElements,  
				0, //startIndex,
				'active'
			);
		}
		//this.activeFileTagEls = [];
		//this.tempTagFileManager.reset();
		this.addedTagsManager.reset();
		this.removedTagsManager.reset();
		this.activeFileTagsSetup = true;
		//this.tagFileManager.setAdditionalDataForFile(activeFile.path, 'loaded', true)
		//console.log('activeFileTagsSetup?', this.activeFileTagsSetup)	
	}

	reset () {
		
		console.log('tag processor reset')
		this.activeFileTagsSetup = false;
		this.mutationEvent?.changeListenNode(this.plugin.readingViewEl);
		this.sourceMutationEvent?.changeListenNode(this.plugin.readingViewEl);
		this.tagFileManager.reset();
	}


	async processTagSummaryParagraph (
		paragraphEl: HTMLElement,
	):void {
console.log('processTagSummaryParagraph')

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
		    //console.log(tag)
		    tagPositions.push({tag:tag, index:match.index, source:file.name}); 
		}
		return tagPositions;
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

	async assignMarkdownTags (
		tagPositions:Array, 
		tagElements: HTMLElement[],
		startIndex: number, 
		type: string
	): HTMLElement[] {

if (type == 'active') {
	//console.log(startIndex);
	const activeFilePath = this.app.workspace.getActiveFile().path;
	console.log(tagPositions.length, tagElements.length) 
	//console.log(tagPositions, tagElements, this.tagFileManager.getTags(activeFilePath)) 
	const temp1 = [];
	tagPositions.forEach(nodeObj => { temp1.push(nodeObj.tag) });
	const temp2 = [];
	tagElements.forEach(nodeObj => { temp2.push(nodeObj.innerText) });
	console.log(temp1, temp2)

	if (tagPositions.length != tagElements.length || tagPositions.length != this.tagFileManager.getTags(activeFilePath).length) {
//console.log('--------> in the if')
		this.outOfSync = true;
		new Notice('Markdown source and preview tags out of sync. Please close and reload this note.');
		this.logDifferences(tagPositions, tagElements)
		return;
	}

}

		let tagEl;
		const tagElArray = Array.from(tagElements); 
		let tagElIndex = 0;
		let tagPos;
		//for (let i = 0; i < Math.min(tagPositions.length, tagElements.length); i++) {
		for (let i = 0; i < tagPositions.length; i++) {
		//tagPositions.forEach((tagPos, i) => {
			tagPos = tagPositions[i];
//console.log(tagElArray[tagElIndex])
			if (tagPos.index >= startIndex) {
				tagEl = tagElArray[tagElIndex] as HTMLElement;
				if (tagEl) {
					//this.storeTag(tagEl)
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

	async processEmbeds (
		element:HTMLElement, 
		ids: string[] = ['tag-summary-block', 'markdown-embed']
	):void {		
 		const embeds = await element.querySelectorAll('.tag-summary-block, .markdown-embed');	
		embeds.forEach(async (embed) => {
//console.log(embed)
			if (embed.classList.contains('tag-summary-block')) {
				this.processTagSummary(embed);	
			} else if (embed.classList.contains('markdown-embed')) {
				this.processNativeEmbed(embed);		
				if (Array.from(embed.querySelectorAll('.tag-summary-block')).length > 0) {
					this.processTagSummary(embed);
				}	
			} else {
				//new Notice('Tag Buddy: Tag embed in unsupported element.');
				// Handle this issue on click.
			}
		});
	}

	async processTagSummary (
		embed: HTMLElement
	): void {
console.log('processTagSummary Paragraph')		
		let summaryBlocks = embed.querySelectorAll('blockquote'); 
		summaryBlocks.forEach(async (block, index) => {
			const filePath = block.getAttribute('file-source'); // linkElement.getAttribute('data-href')
			const file = this.app.vault.getAbstractFileByPath(filePath);
			const tempComponent = new TempComponent();
			if (file) {
				let fileContent = await app.vault.read(file);
				const embededTagFile = await this.getMarkdownTags(file, fileContent);
				const markdownBlock = block.getAttribute('md-source').trim();
				const startIndex = fileContent.indexOf(markdownBlock);	
				this.assignMarkdownTags(
					embededTagFile, 
					block.querySelectorAll('.tag'), 
					startIndex, 
					'plugin-summary'
				);
			}
		});		
	}

	async processNativeEmbed (
		//tags: HTMLElement[] 
		embed: HTMLElement,
		checkDuplicates: boolean = false
	):void {
console.log('processNativeEmbed')
embed.querySelectorAll('.tag').forEach((tag) => {
	//console.log(tag, 'native-embed');
})
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
 //console.log(filePath)			
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

}

class TempComponent extends Component {
	onload() {}
	onunload() {}
}