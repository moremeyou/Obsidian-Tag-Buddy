import { App, MarkdownRenderer, MarkdownPostProcessorContext, DropdownComponent, Component, TFile, getAllTags, MarkdownView, Notice, Plugin } from 'obsidian';
import TagBuddy from "main";
import * as Utils from './utils';

export class TagSummary {
	app: App; 
	plugin: TagBuddy;
	selectedBlocks: Number[];
	blocks: String[];

	constructor(
		app: App, 
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;
	}

	updateSelection (
		index: Number, 
		bool: Boolean
	): void {

		// If isSelected is true, add the index if it's not already in the array
		if (bool) {
		    if (!this.selectedBlocks.includes(index)) {
		        this.selectedBlocks.push(index);
		    }
		} else {
		    // If isSelected is false, remove the index from the array
		    this.selectedBlocks = this.selectedBlocks.filter(itemIndex => itemIndex !== index);
		}

console.log(this.selectedBlocks)

	}


	getSelectedMarkdownBlocks (): String[] {
		
		// if no selection, just send 
		// grab the md-source from each block
		// always show a warning when doing any action with a selection

		// when doing any of the button actions, it should call back to a function here
		// if there's a selection, use that.
		// if not use what it has.
		// we'll have to define defaults if we're combining blocks
		// move: I don't think we can remove in bulk? maybe just do it without motion.
		// bake should be easy
		// copy, easy
		// new note
		// copy to: easy, but need to add the bullet to each
		// i guess link is the same easy
	}



	async codeBlockProcessor (
		source: string, 
		el:HTMLElement, 
		ctx
	): void {
		
		// Initialize tag list
		let tags: string[] = Array();
		let include: string[] = Array();
		let exclude: string[] = Array();
		let sections: string[] = Array();
		let max: number = 50;
		const maxPattern = /^\s*max:\s*(\d+)\s*$/;
		let match;

		// Process rows inside codeblock
		const rows = source.split("\n").filter((row) => row.length > 0);
		rows.forEach((line) => {
			// Check if the line specifies the tags (OR)
			if (line.match(/^\s*tags:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*tags:/, "").trim();

				// Get the list of valid tags and assign them to the tags variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				tags = list;
			}

			// Check if the line specifies the tags to include (AND)
			if (line.match(/^\s*include:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*include:/, "").trim();

				// Get the list of valid tags and assign them to the include variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				include = list;
			}

			// Check if the line specifies the tags to exclude (NOT)
			if (line.match(/^\s*exclude:[\p{L}0-9_\-/# ]+$/gu)) {
				const content = line.replace(/^\s*exclude:/, "").trim();

				// Get the list of valid tags and assign them to the exclude variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(/^#[\p{L}]+[^#]*$/u)) {
						return true;
					} else {
						return false;
					}
				});
				exclude = list;
			}

			// Check if the line specifies sections of a note
			if (line.match(/^\s*sections:[\p{L}0-9_\-/#, ]+$/gu)) {
				const content = line.replace(/^\s*sections:/, "").trim();
				// Get the list of sections and assign them to the sections variable
				let list = content.split(',').map((sec) => sec.trim());
				sections = list;
			}

			// Check if the line specifies max number of blocks to display
			match = line.match(maxPattern);
			if (match) {
    			max = Math.min(50, Number(match[1]));
			}
		});
		const codeBlock = '```tag-summary\n'+source.trim()+'\n```'
		// Create summary only if the user specified some tags
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
				max ? max : [], 
				ctx.sourcePath ? ctx.sourcePath : '', 
				codeBlock
			);
		} 
	}; 

	createEmpty(
		element: HTMLElement, 
		tags: String[], 
		include: string[], 
		exclude: string[], 
		sections: string[], 
		max: number, 
		fileCtx: string, 
		mdSource:string
	): void {

		const container = createEl('div');
		const textDiv = createEl("blockquote");
		textDiv.innerHTML = "There are no files with tagged paragraphs that match the tags:<br>"
			+ (tags.length>0 ? tags.join(', ') : "No tags specified.") + "<br>";
		
		container.appendChild(textDiv);
		container.setAttribute(
			'codeblock-tags', 
			((tags.length > 0) ? tags.join(',') : '')
		);
		container.setAttribute(
			'codeblock-tags-include', 
			(include ? include.join(',') : '')
		);
		container.setAttribute(
			'codeblock-tags-exclude', 
			(exclude ? exclude.join(',') : '')
		);
		container.setAttribute(
			'codeblock-sections', 
			(sections ? sections.join(',') : '')
		);
		container.setAttribute(
			'codeblock-max', 
			max
		);
		container.setAttribute(
			'codeblock-code', 
			mdSource
		);

		container.appendChild(this.plugin.gui.makeSummaryRefreshButton(container));;

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
		mdSource:string
	): void {
		
//console.log('create summary')
		const activeFile = await this.app.workspace.getActiveFile();
		const validTags = tags.concat(include);
		const tempComponent = new TempComponent();
		const summaryContainer = createEl('div');
		this.selectedBlocks = [];
		this.blocks = [];

		summaryContainer.setAttribute(
			'class', 
			'tag-summary-block'
		);
		
		// Get files
		let listFiles = this.app.vault.getMarkdownFiles();

		// Filter files
		listFiles = listFiles.filter((file) => {
			// Remove files that do not contain the tags selected by the user
			const cache = this.app.metadataCache.getFileCache(file);
			const tagsInFile = getAllTags(cache);

			if (validTags.some((value) => tagsInFile?.includes(value))) {
				return true;
			}
			return false;
        });

		// Sort files alphabetically
		// make this a property of the code block. but default to modified date
		/*listFiles = listFiles.sort((file1, file2) => {
			if (file1.path < file2.path) {
				return -1;
			} else if (file1.path > file2.path) {
				return 1;
			} else {
				return 0;
			}
		});*/
 

		listFiles = listFiles.sort((file1, file2) => {
		    // Since mtime is a Unix timestamp in milliseconds, we can directly subtract them
		    //console.log(file2.stat.ctime - file1.stat.ctime)
		    return file2.stat.ctime - file1.stat.ctime;
		});

		// Get files content
		let listContents: [TFile, string][] = await this.readFiles(listFiles);
		let count = 0;

		// Create summary
		let summary: string = "";
		listContents.forEach((item) => {

			// Get files name
			const fileName = item[0].name.replace(/.md$/g, "");
			const filePath = item[0].path;
			//console.log(activeFile)
			// Do not add this item if it's in the same file we're creating the summary
			// Should filter this file out earlier
			if (activeFile) {
				if (activeFile.name == item[0].name) return;
			}

			// Get paragraphs
			let listParagraphs: string[] = Array();
			const blocks = item[1].split(/\n\s*\n/).filter((row) => row.trim().length > 0);

			// Get list items
			blocks.forEach((paragraph) => {
				
				// Check if the paragraph is another plugin
				let valid = false;
				//let listTags = paragraph.match(/#[\p{L}0-9_\-/#]+/gu);
				let listTags = paragraph.match(/(?<=^|\s)(#[^\s#.,;!?:]+)/g); // revised to not match hash in middle of word
				
				if (listTags != null && listTags.length > 0) {
					if (!paragraph.contains("```") && !paragraph.contains("---")) {
						valid = this.isValidText(listTags, tags, include, exclude);
					}
				}

				if (valid) listParagraphs.push(paragraph);  

			})

			// There is also some redundancy here because we are processing a lot of content that we don't need, if a max is set. 
			// adjust the count check 
			// Process each block of text
			listParagraphs.forEach(async(paragraph) => {
				if (count++ >= max) return;

				// Restore newline at the end
				paragraph += "\n";

				var regex = new RegExp;

				// Check which tag matches in this paragraph.
				var tagText = new String;
				var tagSection = null;
				tags.forEach((tag) => {
					tagText = tag.replace('#', '\\#');
					regex = new RegExp(`${tagText}(\\W|$)`, 'g');
              		if (paragraph.match(regex) != null) { 
              			tagSection = tag
              		} 
            	});
          		
          		const buttonContainer = createEl('div');
          		//const selectContainer = createEl('div');
          		buttonContainer.setAttribute('class', 'tagsummary-buttons')
          		const paragraphEl = createEl("blockquote");
				paragraphEl.setAttribute('file-source', filePath);

				paragraphEl.setAttribute('index', count-1);

				paragraphEl.setAttribute('class', 'tag-summary-paragraph');

				const blockLink = paragraph.match(/\^[\p{L}0-9_\-/^]+/gu); 
				let link;
        		
        		if (blockLink) link = '[[' + filePath + '#' + blockLink + '|' + fileName + ']]';
        		else link = '[[' + filePath + '|' + fileName + ']]';
						
        		if (this.plugin.settings.tagSummaryBlockButtons) {

        			/*buttonContainer.appendChild(
						this.plugin.gui.makeBlockSelector(
							count-1
						)
					);*/

					if (sections.length >= 1) {
						buttonContainer.appendChild(
							this.plugin.gui.makeCopyToSection(
								paragraph, 
								sections, 
								tags,
								(blockLink ? (filePath + '#' + blockLink[0]) : filePath), 
								paragraphEl, 
								summaryContainer
							)
						);
					}
					buttonContainer.appendChild(
						this.plugin.gui.makeCopyButton(
							paragraph.trim()
						)
					);
    				buttonContainer.appendChild(
    					this.plugin.gui.makeRemoveTagButton(
    						paragraphEl, 
    						tagSection, 
    						(blockLink ? (filePath + '#' + blockLink[0]) : filePath)
						)
					);

    			}

        		const mdParagraph = paragraph;
        		paragraph = '**' + link + '**\n' + paragraph;
          		summary += paragraph + '\n'; 

          		paragraphEl.setAttribute('md-source', mdParagraph); 
          		blocks.push(mdParagraph)

          		await MarkdownRenderer.renderMarkdown(
          			paragraph, 
          			paragraphEl, 
          			filePath, //'', 
          			tempComponent
      			);

//console.log('markdown render summary')
          		
          		const titleEl = createEl('span');
          		titleEl.setAttribute('class', 'tagsummary-item-title');

				titleEl.appendChild(
					this.plugin.gui.makeBlockSelector(
						parseInt (paragraphEl.getAttribute('index'))
					)
				);

          		titleEl.appendChild(paragraphEl.querySelector('strong').cloneNode(true))

          		if (this.plugin.settings.tagSummaryBlockButtons) paragraphEl.appendChild(buttonContainer);
          		paragraphEl.querySelector('strong').replaceWith(titleEl)
          		//paragraphEl.setAttribute('md-source', mdParagraph)

          		summaryContainer.appendChild(paragraphEl);
			});
		});
	
		
		// Add Summary
		if (summary != '') {
			setTimeout(async () => { 
				if (this.plugin.settings.showSummaryButtons) {
					summaryContainer.appendChild(
						this.plugin.gui.makeSummaryRefreshButton(
							summaryContainer
						)
					);
	        		summaryContainer.appendChild(
	        			this.plugin.gui.makeCopySummaryButton(
	        				summary
        				)
        			);
	        		summaryContainer.appendChild(
	        			this.plugin.gui.makeSummaryNoteButton(
	        				summary, 
	        				tags
        				)
        			);
	        		summaryContainer.appendChild(
	        			this.plugin.gui.makeBakeButton(
	        				summary, 
	        				summaryContainer, 
	        				activeFile.path
        				)
        			);

	        		summaryContainer.appendChild(createEl('br')); 
				} 
				summaryContainer.appendChild(createEl('hr')); 
			}, 0);
			summaryContainer.setAttribute(
				'codeblock-tags', 
				tags.join(',')
			);
			summaryContainer.setAttribute(
				'codeblock-tags-include', 
				((include.length > 0) ? include.join(',') : '')
			);
			summaryContainer.setAttribute(
				'codeblock-tags-exclude', 
				((exclude.length > 0) ? exclude.join(',') : '')
			);
			summaryContainer.setAttribute(
				'codeblock-sections', 
				((sections.length > 0) ? sections.join(',') : '')
			);
			summaryContainer.setAttribute(
				'codeblock-max', 
				max
			);
			summaryContainer.setAttribute(
				'codeblock-code', 
				mdSource
			);

			element.replaceWith(summaryContainer);
		} else {
			this.createEmpty(
				element, 
				tags ? tags : [], 
				include ? include : [], 
				exclude ? exclude : [], 
				sections ? sections : [], 
				max ? max : [], 
				'', 
				mdSource
			);
		}
	}

	update (
		summaryEl:HTMLElement
	): void {
		
		const tagsStr = summaryEl.getAttribute(
			'codeblock-tags'
		);
		const tags = tagsStr ? tagsStr.split(',') : [];

		const tagsIncludeStr = summaryEl.getAttribute(
			'codeblock-tags-include'
		);
		const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];

		const tagsExcludeStr = summaryEl.getAttribute(
			'codeblock-tags-exclude'
		);
		const tagsExclude = tagsExcludeStr ? tagsExcludeStr.split(',') : [];

		const sectionsStr = summaryEl.getAttribute(
			'codeblock-sections'
			);
		const sections = sectionsStr ? sectionsStr.split(',') : [];

		const max = Number(summaryEl.getAttribute(
			'codeblock-max'
		));

		const mdSource = summaryEl.getAttribute(
			'codeblock-code'
		);

		this.create(
			summaryEl, 
			tags, 
			tagsInclude, 
			tagsExclude, 
			sections, 
			max, 
			'', 
			mdSource);
	}


	// Not factored yet
	async copyTextToSection(
	    text: string, 
	    section: string, 
	    filePath: string,
	    addLink: Boolean = true)
	:Promise<boolean>{

	    const file = await this.app.workspace.getActiveFile();
	    const fileContent = await this.app.vault.read(file);
	    const fileContentLines: string[] = Utils.getLinesInString(fileContent);
	    const mdHeadings = Utils.getMarkdownHeadings(fileContentLines);
	    if (mdHeadings.length > 0) { // if there are any headings
	        const headingObj = mdHeadings.find(heading => heading.text.trim() === section);
	        if (headingObj) {

//console.log(headingObj.line)
				const linePrefix: String = Utils.getListTypeFromLineNumber(fileContent, headingObj.line+1);
				//console.log(linePrefix)


	            const textWithLink = linePrefix + text + (addLink?(` [[${filePath}|🔗]]`):'');
	            //let newContent = this.insertTextAfterLine(text, fileContent, headingObj.line);
	            let newContent = Utils.insertTextAfterLine(textWithLink, fileContent, headingObj.line);
	            await this.app.vault.modify(file, newContent);
	            return true;
	        } else {
	            new Notice (`Tag Buddy: ${section} not found.`);
	            return false;
	        }
	    } else {
	        new Notice ('Tag Buddy: There are no header sections in this note.');
	        return false;
	    }
	}

	async readFiles(
		listFiles: TFile[]
	): Promise<[TFile, string][]> {
		
		let list: [TFile, string][] = [];
		for (let t = 0; t < listFiles.length; t += 1) {
			const file = listFiles[t];
			let content = await this.app.vault.cachedRead(file);
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

	    // Check OR (tags)
	    if (tags.length > 0) {
	        valid = valid && tags.some((value) => listTags.includes(value));
	    }
	    // Check AND (include)
	    if (include.length > 0) {
	        valid = valid && include.every((value) => listTags.includes(value));
	    }
	    // Check NOT (exclude)
	    if (valid && exclude.length > 0) {
	        valid = !exclude.some((value) => listTags.includes(value));
	    }
	    return valid;       
	}

	static getTagsToCheckFromEl (
		tagSummaryEl: HTMLElement
	): Array {
		const tagsStr = tagSummaryEl.getAttribute('codeblock-tags');
		const tags = tagsStr ? tagsStr.split(',') : [];
		const tagsIncludeStr = tagSummaryEl.getAttribute('codeblock-tags-include');
		const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];
		return tags.concat(tagsInclude);
	}

	async getFile (
		el: HTMLElement
	):TFile {
		const filePath = el.getAttribute('file-source'); 
		const file = await this.app.vault.getAbstractFileByPath(filePath);
		return file;
	}

}

class TempComponent extends Component {
	doNotPostProcess = true;
	onload() {}
	onunload() {}
}