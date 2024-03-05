import { App, Modal, Notice, TFile, Setting, DropdownComponent, ButtonComponent, TextComponent, ProgressBarComponent} from "obsidian";
import TagBuddy from "main";
import * as Utils from './utils';

export class TBTagEditorModal extends Modal {
    originalTag: Strings

    constructor(app: App, tag: String, onSubmit: (result: string) => void) {
    super(app);
    this.originalTag = tag;
    this.onSubmit = onSubmit;
  }

  onOpen() {
    let { contentEl, titleEl , modalEl, containerEl } = this;

    let vaultToggle: Boolean = false;

    //titleEl.createEl("h3", { text: "Edit Tag" });
    //inputDiv.createEl("h3", { text: "#" });
    titleEl.setText("Tag Actions")

    const editDiv = createEl('div')
    editDiv.classList.add ('tag-editor-edit-div')

    const optionsDiv = createEl ('div');
    optionsDiv.classList.add ('tag-editor-options')

    //const progressDiv = createEl ('div');

    const input = new TextComponent(editDiv);
    input.inputEl.classList.add ('tag-editor-input');

    const tagActionDropdown = new DropdownComponent(editDiv)
    .addOption('rename', "Rename") 
    .addOption('lower', "Convert to lower case") 
    .addOption('totext', "Remove hash (#)") 
    .addOption('summary', "Create summary"); 
    tagActionDropdown.selectEl.classList.add ('tag-editor-dropdown'); 
    
    // Edit tag options
    function showEditTagOptions (originalTag: String, editType: String) {
        optionsDiv.empty();

        input.setValue(originalTag);
        input.setDisabled(true)

        if (editType == 'rename') {
            new Setting(optionsDiv)
                .setName("New name")
                .setDesc("Tags can include letters, numbers, underscores (_), hyphens (-), and forward slashes (/) for nested tags.")
                .addText((opt) =>
                    opt
                    .setValue(originalTag)
                    .onChange((value) => {
                       // validate
                       console.log(value);

                    }
                )
            );
        }

       /* new Setting(optionsDiv)
            .setName("Where")
            .setDesc("Toggle ON to apply this change to ALL notes in this vault.")
            .addToggle((opt) =>
                opt
                .setValue(false)
                .onChange((value) => {
                   console.log(value);

                }
            )
        );*/
        const whereEditOpt = new Setting (optionsDiv)
            .setName("Where to make this change?")
            //.setDesc("WARNING: There is NO UNDO for this this action.")
            .addDropdown((opt) =>
            opt
            .addOption('note', "Just within this note")
            .addOption('vault', "Across entire vault")
            .onChange((value) => {
                if (value == 'vault') {
                    whereEditOpt.setDesc("WARNING: There is NO UNDO for vault changes. Consider making a backup of your vault first.")
                    vaultToggle = true;
                } else {
                    whereEditOpt.setDesc("")
                    vaultToggle = false;
                }
                console.log(value)
            })
        );

    }

    // Create summary options
    function showSummaryOptions () {
        optionsDiv.empty();

        input.setDisabled(false)

        new Setting (optionsDiv)
            .setName("Where do you want to add the tag summary?")
            .setDesc("Add multiple tags above separated by a comma.")
            .addDropdown((opt) =>
            opt
            .addOption('top', "Top of this note")
            .addOption('bottom', "Bottom of this note")
            .addOption('here', "In place of this tag")
            .addOption('note', "In a new note") 
            .onChange((value) => {
                   console.log(value);
                }
            )
        ); 
    } 

    function submitTagEdit (modal, action) {
        // do stuff
        //contentEl.empty();
        // show a breakdown of the actions?
        if (action == 'summary') {
            console.log(action)
            // do it
            modal.close();
        } else if (vaultToggle) {
            contentEl.empty();
            titleEl.setText("Applying edit")
            //submitBtn.setDisabled(true)
            const editProgress = new ProgressBarComponent (contentEl)
            editProgress.setValue(75)

            const submitBtn = new ButtonComponent(contentEl)
            .setClass ('tag-editor-submit')
            .setButtonText('Cancel')
            .onClick ((evt) => {
                   // validate
                   console.log('cancel');
                   //submitTagEdit()
                }
            )
            // close when done
        } else {
            // do it
            modal.close();
        }
    }

    contentEl.appendChild (editDiv)
    contentEl.appendChild(optionsDiv)

    showEditTagOptions(this.originalTag, 'rename');   
    
    const hr = createEl ('hr')
    hr.classList.add ('tag-editor-hr'); 
    contentEl.appendChild (hr)

    //contentEl.appendChild(progressDiv) 
    
    const submitBtn = new ButtonComponent(contentEl)
    .setClass ('tag-editor-submit')
    .setButtonText('Submit')
    .onClick ((evt) => {
           // validate
           console.log('submit');

           submitTagEdit(this, tagActionDropdown.getValue())
        }
    )


    // Action: dropdown
    // - rename - warn if there's another tag with new name. this is merge
    // - convert to lower-case
    // - generate tag summary
    // -- shows dropdown: top of this note, bottom of this note, in place, new note
    // Submit button
    // HR
    // Setting for the across vault toggle
    // HR
    // SUBMIT DISABLED UNTUL PROPER ENTRY (change and/or correct)

    // progress dialogue
    // warning dialogue for vault

    //dropdown.registerOptionListener(listeners, "summary");
    
    tagActionDropdown.onChange((value) => {
        //this.result = value
        //console.log(value);
        if (value == "summary") {
            //editDiv.appendChild(summaryOptSelectEl)
            showSummaryOptions ();
        } else {
            //if (editDiv.contains(summaryOptSelectEl)) editDiv.removeChild(summaryOptSelectEl)
            showEditTagOptions (this.originalTag, value)
        }
    });

    // change hese to onChange
    input.onChange((value) => {
        console.log(value);
    });


  }


  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }


}



/*

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
//console.log(result)
        if (!this.app.isMobile) {
            this.onChooseItemCallback(result)
        } else {
            setTimeout(()=>{this.onChooseItemCallback(result)}, 250)
        }
    }
}
*/
