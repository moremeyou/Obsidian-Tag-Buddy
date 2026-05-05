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

export class TagSummary {
	app: App;
	plugin: TagBuddy;
	selectedBlocks: number[];

	constructor(
		app: App,
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;
	}

	async bakeSummaryBtnHandler (
		summaryMd: string,
		summaryEl:HTMLElement,
		filePath:string
	) {
		const mdSource = summaryEl.getAttribute(
			'codeblock-code'
		);

		if (mdSource) {
			const file = await this.app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				new Notice ('⚠️ Tag Buddy: Can\'t identify source note for this summary.');
				return;
			}
			const fileContent = await this.app.vault.read(file);
			const newFileContent = Utils.replaceTextInString (
				mdSource,
				fileContent,
				summaryMd
			)
			await this.app.vault.modify(file, newFileContent);

			new Notice ('Tag summary flattened to active note.');
		} else {
			new Notice ('⚠️ Tag Buddy: Can\'t find code block source. This is a BUG.');
		}
	}

	copyBtnHandler (e: Event, content: string): void {

		//e.stopPropagation();

		const selection = window.getSelection()?.toString() ?? '';

		if (selection != '') {
			navigator.clipboard.writeText(selection);
			new Notice ('Selection copied to clipboard.');
		} else {
			navigator.clipboard.writeText(content);
			new Notice ('Tagged paragraph copied to clipboard.');
		}

		//navigator.clipboard.writeText(content);
		//const notice = new Notice ('Tag Buddy: Copied to clipboard.');

	}

	async removeTagBtnHandler (e: Event, paragraphEl: HTMLElement, tag: string): Promise<void> {
		if (!tag) {
			new Notice ('⚠️ Can\'t identify tag summary item. Please refresh this summary and try again.');
			return;
		}
		const tagEl = Utils.getTagElement(paragraphEl, tag);
		const summaryEl = paragraphEl.closest('.tag-summary-block') as HTMLElement | null;
		if (!tagEl || !summaryEl) {
			new Notice ('⚠️ Can\'t identify tag summary item. Please refresh this summary and try again.');
			return;
		}
		await this.plugin.tagEditor.edit(tagEl, e, paragraphEl, 'remove', '');
		setTimeout(async () => {
			this.update(summaryEl);
	}, 800);
	}

	async copyToBtnHandler (
		e: Event,
		mode: string,
		dropdown: DropdownComponent,
		paragraphEl: HTMLElement,
		summaryEl: HTMLElement,
		content: string,
		tags: string[],
		filePath: string,
		selectedFile: TFile | null = null
	): Promise<void> {
		const selection = window.getSelection()?.toString() ?? '';
		let newContent = selection == '' ? content : selection;

		let notice;

		if (mode == 'link') {

			const fileName = filePath.split('/').pop()?.replace(/\.md$/, '') ?? filePath.replace(/\.md$/, '');
			newContent = '[[' + filePath + '|' + fileName + ']]';

		}

		if (mode != 'link' && !selection) {
			tags.forEach((tag, i) => {
				// make this a setting. we'll default to always for now
				newContent = Utils.removeTagFromString(newContent, tag).trim();
			});
		}

//console.log(dropdown.getValue())

		const copySuccess = await this.copyTextToSection(
			//this.plugin.settings.taggedParagraphCopyPrefix +
			newContent,
			dropdown.getValue(),
			filePath,
			(mode!='link'),
			selectedFile
		);

			if (copySuccess) {

				if (mode == 'note') {
					if (!selectedFile) {
						new Notice ('⚠️ Tag Buddy: Can\'t identify destination note.');
						return;
					}

					notice = new Notice(
					'Copied to section: ' + dropdown.getValue() + ' in ' + selectedFile.name + ' 🔗',
						5000);
					this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
						this.app.workspace.openLinkText(selectedFile.path+'#'+dropdown.getValue(), '');
				});

			} else if (mode == 'move' && !selection) {


				const file = await this.app.vault.getAbstractFileByPath(filePath.split('#')[0]);
				if (!(file instanceof TFile)) {
					new Notice ('⚠️ Tag Buddy: Can\'t identify source note for this summary item.');
					return;
				}
//console.log("---->", filePath, file)
				let fileContent = await this.app.vault.read(file);
				fileContent = fileContent.trim();
				const newFileContent = Utils.replaceTextInString(
					content.trim(),
					fileContent,
					newContent).trim();
				if (fileContent != newFileContent) {
					// renive the tag before copying
					await this.app.vault.modify(file, newFileContent);

					notice = new Notice(
						//'Moved to section: ' + dropdown.getValue() +
						//'.\n🔗 Open source note.',
						'Copied to section: ' + dropdown.getValue() + '. ' + ((dropdown.getValue()=='top' || dropdown.getValue()=='end') ? '' : '🔗'),
						5000);

					//this.plugin.gui.removeElementWithAnimation(paragraphEl, () => {
					setTimeout(async () => {
						//this.update(summaryEl);
						//paragraphEl.remove();
					}, 100);
					setTimeout(async () => {
						//this.plugin.tagProcessor.run();
							this.update(summaryEl);
					}, 300);
					//});

					if (dropdown.getValue() != 'top' && dropdown.getValue() != 'end') {

							this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
								//this.app.workspace.openLinkText(filePath, '');
								const activeFile = this.app.workspace.getActiveFile();
								if (activeFile) this.app.workspace.openLinkText(activeFile.path+'#'+dropdown.getValue(), '');
							});
						}

				} else {
					new Notice ('Copied to section: ' + dropdown.getValue()
						+ '.\nCan\'t update source file.');
				}

			} else if (mode == 'copy' || mode == 'link') {
					notice = new Notice ('Copied to section: ' + dropdown.getValue() + '. ' + ((dropdown.getValue()=='top' || dropdown.getValue()=='end') ? '' : '🔗'));
					if (dropdown.getValue() != 'top' && dropdown.getValue() != 'end') {
						this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
							const activeFile = this.app.workspace.getActiveFile();
							if (activeFile) this.app.workspace.openLinkText(activeFile.path+'#'+dropdown.getValue(), '');
						});
					}
			}
		}

	}

	async makeSummaryBtnHandler (
		summaryMd: string,
		tags: string[],
		code: boolean = false,
		incrementFile: boolean = false
	): Promise<void> {

//new Notice ('makeSummaryBtnHandler', 10000)

		// try to abstract the handlers from their functions
		//const newNoteObj = this.fileObjFromTags(tags);
		const newNoteObj = Utils.fileObjFromTags(tags);
		let fileContent = code ? summaryMd : '## ' + newNoteObj.title + '\n\n' + summaryMd;
		//const fileName = this.getActiveFileFolder()+newNoteObj.fileName;
		// const fileName = Utils.getActiveFileFolder(view)+newNoteObj.fileName;
		const filePath = Utils.getActiveFileFolder(this.app.workspace.getActiveFile()) ?? '';
		const fileName = filePath + newNoteObj.fileName;
		const file = this.app.vault.getAbstractFileByPath(fileName);
		let notice;

		//console.log (newNoteObj.fileName);

		if (!code) {
			tags.forEach ((tag) => {
				fileContent = Utils.replaceTextInString (tag, fileContent, tag.substring(1), true)
			});
		}

		if (file instanceof TFile && !incrementFile) {

			notice = new Notice ('⚠️ Note already exists.\nClick here to overwrite.', 8000);
			this.plugin.registerDomEvent(notice.noticeEl, 'click', async (e) => {
				await this.app.vault.modify(file, fileContent);
				notice = new Notice ('Note updated.\n🔗 Open note.', 5000);
				this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
					this.app.workspace.openLinkText(fileName, '');
				});
			});

		/*} else if ((file instanceof TFile) && incrementFile) {

			const baseName = file.name.replace(/\.md$/, "");
			const extension = ".md";
			const regex = /(\d+)$/;
			const match = baseName.match(regex);
			let incrementedFileName;
			let suffix = 1;
			if (match) {
			    suffix = parseInt(match[1], 10) + 1;
			    // If there's a match, you need to remove the matched number from the baseName before appending the incremented number
			    const numberLength = match[1].length;
			    const baseNameWithoutNumber = baseName.slice(0, -numberLength);
			    incrementedFileName = baseNameWithoutNumber + ' ' + suffix + extension;
			    console.log(suffix, filePath + incrementedFileName);
			} else {
			    // If there's no number at the end, the approach remains the same
			    incrementedFileName = baseName + ' ' + suffix + extension;
			    console.log(suffix, filePath + incrementedFileName);
			}
			this.app.vault.create(filePath+incrementedFileName, fileContent);
			const notice = new Notice ('Note created. 📜\n🔗 Open note.');
			this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
				this.app.workspace.openLinkText(newNoteObj.fileName, '');
			});
			*/

		} else if (!file) {

			await this.app.vault.create(fileName, fileContent);
			const notice = new Notice ('Summary note created. 📜\n🔗 Open note.');
			this.plugin.registerDomEvent(notice.noticeEl, 'click', (e) => {
				this.app.workspace.openLinkText(newNoteObj.fileName, '');
			});


		}
	}

	async createCodeBlock (tagsArray: string[], pos: string): Promise<void> {
		//console.log(summaryPos)
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
		    )
		}

	}

	async codeBlockProcessor (
		source: string,
		el:HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {

		// Initialize tag list
		let tags: string[] = Array();
		let include: string[] = Array();
		let exclude: string[] = Array();
		let sections: string[] = Array();
		let max: number = 50;
		let match;

		// Process rows inside codeblock
		const rows = source.split("\n").filter((row) => row.length > 0);
		rows.forEach((line) => {
			// Check if the line specifies the tags (OR)
			if (line.match(createTagSummaryTagListLinePattern('tags'))) {
				const content = line.replace(TAG_SUMMARY_TAGS_PREFIX_PATTERN, "").trim();

				// Get the list of valid tags and assign them to the tags variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(TAG_SUMMARY_TAG_TOKEN_PATTERN)) {
						return true;
					} else {
						return false;
					}
				});
				tags = list;
			}

			// Check if the line specifies the tags to include (AND)
			if (line.match(createTagSummaryTagListLinePattern('include'))) {
				const content = line.replace(TAG_SUMMARY_INCLUDE_PREFIX_PATTERN, "").trim();

				// Get the list of valid tags and assign them to the include variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(TAG_SUMMARY_TAG_TOKEN_PATTERN)) {
						return true;
					} else {
						return false;
					}
				});
				include = list;
			}

			// Check if the line specifies the tags to exclude (NOT)
			if (line.match(createTagSummaryTagListLinePattern('exclude'))) {
				const content = line.replace(TAG_SUMMARY_EXCLUDE_PREFIX_PATTERN, "").trim();

				// Get the list of valid tags and assign them to the exclude variable
				let list = content.split(/\s+/).map((tag) => tag.trim());
				list = list.filter((tag) => {
					if (tag.match(TAG_SUMMARY_TAG_TOKEN_PATTERN)) {
						return true;
					} else {
						return false;
					}
				});
				exclude = list;
			}

			// Check if the line specifies section targets for copy/move actions
			if (line.match(createTagSummarySectionsLinePattern())) {
				const content = line.replace(TAG_SUMMARY_SECTIONS_PREFIX_PATTERN, "").trim();
				// Get the list of sections and assign them to the sections variable
				let list = content.split(',').map((sec) => sec.trim());
				sections = list;
			}

			// Check if the line specifies max number of blocks to display
			match = line.match(TAG_SUMMARY_MAX_LINE_PATTERN);
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
					max,
					ctx.sourcePath ? ctx.sourcePath : '',
					codeBlock
			);
		}
	};

		createEmpty(
			element: HTMLElement,
			tags: string[],
		include: string[],
		exclude: string[],
		sections: string[],
		max: number,
			fileCtx: string,
			mdSource:string
		): void {

		const container = createEl('div');
		const textDiv = createEl("blockquote");
		textDiv.innerHTML = "There are no notes with tagged paragraphs that match the tags:<br>"
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
				String(max)
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
		): Promise<void> {

//console.log('create summary')
			const activeFile = this.app.workspace.getActiveFile();
		const validTags = tags.concat(include);
		const tempComponent = new TempComponent();
		const summaryContainer = createEl('div');
		//summaryContainer.appendChild(createEl('hr'));
		this.selectedBlocks = [];

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
				const tagsInFile = cache ? getAllTags(cache) : null;
			// Remove files where the path includes '_exclude'
			if (file.path.includes('_exclude')) return false

			// Remove the file if it's the same file as this summary
			if (activeFile) if (activeFile.path == file.path) return false;

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
		for (const item of listContents) {

			// Get files name
			// item[0] is the file, item[1] is the file content
			const fileName = item[0].name.replace(/.md$/g, "");
			const filePath = item[0].path;

			// Get paragraphs
			//let listParagraphs: string[] = Array();
			//const blocks = item[1].split(/\n\s*\n/).filter((row) => row.trim().length > 0);

			// Update to treat list items as paragraph breaks
			let listParagraphs: string[] = Array();
			const blocks = item[1]
			  .split(TAG_SUMMARY_BLOCK_SPLIT_PATTERN)
			  .filter((row) => row.trim().length > 0);


			// Get list items
			blocks.forEach((paragraph) => {

				// Check if the paragraph is another plugin
				let valid = false;
				//let listTags = paragraph.match(/#[\p{L}0-9_\-/#]+/gu);
				let listTags = paragraph.match(createTagSummaryParagraphTagPattern()); // revised to not match hash in middle of word

				if (listTags != null && listTags.length > 0) {
					if (!paragraph.includes("```") && !paragraph.includes("---")) {
						valid = this.isValidText(listTags, tags, include, exclude);
					}
				}

				if (valid) listParagraphs.push(paragraph);

			})

			// There is also some redundancy here because we are processing a lot of content that we don't need, if a max is set.
			// adjust the count check
			// Process each block of text
			for (let paragraph of listParagraphs) {
				if (count >= max) break;
				count++;

				// Restore newline at the end
				paragraph += "\n";

					// Check which tag matches in this paragraph.
					let tagSection: string | null = null;
				tags.forEach((tag) => {
					const regex = createTagSummaryMatchedTagPattern(tag);
		if (paragraph.match(regex) != null) {
			tagSection = tag
		}
	});

		const buttonContainer = createEl('div');
		//const selectContainer = createEl('div');
		buttonContainer.setAttribute('class', 'tagsummary-buttons')
		const paragraphEl = createEl("blockquote");
				paragraphEl.setAttribute('file-source', filePath);

					paragraphEl.setAttribute('index', String(count-1));

				paragraphEl.setAttribute('class', 'tag-summary-paragraph');

				const blockLink = paragraph.match(createTagSummaryBlockLinkPattern());

				// Check if there's a header in this paragaph
				const header = Utils.findClosestHeaderWithLink(paragraph);
				let headerLink = Utils.removeTextFromString ("#", header.link, true);
				//headerLink = Utils.removeTextFromString ("@", headerLink, true);
				headerLink = Utils.removeTextFromString ("[", headerLink, true);
				headerLink = Utils.removeTextFromString ("]", headerLink, true);
				//console.log("-------------", headerLink)


				let link;

			if (blockLink) link = '[[' + filePath + '#' + blockLink[0] + '|' + fileName + ']]';

		//else if (header.text != '') link = '[[' + filePath + '#' + header.link + '|' + fileName + ']]';
		else if (header.text != '') link = '[[' + filePath + '#' + headerLink + ']]';

		else link = '[[' + filePath + '|' + fileName + ']]';

			/*buttonContainer.appendChild(
					this.plugin.gui.makeBlockSelector(
						count-1
					)
				);*/

				//if (sections.length >= 1) {
		/*if (this.plugin.settings.removeTagBtn == 'always'
			|| this.plugin.settings.removeTagBtn == 'desktop' && !this.app.isMobile
			|| this.plugin.settings.removeTagBtn == 'mobile' && this.app.isMobile
			)
			*/
		//if (Utils.platformSettingCheck (this.app, this.plugin.settings.removeTagBtn)) {

					buttonContainer.appendChild(
						this.plugin.gui.makeCopyToSection(
							this.copyToBtnHandler.bind(this),
							paragraph,
							sections,
							tags,
							(blockLink ? (filePath + '#' + blockLink[0]) : filePath),
							paragraphEl,
							summaryContainer
						)
					);
				//}
				if (Utils.platformSettingCheck (this.app, this.plugin.settings.copyToCBBtn)) {

					buttonContainer.appendChild(
						this.plugin.gui.makeCopyButton(
							this.copyBtnHandler.bind(this),
							paragraph.trim()
						)
					);

				}
//console.log(Utils.platformSettingCheck (this.app, this.plugin.settings.removeTagBtn))
				if (Utils.platformSettingCheck (this.app, this.plugin.settings.removeTagBtn)) {

					buttonContainer.appendChild(
						this.plugin.gui.makeRemoveTagButton(
								this.removeTagBtnHandler.bind(this),
								paragraphEl,
								tagSection ?? ''//,
							//(blockLink ? (filePath + '#' + blockLink[0]) : filePath)
						)
					);

				}


		const mdParagraph = paragraph;
		paragraph = '**' + link + '**\n' + paragraph;
		summary += paragraph + '\n';

		paragraphEl.setAttribute('md-source', mdParagraph);
		blocks.push(mdParagraph)
//console.log(mdParagraph, '\n-----\n', paragraph)
//console.log(activeFile.path)



/*const el = document.createElement("div") // using `createElement` instead of `createEl` to avoid appending to the DOM
const comp = new Component()
// @ts-expect-error `obsidian` package not yet updated
await MarkdownRenderer.render(this.app, "![[example.png]]", el, "", comp)
comp.load() // loads embeds
console.log(el.cloneNode(true)) // do something with el
comp.unload() // when done with it to release resources
*/
await MarkdownRenderer.render(this.app, paragraph, paragraphEl, "", tempComponent)


		/*await MarkdownRenderer.renderMarkdown(
			paragraph,
			paragraphEl,
			activeFile.path,
			//filePath, //'',
			tempComponent
			);*/

//console.log('markdown render summary')

		const titleEl = createEl('span');
		titleEl.setAttribute('class', 'tagsummary-item-title');

		// Not doing this until/when/if we ever clean up all the copyTo methods
		// as described in the getSelection method.
				/*titleEl.appendChild(
					this.plugin.gui.makeBlockSelector(
						parseInt (paragraphEl.getAttribute('index'))
					)
				);*/

			const strongEl = paragraphEl.querySelector('strong');
			if (strongEl) titleEl.appendChild(strongEl.cloneNode(true))
		//console.log(paragraphEl.outerHTML)
			//if (this.plugin.settings.tagSummaryBlockButtons)
				paragraphEl.appendChild(buttonContainer);
			if (strongEl) strongEl.replaceWith(titleEl)
		//paragraphEl.setAttribute('md-source', mdParagraph)

		summaryContainer.appendChild(paragraphEl);
			}
		}


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
					this.makeSummaryBtnHandler.bind(this),
					summary,
					tags
				)
			);
			summaryContainer.appendChild(
					this.plugin.gui.makeBakeButton(
						this.bakeSummaryBtnHandler.bind(this),
						summary,
						summaryContainer,
						activeFile?.path ?? fileCtx
					)
				);

			summaryContainer.appendChild(createEl('br'));
				}
				//summaryContainer.appendChild(createEl('hr'));
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
					String(max)
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
					max,
					'',
					mdSource
			);
		}
	}

	update (
		summaryEl:HTMLElement
	): void {
//console.log('>>>> Update')
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
				mdSource ?? '');
		}


	// Not factored yet
	async copyTextToSection(
	    text: string,
	    section: string,
	    filePath: string,
	    addLink: boolean = true,
	    selectedFile: TFile | null = null,
	    detectPrefix: boolean = true)
	:Promise<boolean>{

	    const file = selectedFile ? selectedFile : (await this.app.workspace.getActiveFile());
	    if (!file) {
		new Notice ('⚠️ Tag Buddy: Can\'t identify destination note.');
		return false;
	    }
	    let fileContent = await this.app.vault.read(file);
	    const fileContentLines: string[] = Utils.getLinesInString(fileContent);
	    const mdHeadings = Utils.getMarkdownHeadings(fileContentLines);
	    let targetLine = fileContentLines.length - 1;

	    //if (mdHeadings.length <= 0 || section == 'end' || section == 'top' || section == 'note' || section == 'newNote') {
	if (mdHeadings.length <= 0 || section == 'end' || section == 'top') {

		if (section == 'top') {
			targetLine = Utils.findFirstLineAfterFrontMatter(fileContent)
			if (targetLine == 0) fileContent = '\n' + fileContent
				//console.log(targetLine)
		/*} else if (section == 'newNote') {
			this.makeSummaryBtnHandler (text, [], true, true);
			return true;
			*/
		    //} else if (section == 'end' || mdHeadings.length <= 0 || section == 'note') {
		} else if (section == 'end') {
			targetLine = fileContentLines.length - 1;
		    //} else if (mdHeadings.length <= 0) {
		    }
	    } else if (mdHeadings.length > 0) { // if there are any headings
	        const headingObj = mdHeadings.find(heading => heading.text.trim() === section);
	        if (headingObj) {
		targetLine = headingObj.line;
	        } else {
	            new Notice (`${section} not found. Pasting at top of note.`);
	            targetLine = Utils.findFirstLineAfterFrontMatter(fileContent);
			if (targetLine == 0) fileContent = '\n' + fileContent;
	        }
	    }

	    const linePrefix: string = detectPrefix ? Utils.getListTypeFromLineNumber(fileContent, targetLine+1) : '';
        let finalText;
        if (addLink) finalText = linePrefix + text + ` [[${filePath}|🔗]]`;
        else finalText = linePrefix + text;
        //let newContent = this.insertTextAfterLine(text, fileContent, headingObj.line);
        let newContent = Utils.insertTextAfterLine(finalText, fileContent, targetLine);
        await this.app.vault.modify(file, newContent);
        return true;
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
	): string[] {
		const tagsStr = tagSummaryEl.getAttribute('codeblock-tags');
		const tags = tagsStr ? tagsStr.split(',') : [];
		const tagsIncludeStr = tagSummaryEl.getAttribute('codeblock-tags-include');
		const tagsInclude = tagsIncludeStr ? tagsIncludeStr.split(',') : [];
		return tags.concat(tagsInclude);
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

		// If isSelected is true, add the index if it's not already in the array
		if (bool) {
		    if (!this.selectedBlocks.includes(index)) {
		        this.selectedBlocks.push(index);
		    }
		} else {
		    // If isSelected is false, remove the index from the array
		    this.selectedBlocks = this.selectedBlocks.filter(itemIndex => itemIndex !== index);
		}

//console.log(this.selectedBlocks)

	}


	getSelectedMarkdownBlocks (): string[] {

		// This is too messy with current implmentation.
		// To make this work, we need to break out all the copyTo, getPrefix, addLink, etc methods/props
		// we need to be building the content as we select.

		// move: I don't think we can remove in bulk? maybe just do it without motion.
		// bake should be easy
		// copy, easy
		// new note
		// copy to: easy, but need to add the bullet to each
		// i guess link is the same easy
		return [];
	}

}

class TempComponent extends Component {
	doNotPostProcess = true;
	onload() {}
	onunload() {}
}
