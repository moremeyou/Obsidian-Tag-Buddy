import { App, Editor, MarkdownRenderer, debounce, MarkdownPostProcessor, MarkdownPostProcessorContext, Component, TFile, getAllTags, MarkdownPreviewView, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { TBSettingsTab } from "./settings";
import { GUI } from "./gui";
import { TagSummary } from './TagSummary';
import { TagProcessor } from './TagProcessor';
import { ReadingModeTagEditor } from './ReadingModeTagEditor';
import * as Utils from './utils';
import * as Mobile from './Mobile';

interface TBSettings {
	removeOnClick: boolean; // ctrl
	removeChildTagsFirst; // 
	optToConvert: boolean; //alt
	mobileTagSearch: boolean; 
	tagSummaryBlockButtons: boolean; 
	taggedParagraphCopyPrefix: string;


	// new settings
	desktopClickTag: String;
	desktopCMDClickTag: String;
	desktopOPTClickTag: String;
	mobileDoubleTapTag: String;
	mobileLongPressTag: String;
	mobileTripleTapText: Boolean;

	removeTagBtn: String;
	copyToCBBtn: String;
	moveToSectionBtn: String;
	copyToSectionBtn: String;
	copyLinkToSectionBtn: String;
	copyToNoteBtn: String;

	mobileNotices: boolean; 
	recentlyAddedTags: string;
	lockRecentTags: boolean;
	showSummaryButtons:boolean;
	debugMode: boolean; 

}

const DEFAULT_SETTINGS: Partial<TBSettings> = {
	removeOnClick: true, 
	removeChildTagsFirst: true, 
	optToConvert: true, 
	mobileTagSearch: false, 
	tagSummaryBlockButtons: false,
	taggedParagraphCopyPrefix: '',


	// new
	desktopClickTag: 'remove',
	desktopCMDClickTag: 'edit',
	desktopOPTClickTag: 'native',
	mobileDoubleTapTag: 'remove',
	mobileLongPressTag: 'edit',
	mobileTripleTapText: true,

	removeTagBtn: 'always',
	copyToCBBtn: 'hide',
	moveToSectionBtn: 'always',
	copyToSectionBtn: 'always',
	copyLinkToSectionBtn: 'hide',
	copyToNoteBtn: 'always',

	mobileNotices: true,
	recentlyAddedTags: '',
	lockRecentTags: false,
	showSummaryButtons:false,
	debugMode: false
}; 

export default class TagBuddy extends Plugin {  
	settings: TBSettings;
	gui: GUI;
	tagSummary: TagSummary;
	tagProcessor: TagProcessor;
	tagEditor: ReadingModeTagEditor;
	private activeFile: TFile;

	// onunload() { I think all the cleanup is done automatically the way I register everything. } 

	async onload() {
		
		console.log('Tag Buddy Plugin loaded on ' 
			+ (this.app.isMobile ? 'mobile at ':'desktop at ') 
			+ new Date().toUTCString().substring(17));

		this.addSettingTab(new TBSettingsTab(this.app, this));
		await this.loadSettings();	

		this.app.workspace.onLayoutReady(async () => {

			this.gui = new GUI(this.app, this)
			this.tagSummary = new TagSummary (this.app, this);
			this.tagProcessor = new TagProcessor (this.app, this);
			this.tagEditor = new ReadingModeTagEditor (this.app, this);	

			this.registerMarkdownPostProcessor(
			this.tagProcessor.renderPostProcessor.bind(this.tagProcessor)
			)
			try {
				this.registerMarkdownCodeBlockProcessor(
					'tag-summary', 
					this.tagSummary.codeBlockProcessor.bind(this.tagSummary)
				);
			} catch {}
		    
		    //this.registerEvent( this.app.workspace.on('active-leaf-change', async () => { console.log('active leaf change') }));
		    //this.registerEvent(this.app.workspace.on('editor-change', async () => { console.log('editor change');  }, true));
		    //this.registerEvent(this.app.workspace.on('editor-change', debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)));
		    
		    this.registerDomEvent(
		    	document, 
		    	'contextmenu', 
		    	async (event: MouseEvent) => {	
	    			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			        
			        if (view && 
			        	Utils.ctrlCmdKey (event) &&
			        	(view.getMode() == 'preview') &&
			        	(view.containerEl.contains(event.target))
		        	) {         
			            event.preventDefault();
			            //this.gui.showTagSelector(event.pageX, event.pageY);
			        	this.gui.showTagSelector(event)
			        }
		    }); 
		   
			this.registerEvent(this.app.on(
				'layout-change', 
				async (event: EditorEvent) => {  
					const mode = this.app.workspace.getActiveViewOfType(MarkdownView)?.getMode();
					if (this.settings.debugMode) console.log('Tag Buddy: layout-change:', mode);
					if (mode == 'preview') {
						this.tagProcessor.reset();
						this.tagProcessor.debouncedProcessActiveFileTagEls();
					} else if (mode == 'source') {
					}
				}
			));
			
			//debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)
			this.registerEvent(this.app.workspace.on(
				'file-open', 
				//debounce(
				async (event: EditorEvent) => { 
					const activeFile = await this.app.workspace.getActiveFile();
					if (this.settings.debugMode) console.log('Tag Buddy: last active file:', this.activeFile?.name);
					if (this.settings.debugMode) console.log('Tag Buddy: file open:', activeFile?.name)
					if (activeFile?.path != this.activeFile?.path) {
						this.tagProcessor.reset();
						this.activeFile = this.app.workspace.getActiveFile();
						if (this.tagProcessor) {
							this.tagProcessor.processActiveFileTags();
						}
						//console.log('file open:', activeFile.name)
					}

				}
				//, 3000, true)
			));

			// Not doing this because they need to opt+click on a tag to pass it
			// I don't want to have to add a tag selector in the editor
			// think on mobile... too many layers of modals.
			/*this.addCommand({
				id: "tagbuddy-tag-actions",
				name: "Tag Action",
				callback: () => {
					//this.gui.showTagEditor()
					this.gui.showTagEditor()
				},
			});*/

			//this.registerDomEvent(document.body, 'scroll', (event) => {}, true);

			if (!this.app.isMobile) {
				// This event handles all the interactions on desktop
				this.registerDomEvent(
					document, 
					'click', 
					this.onClickEvent.bind(this), 
					true
				);
			} else { // Mobile interaction
				// This event catches all taps on mobile because we have custom double-tap and press-hold events.
				// But we only stop all other mobile events if this click was on a tag. 
				this.registerDomEvent(
					document, 
					'click', 
					(e:Event) => { 
						const isTag = e.target.classList.contains('tag');
//new Notice ('!this.settings.mobileTagSearch: ' + !this.settings.mobileTagSearch)
//new Notice ('this.setting.mobileDoubleTapTag != native: ' + (this.setting.mobileDoubleTapTag != 'native'))
						if (isTag && !this.settings.mobileTagSearch) {
						//if (isTag && (this.setting.mobileDoubleTapTag != 'native'// ||
									  //this.plugin.setting.mobileLongPressTag != 'native'
						//			  )) {
							e.stopPropagation();
//new Notice ('tapped tag and stop all other mobile touches except our custom ones')
						} else {	
						}
					}, true
				);

				new Mobile.PressAndHoldHandler(
					this, 
					document, 
					(event) => {
						this.gui.showTagEditor(event.target.closest('.tag').innerText)
					}
					//this.onClickEvent.bind(this)
				);
				new Mobile.DoubleTapHandler(
					this, 
					document, 
					this.onClickEvent.bind(this)
				);
				new Mobile.TripleTapHandler(
					this,
					document, 
					async (event: MouseEvent) => {	
		    			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
				        if (view && 
				        	(view.getMode() == 'preview') &&
				        	(view.containerEl.contains(event.target))
			        	) {         
				        	event.preventDefault();
				        	this.gui.showTagSelector(event)
				        }
		    		}, true
					//this.gui.showTagSelector.bind(this.gui)
				);
			}	

		});
	}

	async onClickEvent (
		event: Event
	):void {
		// Support for different views? 
		// If tag has no context properties, then try to figure out where it is?
		//new Notice ('Tag Buddy event type: ' + event.type);

		const target = event.target as HTMLElement;
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
		const modKey: String = Utils.ctrlCmdKey(event) ? 'CMD' : (event.altKey ? 'OPT' : '');

		// This condition it in case we click on a tag in another plugin like repeat or checklist
		// Can't edit tags in these cases. For now.
		if (!view && target.matches('.tag')) { 
			new Notice('Tag Buddy: Can\'t edit tag. Unsupported view type. Try again within the source note.');
			return;
		}

		if (view) { 
			if (view.getMode() != 'preview' || !view.containerEl.contains(event.target)) return;
		} 
	

		if (!this.app.isMobile) {
			//new Notice ('Tag Buddy event type: ' + event.type);
			//console.log(event.type)
			/*if ((this.settings.desktopClickTag == 'native' && (!Utils.ctrlCmdKey(event) && !event.altKey)) ||
				(this.settings.desktopCMDClickTag == 'native' && Utils.ctrlCmdKey(event)) ||
				(this.settings.desktopOPTClickTag == 'native' && event.altKey)) { */
			if ((this.settings.desktopClickTag == 'native' && modKey == '') ||
				(this.settings.desktopCMDClickTag == 'native' && modKey == 'CMD') ||
				(this.settings.desktopOPTClickTag == 'native' && modKey == 'OPT')) { 
console.log('native tag click')
				return; 
 
			//} else if (event.altKey && target && target.matches('.tag')) {  
			/*} else if ((this.settings.desktopClickTag == 'edit' && (!Utils.ctrlCmdKey(event) && !event.altKey)) ||
				(this.settings.desktopCMDClickTag == 'edit' && Utils.ctrlCmdKey(event)) ||
				(this.settings.desktopOPTClickTag == 'edit' && event.altKey)) {*/
			} else if ((this.settings.desktopClickTag == 'edit' && modKey == '') ||
				(this.settings.desktopCMDClickTag == 'edit' && modKey == 'CMD') ||
				(this.settings.desktopOPTClickTag == 'edit' && modKey == 'OPT')) {
				if (!target.matches('.tag')) return
console.log('edit tag')
				// get the tag via: event.target.closest('.tag').innerText
				event.stopPropagation();
				event.preventDefault();
				this.gui.showTagEditor(event.target.closest('.tag').innerText)
			
				return; 
			}

		} else {

			// Removes the automatic system selection on mobile. 
			setTimeout(() => { 
				const selection = window.getSelection();
				if (selection) selection.removeAllRanges();
			}, 400)

			if (this.settings.mobileTagSearch && event.type == 'touchend') {
				// if we get this far, this is a double tap
				console.log('handle touch end')
				return;
			} 
		}
 
		if (target && target.matches('.tag')) {	
			// const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();

			if (this.tagProcessor.outOfSync) {
				new Notice('Markdown source and preview tags are out of sync. Please close and reload this note.');
				return;
			}

			//let editType = 
			//if (this.settings.removeOnClick 
			//	|| (!this.settings.removeOnClick && Utils.ctrlCmdKey(event))) {
			//['remove', 'hash'].includes(this.settings.desktopClickTag)
			//if ([this.settings.desktopClickTag, this.settings.desktopCMDClickTag, this.settings.desktopOPTClickTag].includes('remove'))
			
			let editType;
			if (modKey == '') editType = this.settings.desktopClickTag
			else if (modKey == 'CMD') editType = this.settings.desktopCMDClickTag
			else if (modKey == 'OPT') editType = this.settings.desktopOPTClickTag 

// at this point we should only be dealing with 'remove' or 'hash'. so we can always stop the default now.
console.log (editType)
			/*if (this.settings.desktopClickTag == 'remove' ||
				this.settings.desktopCMDClickTag == 'remove' ||
				this.settings.desktopOPTClickTag == 'remove') {*/
			//if (editType == 'remove') {
				event.stopPropagation();
				event.preventDefault();
			//}

			const clickedTag = target.closest('.tag'); 
			const tag = clickedTag.innerText;

			let tagIndex = clickedTag.getAttribute('md-index');
			let tagFile = clickedTag.getAttribute('file-source');

			if (tagFile) {
				// Try
				this.tagEditor.edit(
					target, 
					event,
					null,
					editType
				);
			} else {
				// Try again
				setTimeout(async () => {
					tagIndex = clickedTag.getAttribute('md-index');
					tagFile = clickedTag.getAttribute('file-source');
					this.tagEditor.edit (
						target, 
						event,
						null,
						editType
					);
				}, 300);
			}

		} else if (!view && target.matches('.tag')) {
			new Notice('Tag Buddy: Can\'t edit tag. Might be in an unsupported view type.');
		}
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	
	getTagsFromApp(): string[] {
	    const tagsObject = this.app.metadataCache.getTags();

	    // Convert tagsObject to an array of [tag, count] tuples
	    const tagsArray = Object.entries(tagsObject);

	    // Sort by use count
	    tagsArray.sort((a, b) => b[1] - a[1]);

	    const recentTags = this.getRecentTags();
	   // console.log('recent tag length: ' + recentTags.length)

	    if (recentTags.length>0) {
	    	//console.log(recentTags)
	    	// convert them to [tag, count] tuples for consistency
	   		const recentTagsAsTuples = recentTags.map(tag => [tag, 0]);
	    	// Concatenate the two arrays
	    	const recentAndAllTags = recentTagsAsTuples.concat(tagsArray);
	    	// Extract tag names after removing the #
	    	return recentAndAllTags.map(([tag, _]) => tag.replace(/^#/, ""));
       	} else {
       		return tagsArray.map(([tag, _]) => tag.replace(/^#/, ""));
       	}
	}

	saveRecentTag (
		tag:string
	):void {
		if (Utils.isTagValid(tag)) {
			//console.log('accepted:', tag)
			const recentTagsString = this.settings.recentlyAddedTags;
			let recentTags:Array;
			if (recentTagsString == '') {
				recentTags = [];
			} else if (recentTagsString.indexOf(', ')) {
				recentTags = this.settings.recentlyAddedTags.split(', ');
			} else {
				recentTags = [this.settings.recentlyAddedTags]
			}

			if (recentTags.includes(tag)) {
				recentTags.splice(recentTags.indexOf(tag), 1);
			}

			recentTags.unshift(tag.trim());
			recentTags = recentTags.slice(0, 3);
			this.settings.recentlyAddedTags = recentTags.join(', ');
			this.saveSettings();
		} else {
			//console.log('rejected:', tag)
		}
	}

	getRecentTags ():Array {
		const recentTags = 
		this.settings.recentlyAddedTags=='' ? 
		[] : this.settings.recentlyAddedTags.split(', ');
		return recentTags;
	}
}
