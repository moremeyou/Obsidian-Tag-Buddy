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
        originalIndex: null,
        tagEl: null,
        filePath: null,
        batchAction: 'instance',
        newName: '',
        summaryPos: 'top',
        action: 'rename'
    };

    //constructor(app: App, tag: String, onSubmit: (result: string) => void) {
    constructor(app: App, plugin: TagBuddy, tag: string, index: number, filePath: string = null, tagEl: HTMLElement = null) {
    //constructor(app: App, plugin: TagBuddy, tagEl: HTMLElement) {
        super(app);
        this.plugin = plugin;
//console.log(tagEl)
        this.settings.tagEl = tagEl;
        //this.settings.originalIndex = parseInt (tagEl.getAttribute('md-index'));
        //this.settings.originalTag = tagEl.innerText;
        //this.settings.batchActioon = tagEl.getAttribute('md-index');

        this.settings.filePath = filePath
        this.settings.originalTag = tag;
        this.settings.originalIndex = index;
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

            //if (this.settings.batchAction == 'instance') {
// this isn't working. soemthing about how I'm looping around with edit and rename. might not work. 
                // and if not we can't make embded or summary edits edits 
                //this.plugin.tagEditor.edit (this.settings.tagEl, null, null, 'rename', newName)
                this.plugin.tagEditor.renameTag (
                    this.settings.originalTag,
                    newName,
                    ((this.settings.batchAction == 'instance') ? parseInt(this.settings.originalIndex) : this.settings.batchAction),
                    this.settings.filePath,
                    this.settings.tagEl
                    //parseInt(this.settings.originalIndex),

                    //((this.settings.batchAction == 'instance') ? parseInt(this.settings.originalIndex) : this.settings.batchAction)
                )
                this.close();
                setTimeout(async () => { 
                    this.plugin.tagSummary.update(tagEl.closest()); 
                    paragraphEl.remove(); 
                }, 500);    
            }
           /* else {

                this.plugin.tagEditor.renameTag (
                    this.settings.originalTag,
                    //this.settings.tagEl,
                    newName,
                    this.settings.batchAction
                    //parseInt(this.settings.originalIndex),

                    //((this.settings.batchAction == 'instance') ? parseInt(this.settings.originalIndex) : this.settings.batchAction)
                )

            }*/

            
        //}

    }

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
            .addOption('instance', "Just this instance")
            .addOption('note', "All in this note")
            .addOption('vault', "Across entire vault")
            .onChange((value) => {
                if (value == 'vault') {
                    whereEditOpt.setDesc("WARNING: There is NO UNDO for vault changes. Consider making a backup of your vault first.")
                    this.settings.batchAction = 'vault';
                } else if (value == 'note') {
                    whereEditOpt.setDesc("Only tags in this note will be updated. Choose \'Across entire vault\' to update this tag everywhere.")
                    this.settings.batchAction = 'note';
                } else if (value == 'instance') {
                    whereEditOpt.setDesc("")
                    this.settings.batchAction = 'instance';
                    //this.settings.batchActioon = this.settings.originalIndex
                }
                //console.log(this.settings.batchAction)
            })
        );
    }

    onClose() {
        let { contentEl } = this;
        contentEl.empty();
    }


}

