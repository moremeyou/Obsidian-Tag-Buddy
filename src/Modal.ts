import { App, FuzzySuggestModal, Modal, Setting, Notice, TFile, renderResults, prepareFuzzySearch, FuzzyMatch, fuzzySearch, prepareQuery } from "obsidian";
import TagBuddy from "main";
import * as Utils from './utils';

/** This modal class handles selecting a tag and should pass a tag back to the main function.
 * 
 */
export class TagSelector extends FuzzySuggestModal<string> {
    plugin: TagBuddy
    app: App;
    onChooseItemCallback: (result: string) => void
    tag: string
    inputListener: EventListener
    tagCache: string[]
    location: Object;
    height = 215;
    noSelection = false;
    
    
    constructor (app: App, plugin: TagBuddy, event:Event, onChooseItemCallback: (result: string) => void){
        super(app)
        this.app = app;
        this.plugin = plugin
        this.tag = ''
        this.onChooseItemCallback = onChooseItemCallback
        this.inputListener = this.listenInput.bind(this)
        this.tagCache = []
        this.location = {x: event.pageX, y: event.pageY}
        //this.limit = 10

    }

    onOpen() {
        this.setPlaceholder("")
        this.inputEl.addEventListener('keyup', this.inputListener)
        if (!this.app.isMobile) {
            this.resultContainerEl.parentNode.style.width = '200px';
            this.resultContainerEl.style.height = '215px';
            this.resultContainerEl.parentNode.style.left = `${this.location.x}px`;
            this.resultContainerEl.parentNode.style.top = `${this.location.y}px`;
        } else {
            setTimeout(()=>{ this.inputEl.focus() }, 500); // not working?
        }
        super.onOpen()
    }

    onClose() {
        this.inputEl.removeEventListener('keyup', this.inputListener)
        super.onClose()
    }

    listenInput(event: KeyboardEvent){
        this.noSelection = false;
        if (!this.app.isMobile) {
            const itemsHeight = this.getSuggestions(this.inputEl.value).length * 42;
            const height = Math.min(this.height, Math.max(65, itemsHeight))
            this.resultContainerEl.style.height = `${height}px`;
        }

        if (event.key == "Enter" && !this.noSelection) {
            const text = this.inputEl.value.trim();
            const pattern = /(?=[^\d\s]+)[a-zA-Z0-9_\-\/]+/g
            if (pattern.test(text)) {
                this.close();
                this.onChooseItem(this.inputEl.value);
            } else {
                new Notice('Invalid tag.');
            }
        }
    }

    onNoSuggestion(){
        super.onNoSuggestion()
        this.noSelection = true;
        //console.log('no suggestions')
    }

    getItems(): string[] {
       const filteredTags = Utils.getTagsFromApp(
            this.app, 
            this.plugin.getRecentTags()
        );
        
        return filteredTags;
    }

    getItemText(tag: string): string {
        return tag
    }

    async onChooseItem(result: string) {
        if (!this.app.isMobile) {
            this.onChooseItemCallback(result)
        } else {
            setTimeout(()=>{this.onChooseItemCallback(result)}, 250)
        }
    }
}

