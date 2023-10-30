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
	mobileNotices: boolean; 
	tagSummaryBlockButtons: boolean; 
	taggedParagraphCopyPrefix: string;
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
	mobileNotices: true,
	tagSummaryBlockButtons: false,
	taggedParagraphCopyPrefix: '',
	recentlyAddedTags: '',
	lockRecentTags: false,
	showSummaryButtons:false,
	debugMode: false,
}; 

export default class TagBuddy extends Plugin {  
	settings: TBSettings;
	gui: GUI;
	tagSummary: TagSummary;
	tagProcessor: TagProcessor;
	tagEditor: ReadingModeTagEditor;
	//readingViewEl: MarkdownPreviewView;
	//containerEl: HTMLElement;
	private activeFile: TFile;
	//observer: MutationObserver;

	onunload() { // I think all the cleanup is done automatically the way I register everything. 
		//this.tagProcessor.observer.disconnect();
		//this.tagProcessor.mainObserver.disconnect();
		//if (this.tagProcessor.mutationEvent) this.tagProcessor.mutationEvent.unregisterCallback();
	}

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

			//this.setView();

			this.registerMarkdownPostProcessor(
			this.tagProcessor.renderPostProcessor.bind(this.tagProcessor)
			)

			this.registerMarkdownCodeBlockProcessor(
				'tag-summary', 
				this.tagSummary.codeBlockProcessor.bind(this.tagSummary)
			);
		    
		    this.registerEvent( this.app.workspace.on('active-leaf-change', async () => {
		    	console.log('active leaf change')
		    	//await this.setView();
				//this.tagProcessor.reset();
		    }));
		    //this.registerEvent(this.app.workspace.on('editor-change', async () => { console.log('editor change');  }, true));
		    //this.registerEvent(this.app.workspace.on('editor-change', debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)));
		    
		    this.registerDomEvent(
		    	document, 
		    	'contextmenu', 
		    	async (event: MouseEvent) => {	
	    			const view = await this.app.workspace.getActiveViewOfType(MarkdownView);
			        
			        if (view && 
			        	Utils.ctrlCmdKey (event) &&
			        	(view.getMode() == 'preview')
		        	) {         
			            event.preventDefault();
			            this.gui.showTagSelector(event.pageX, event.pageY);
			        }
		    }); 

		    async function showTags(_this) {
    			const view = await _this.app.workspace.getActiveViewOfType(MarkdownView);
				const preView = await view.containerEl.querySelector('.markdown-reading-view');
				let tags = [];
				Array.from(preView.querySelectorAll('.tag')).forEach(tag => {
					tags.push(tag.innerText);
				})
				console.log('rendered tags:', tags)
				const sections = view.currentMode.renderer.sections;
				tags = [];
				sections.forEach(section => {
					Array.from(section.el.querySelectorAll('.tag')).forEach(tag => {
						tags.push(tag.innerText);
					})
				})
				console.log('renderer tags:', tags)
		    }

			this.registerEvent(this.app.on(
				'layout-change', 
				async (event: EditorEvent) => {  
					const mode = this.app.workspace.getActiveViewOfType(MarkdownView).getMode();
					console.log('layout-change:', mode);
					if (mode == 'preview') {
						this.tagProcessor.resume();
						// we need this timeout in case there are no changes and mute handler doesn't automatically pause
						setTimeout (this.tagProcessor.pause.bind(this.tagProcessor), 500);
						//debounce(this.tagProcessor.reProcessActiveFileTags, 1000);
						//this.tagProcessor.sourceMutationEvent.pause();
						showTags(this);
					} else if (mode == 'source') {
						this.tagProcessor.sourceMutationEvent.resume();
						//this.tagProcessor.sourceMutationEvent.pause();
						//this.tagProcessor.resume() //, 100);
					//this.tagProcessor.resume()
					}
				}
			));
			
			//debounce(async () => { console.log('editor change'); this.processTags(); }, 3000, true)
			this.registerEvent(this.app.workspace.on(
				'file-open', 
				//debounce(
				async (event: EditorEvent) => { 
					const activeFile = await this.app.workspace.getActiveFile();
					console.log('last active file:', this.activeFile?.name);
					console.log('file open:', activeFile.name)
					//await this.setView();
					if (activeFile.path != this.activeFile?.path && this.tagProcessor.activeFileTagsSetup) {
						this.tagProcessor.reset();
						this.activeFile = this.app.workspace.getActiveFile();
						if (this.tagProcessor) {
							this.tagProcessor.processActiveFileTags(
								this.tagProcessor.tagFileManager.getTags(
									activeFile.path
								)
							);
						}
						console.log('file open:', activeFile.name)
					}

				}
				//, 3000, true)
			));

			const debounceResumeSourceMutationEvent = Utils.debounce(()=>{
				//console.log('debounce source event resume')
				const mode = this.app.workspace.getActiveViewOfType(MarkdownView).getMode();
				if (mode == 'source') this.tagProcessor.sourceMutationEvent.resume();
			}, 500)

			this.registerDomEvent(document.body, 'scroll', (event) => {
				this.tagProcessor.sourceMutationEvent.pause();
				debounceResumeSourceMutationEvent();
			}, true);

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
						if (isTag && !this.settings.mobileTagSearch) {
							e.stopPropagation();
						}
					}, true
				);

				new Mobile.PressAndHoldHandler(
					this, 
					document, 
					this.onClickEvent.bind(this)
				);
				new Mobile.DoubleTapHandler(
					this, 
					document, 
					this.onClickEvent.bind(this)
				);
			}	

		});
	}

	async onClickEvent (
		event: Event
	):void {
		// Support for different views? 
		// If tag has no context properties, then try to figure out where it is?
		// Or maybe there's a way to have obsidian add the properties globally.
		//new Notice ('Tag Buddy event type: ' + event.type);

		const target = event.target as HTMLElement;
		const view = await this.app.workspace.getActiveViewOfType(MarkdownView);

		// This condition it in case we click on a tag in another plugin like repeat or checklist
		// Can't edit tags in these cases. For now.
		if (!view && target.matches('.tag')) { 
			new Notice('Tag Buddy: Can\'t edit tag. Unsupported view type. Try again within the source note.');
			return;
		}

		if (view) { 
			if (view.getMode() != 'preview') return;
		} 
		
		if (!this.app.isMobile) {
			//new Notice ('Tag Buddy event type: ' + event.type);
			if ((this.settings.removeOnClick && Utils.ctrlCmdKey(event)) 
				|| (!this.settings.removeOnClick && !Utils.ctrlCmdKey(event))) { 
				return; 
			} else if (event.altKey && !this.settings.optToConvert) {  
				return; 
			}

		} else {

			// Removes the automatic system selection on mobile. 
			setTimeout(() => { 
				const selection = window.getSelection();
				if (selection) selection.removeAllRanges();
			}, 500)
			
			
			if (this.settings.mobileTagSearch && event.type == 'touchend') {
				// if we get this far, this is a double tap
				return;
			}
		}
 
		if (target && target.matches('.tag')) {	
			// const scrollState = this.app.workspace.getActiveViewOfType(MarkdownView)?.currentMode?.getScroll();

			if (this.tagProcessor.outOfSync) {
				new Notice('Markdown source and preview tags are out of sync. Please close and reload this note.');
				return;
			}

			if (this.settings.removeOnClick 
				|| (!this.settings.removeOnClick && Utils.ctrlCmdKey(event))) {
				event.stopPropagation();
				event.preventDefault();
			}

			const clickedTag = target.closest('.tag'); 
			const tag = clickedTag.innerText;

			let tagIndex = clickedTag.getAttribute('md-index');
			let tagFile = clickedTag.getAttribute('file-source');

			if (tagFile) {
				// Try
				this.tagEditor.edit(
					target, 
					event
				);
			} else {
				// Try again
				setTimeout(async () => {
					tagIndex = clickedTag.getAttribute('md-index');
					tagFile = clickedTag.getAttribute('file-source');
					this.tagEditor.edit (
						target, 
						event
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
		}
	}

	getRecentTags ():Array {
		const recentTags = 
		this.settings.recentlyAddedTags=='' ? 
		[] : this.settings.recentlyAddedTags.split(', ');
		return recentTags;
	}
}
