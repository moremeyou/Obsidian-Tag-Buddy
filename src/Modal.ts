import { App, FuzzySuggestModal, Notice } from "obsidian";
import TagBuddy from "main";
import * as Utils from './utils';
import { NOTICE_TEXT } from './userText';

interface ModalLocation {
    x: number;
    y: number;
}

export class TagSelector extends FuzzySuggestModal<string> {
    plugin: TagBuddy
    app: App;
    onChooseItemCallback: (result: string) => void
    tag: string
    inputListener: EventListener
    tagCache: string[]
    location: ModalLocation | null = null;
    height = 215;
    noSelection = false;


    constructor (app: App, plugin: TagBuddy, event: MouseEvent | TouchEvent, onChooseItemCallback: (result: string) => void){
        super(app)
        this.app = app;
        this.plugin = plugin
        this.tag = ''
        this.onChooseItemCallback = onChooseItemCallback
        this.inputListener = this.listenInput.bind(this)
        this.tagCache = []
        if (event instanceof MouseEvent) this.location = {x: event.pageX, y: event.pageY}
        //this.limit = 10
        //this.emptyStateText = 'Add new tag'
        // to add a brand new tag we'd either need to:
        // - SHIFT already works. but for mobile?
        // - have another button on far right on input to add (for mobile)
        // this selector is also where we can add an edit icon next to each tag.
        // clicking this would bring up the edit modal

    }

    onOpen() {
        this.setPlaceholder("")
        this.inputEl.addEventListener('keyup', this.inputListener)
        if (!this.app.isMobile) {
            const modalEl = this.resultContainerEl.parentElement;
            if (!modalEl || !this.location) return;
            modalEl.style.width = '200px';
            this.resultContainerEl.style.height = '215px';
            modalEl.style.left = `${this.location.x}px`;
            modalEl.style.top = `${this.location.y}px`;
        } else {
            setTimeout(()=>{ this.inputEl.focus() }, 500); // not working?
        }
        super.onOpen()
    }

    onClose() {
        this.inputEl.removeEventListener('keyup', this.inputListener)
        super.onClose()
    }

    listenInput(event: Event){
        const keyboardEvent = event as KeyboardEvent;
        this.noSelection = false;
        if (!this.app.isMobile) {
            const itemsHeight = this.getSuggestions(this.inputEl.value).length * 42;
            const height = Math.min(this.height, Math.max(65, itemsHeight))
            this.resultContainerEl.style.height = `${height}px`;
        }

        if (keyboardEvent.key == "Enter" && !this.noSelection) {
            const text = this.inputEl.value.trim();
            const normalizedTag = Utils.normalizeTagInput(text, false);
            if (normalizedTag) {
                this.close();
                this.onChooseItem(normalizedTag);
            } else {
                new Notice(NOTICE_TEXT.invalidTag);
            }
        }
    }

    /*getSuggestions(query: string) : string[]{
        const filteredTags = Utils.getTagsFromApp(
            this.app,
            this.plugin.getRecentTags()).filter(tag =>
            //tag.toLowerCase().includes(query.toLowerCase())
            query == '' ? true : tag.toLowerCase() == query.toLowerCase()
        );
        return filteredTags;
    }

    renderSuggestion(header: string, el: HTMLElement) {
        el.createEl("div", { text: header });
    }*/

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
//console.log(result)
        if (!this.app.isMobile) {
            this.onChooseItemCallback(result)
        } else {
            setTimeout(()=>{this.onChooseItemCallback(result)}, 250)
        }
    }
}
