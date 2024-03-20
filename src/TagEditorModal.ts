import { App, Modal, Notice, TFile, Setting, SelectFileModal, DropdownComponent, ButtonComponent, TextComponent, ProgressBarComponent} from "obsidian";
import TagBuddy from "main";
import * as Utils from './utils';

export class TBTagEditorModal extends Modal {
    //originalTag: Strings
    optionsDiv: HTMLElement;
    editDiv: HTMLElement;
    input: TextComponent;
    //submitBtn: ButtonComponent;
    tagActionDropdown: DropdownComponent;
    plugin: TagBuddy;

    settings = {
        originalTag: '',
        vaultToggle: false,
        newName: '',
        summaryPos: 'top',
        action: 'rename'
    };

    //constructor(app: App, tag: String, onSubmit: (result: string) => void) {
    constructor(app: App, plugin: TagBuddy, tag: String) {
        super(app);
        this.plugin = plugin;
        this.settings.originalTag = tag;
        //this.originalTag = tag;
        //this.onSubmit = onSubmit;
    }
 
    onOpen () {
        let { contentEl, titleEl , modalEl, containerEl } = this;

        titleEl.setText("Tag Actions")

        this.editDiv = createEl('div')
        this.editDiv.classList.add ('tag-editor-edit-div')

        this.optionsDiv = createEl ('div');
        this.optionsDiv.classList.add ('tag-editor-options')

        this.input = new TextComponent(this.editDiv);
        this.input.inputEl.classList.add ('tag-editor-input');

        this.tagActionDropdown = new DropdownComponent(this.editDiv)
        .addOption('rename', "Rename") 
        .addOption('lower', "Convert to lower case") 
        .addOption('totext', "Remove hash (#)") 
        .addOption('summary', "Create summary"); 
        this.tagActionDropdown.selectEl.classList.add ('tag-editor-dropdown');

        contentEl.appendChild (this.editDiv)
        contentEl.appendChild(this.optionsDiv)

        this.showEditTagOptions('rename');   
    
        const hr = createEl ('hr')
        hr.classList.add ('tag-editor-hr'); 
        contentEl.appendChild (hr);

        this.tagActionDropdown.onChange((value) => {
            this.settings.action = value;
            if (value == "summary") {
                this.showSummaryOptions ();
            } else {
                //if (editDiv.contains(summaryOptSelectEl)) editDiv.removeChild(summaryOptSelectEl)
                this.showEditTagOptions (value)
            }
        }); 

        const submitBtn = new ButtonComponent(contentEl)
            .setClass ('tag-editor-submit')
            .setButtonText('Submit')
            .onClick ((evt) => {
                this.submitTagEdit();
            }
        )
    }

    submitTagEdit () {

        //console.log(this.settings)

        //const startsWithHash: Boolean = this.settings.newName.trim()[0] == '#';
        const isValidTag: Boolean = Utils.isTagValid(this.settings.newName.trim(), true)
        const action: String = this.settings.action;
        let newName: String = this.settings.originalTag;

        if (action == 'summary') {
            const summaryTags: Array = Utils.extractValidTags (this.input.getValue());
            if (summaryTags.length < 1) {
                new Notice ('Invalid tag format.')
            } else {
                this.plugin.tagSummary.createCodeBlock(summaryTags, this.settings.summaryPos);
                this.close();
            }
        } else if (action == 'rename' && !isValidTag) {
            new Notice ('Invalid tag format.')
            // https://help.obsidian.md/Editing+and+formatting/Tags#Tag+format
        } else {

            if (action == 'rename') newName = this.settings.newName;
            else if (action == 'lower') newName = this.settings.originalTag.toLowerCase();
            else if (action == 'totext') newName = this.settings.originalTag.substring(1);
            
            // vault toggle is in the renameTag method

            this.plugin.tagEditor.renameTag (
                this.settings.originalTag,
                newName,
                this.settings.vaultToggle
            )

            this.close();
        }

    }

   /*
    } else if (vaultToggle) {
        
        // make this into a function // call it from the action function
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
    }*/


    /*inputChangeHandler (value: String, editType: String) {
        console.log(value);

        if (editType == 'rename') {
            // validate
            this.settings.newName = value;
            //console.log(this.settings.newName)
        }
    }*/

    showSummaryOptions () {
        this.optionsDiv.empty();

        this.input.setDisabled(false)

        new Setting (this.optionsDiv)
            .setName("Where do you want to add the tag summary?")
            .setDesc("Add multiple tags above separated by a comma.")
            .addDropdown((opt) =>
                opt
                .addOption('top', "Top of this note")
                .addOption('end', "Bottom of this note")
                //.addOption('here', "In place of this tag")
                .addOption('note', "In a new note") 
                .onChange((value) => {
                   this.settings.summaryPos = value;
                   //console.log(this.settings.summaryPos)
                }
            )
        ); 
    }


    showEditTagOptions (editType: String) {

        this.optionsDiv.empty();

        this.input.setValue(this.settings.originalTag);
        this.input.setDisabled(true)

        if (editType == 'rename') {
            const newName = new Setting(this.optionsDiv)
                .setName("New name")
                .setDesc("Tags can include letters, numbers, underscores (_), hyphens (-), and forward slashes (/) for nested tags.")
                .addText((opt) =>
                    opt
                    .setValue('')
                    .onChange((value) => { 
                       //this.inputChangeHandler (value, editType);
                       this.settings.newName = value;
                    }
                )
            );
        }

        const whereEditOpt = new Setting (this.optionsDiv)
            .setName("Where to make this change?")
            //.setDesc("WARNING: There is NO UNDO for this this action.")
            .addDropdown((opt) =>
            opt
            .addOption('note', "Just within this note")
            .addOption('vault', "Across entire vault")
            .onChange((value) => {
                if (value == 'vault') {
                    whereEditOpt.setDesc("WARNING: There is NO UNDO for vault changes. Consider making a backup of your vault first.")
                    this.settings.vaultToggle = true;
                } else {
                    whereEditOpt.setDesc("")
                    this.settings.vaultToggle = false;
                }
                //console.log(this.settings.vaultToggle)
            })
        );
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }


}

