import { App, DropdownComponent, setIcon, MarkdownView, Notice } from 'obsidian';
import TagBuddy from "main";
import * as Utils from './utils';
import { TagSelector } from './Modal'
import { TBTagEditorModal } from './TagEditorModal'
import { SelectFileModal } from './FindFileModal'
import {
	GUI_TEXT,
	NOTICE_TEXT,
	copyToButtonTitle,
	removedTagFromParagraphTitle,
} from './userText';

type CopyToMode = 'link' | 'copy' | 'move' | 'note';
type CopyToCallback = (...args: any[]) => unknown;

export class GUI {
	app: App;
	plugin: TagBuddy;

	constructor(
		app: App,
		plugin: TagBuddy) {

		this.app = app;
		this.plugin = plugin;
	}

	showTagEditor (tagEl: HTMLElement): void {

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();

		const index = parseInt(tagEl.getAttribute('md-index') ?? '0');
		const tag = tagEl.innerText;
		const filePath = tagEl.getAttribute('file-source')

	if (mode == 'preview') {

			new TBTagEditorModal (
				this.app,
				this.plugin,
				tag,
				index,
				filePath ?? undefined,
				tagEl,
			).open();

		}


	}

	makeButton (
		lable: string,
		clickFn: (e: Event) => void,
		classId='tagsummary-button'
	): HTMLButtonElement {

		const button = createEl('button');
	setIcon(button, lable);
	    button.className = classId;

		this.plugin.registerDomEvent(
			button,
			'click',
			clickFn
		);

	    return button;
	}


	makeBlockSelector (
		index: number
	): HTMLElement {

		const checkboxEl = createEl ('div');
		checkboxEl.setAttribute('index', index.toString())

		let checkedBtn: HTMLElement;
		let uncheckedBtn: HTMLElement;

		const checkBox = (bool: boolean) => {
			this.plugin.tagSummary.updateSelection(parseInt(checkboxEl.getAttribute('index') ?? '0'), bool);
			if (bool) {
				uncheckedBtn.remove();
				checkboxEl.appendChild(checkedBtn);
			} else {
				checkedBtn.remove();
				checkboxEl.appendChild(uncheckedBtn);
			}
		};

		checkedBtn = this.makeButton ('check-square', (e) => {
			e.stopPropagation();
			checkBox(false)

		}, 'tagsummary-button tagsummary-checkbox checked');
		checkedBtn.title = GUI_TEXT.titles.unselectParagraph;

		uncheckedBtn = this.makeButton ('square', (e) => {
			e.stopPropagation();
			checkBox(true)

		}, 'tagsummary-button tagsummary-checkbox');
		uncheckedBtn.title = GUI_TEXT.titles.selectParagraph;

		checkBox (false)

		return checkboxEl;

	}

	makeRemoveTagButton (
		clickFn: (e: Event, paragraphEl: Element, tag: string) => unknown,
		paragraphEl: Element,
		tag: string
	):HTMLButtonElement {
		const button = this.makeButton ('list-x', (e) => {
			e.stopPropagation();

			clickFn(e, paragraphEl, tag)
		});
		button.title = removedTagFromParagraphTitle(tag);
		return button;
	}

	makeSummaryRefreshButton (
		summaryEl:HTMLElement
	): HTMLElement {

		const button = this.makeButton(
			'refresh-ccw',
			(e) => {
				e.stopPropagation();

				this.plugin.tagSummary.update(summaryEl);
				new Notice(NOTICE_TEXT.tagSummaryUpdated);
			}
		);

		button.title = GUI_TEXT.titles.refreshTagSummary;

		return button;
	}

	makeCopyToSection (
		clickFn: CopyToCallback,
		content: string,
		sections: string[],
		tags: string[],
		filePath: string,
		paragraphEl: HTMLElement,
		summaryEl: HTMLElement
	): HTMLElement {

		const copyToEl: HTMLElement = createEl('span');
		copyToEl.setAttribute('class', 'tagsummary-copy-to-controls');
		const selectEl: HTMLElement = createEl('span');
		let dropdown = new DropdownComponent(selectEl);
		sections.forEach((sec) => {
			dropdown.addOption(sec, Utils.truncateStringAtWord(sec, 16));
		});
		dropdown.addOption('top', GUI_TEXT.dropdown.noteTop);
		dropdown.addOption('end', GUI_TEXT.dropdown.noteEnd);

		dropdown.selectEl.className = 'tagsummary-dropdown';

		if (Utils.platformSettingCheck (this.app, this.plugin.settings.copyToNoteBtn)) {
			copyToEl.appendChild(
				this.makeCopyToButton (
					clickFn,
					'note',
					dropdown,
					paragraphEl,
					summaryEl,
					content,
					tags,
					filePath
				)
			)
		}

		if (Utils.platformSettingCheck (this.app, this.plugin.settings.copyLinkToSectionBtn)) {
			copyToEl.appendChild(
				this.makeCopyToButton (
					clickFn,
					'link',
					dropdown,
					paragraphEl,
					summaryEl,
					content,
					tags,
					filePath
				)
			)
		}

		if (Utils.platformSettingCheck (this.app, this.plugin.settings.copyToSectionBtn)) {
			copyToEl.appendChild(
				this.makeCopyToButton (
					clickFn,
					'copy',
					dropdown,
					paragraphEl,
					summaryEl,
					content,
					tags,
					filePath
				)
			)
		}

		if (Utils.platformSettingCheck (this.app, this.plugin.settings.moveToSectionBtn)) {
			copyToEl.appendChild(
				this.makeCopyToButton (
					clickFn,
					'move',
					dropdown,
					paragraphEl,
					summaryEl,
					content,
					tags,
					filePath
				)
			)
		}

		if (Utils.platformSettingCheckMultiple (this.app, [this.plugin.settings.moveToSectionBtn,
														   this.plugin.settings.copyToSectionBtn,
														   this.plugin.settings.copyLinkToSectionBtn,
														   this.plugin.settings.copyToNoteBtn])) {
			copyToEl.appendChild(selectEl);
		}


		return copyToEl;
	}

	makeCopyToButton (
		clickFn: CopyToCallback,
		mode: CopyToMode,
		dropdown: DropdownComponent,
		paragraphEl: HTMLElement,
		summaryEl: HTMLElement,
		content: string,
		tags: string[],
		filePath: string
	): HTMLElement {

		let buttonLabel = 'copy';
		if (mode == 'link') buttonLabel = 'link';
		else if (mode == 'copy') buttonLabel = 'copy-plus';
		else if (mode == 'move') buttonLabel = 'replace';
		else if (mode == 'note') buttonLabel = 'file-plus-2';

		const button = this.makeButton (buttonLabel, async (e) => {
			e.stopPropagation();

			if (mode == 'note') {
				new SelectFileModal(this.app, (file) => {
					clickFn(e, mode, dropdown, paragraphEl, summaryEl, content, tags, filePath, file);
				}).open();

			} else {

				clickFn(e, mode, dropdown, paragraphEl, summaryEl, content, tags, filePath);
			}
		});
		button.title = copyToButtonTitle(mode);

		return button;

	}

	makeBakeButton (
		clickFn: (summaryMd: string, summaryEl: HTMLElement, filePath: string) => unknown,
		summaryMd: string,
		summaryEl:HTMLElement,
		filePath:string
	): HTMLElement {

		const button = this.makeButton (
			'stamp',
			async(e) => {
				e.stopPropagation();

				clickFn (summaryMd, summaryEl, filePath)

			}
		);

		button.title = GUI_TEXT.titles.flattenSummary;

		return button;
	}

	makeCopyButton (
		clickFn: (e: Event, content: string) => unknown,
		content: string
	): HTMLElement {
		const button = this.makeButton ('clipboard-list', (e) => {
			e.stopPropagation();
			clickFn(e, content);
		});
		button.title = GUI_TEXT.titles.copyParagraphToClipboard;

		return button;
	}

	makeCopySummaryButton (
		summaryMd: string)
	:HTMLElement {

		const button = this.makeButton (
			'clipboard-list',
			(e) => {
				e.stopPropagation();

				navigator.clipboard.writeText(summaryMd);
				new Notice(NOTICE_TEXT.summaryCopiedToClipboard);
			}
		);

		button.title = GUI_TEXT.titles.copySummary;

		return button;
	}

	makeSummaryNoteButton (
		clickFn: (summaryMd: string, tags: string[]) => Promise<unknown>,
		summaryMd: string,
		tags: string[]
	): HTMLElement {

		const button = this.makeButton (
			'file-plus-2',
			async (e) => {
				e.stopPropagation();
				await clickFn (summaryMd, tags);
			}
		);

		button.title = GUI_TEXT.titles.createNoteFromSummary;

		return button;
	}

	showTagSelector(event: MouseEvent | TouchEvent): void {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const mode = view?.getMode();
		let pageX: number;
		let pageY: number;
		let nodeType: number;
		let range: Range | null;
		if (this.app.isMobile) {
			const touchEvent = event as TouchEvent;
			const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
			pageX = Math.round(touch.pageX);
			pageY = Math.round(touch.pageY);
			range = document.caretRangeFromPoint(pageX, pageY)
			if (!range) return;
			nodeType = range.startContainer.nodeType;
		} else {
			const mouseEvent = event as MouseEvent;
			pageX = mouseEvent.pageX;
			pageY = mouseEvent.pageY;
			range = document.caretRangeFromPoint(pageX, pageY)
			if (!range) return;
			nodeType = range.startContainer.nodeType;
		}

	if (mode == 'preview') {
			if (nodeType === Node.TEXT_NODE) {
				new TagSelector(
					this.app,
					this.plugin,
					event, (tag)=>{
						this.plugin.tagEditor.add(
					'#' + tag,
					pageX,
					pageY
				)
					}
				).open();
			}
		}
	}

	removeElementWithAnimation(
		el: HTMLElement,
		callback: () => void,
	):void {

	  // Get the actual height of the element
	  const height = el.offsetHeight;

	  // Set height to the current value for CSS transition
	  el.style.height = `${height}px`;

	  setTimeout(() => {
        el.style.height = '0px';
        el.style.opacity = '0';
        el.style.margin = '0';
        el.style.padding = '0';
	}, 0);

	  el.addEventListener(
		'transitionend', function onEnd() {
		el.removeEventListener('transitionend', onEnd);
		callback();
	  });
	}



}
