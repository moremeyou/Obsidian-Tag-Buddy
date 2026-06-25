import { App, Modal, Notice, Setting, DropdownComponent, ButtonComponent, TextComponent } from "obsidian";
import TagBuddy from "main";
import * as Utils from './utils';
import { NOTICE_TEXT, TAG_EDITOR_TEXT } from './userText';

type BatchAction = 'instance' | 'note' | 'vault';
type SummaryPosition = 'top' | 'end' | 'note';
type TagEditorAction = 'rename' | 'lower' | 'totext' | 'summary';

interface TagEditorSettings {
    originalTag: string;
    originalIndex: number;
    tagEl: HTMLElement | null;
    filePath: string | null;
    batchAction: BatchAction;
    newName: string;
    summaryPos: SummaryPosition;
    action: TagEditorAction;
}

export class TBTagEditorModal extends Modal {
    optionsDiv: HTMLElement;
    editDiv: HTMLElement;
    input: TextComponent;
    tagActionDropdown: DropdownComponent;
    plugin: TagBuddy;

    settings: TagEditorSettings = {
        originalTag: '',
        originalIndex: 0,
        tagEl: null,
        filePath: null,
        batchAction: 'instance',
        newName: '',
        summaryPos: 'top',
        action: 'rename'
    };

    constructor(app: App, plugin: TagBuddy, tag: string, index: number, filePath: string | null = null, tagEl: HTMLElement | null = null) {
        super(app);
        this.plugin = plugin;
        this.settings.tagEl = tagEl;
        this.settings.filePath = filePath
        this.settings.originalTag = tag;
        this.settings.originalIndex = index;
    }

    onOpen () {
        const { contentEl, titleEl } = this;

        titleEl.setText(TAG_EDITOR_TEXT.title)

        this.editDiv = createEl('div')
        this.editDiv.classList.add ('tag-editor-edit-div')

        this.optionsDiv = createEl ('div');
        this.optionsDiv.classList.add ('tag-editor-options')

        this.input = new TextComponent(this.editDiv);
        this.input.inputEl.classList.add ('tag-editor-input');

        this.tagActionDropdown = new DropdownComponent(this.editDiv)
        .addOption('rename', TAG_EDITOR_TEXT.actionOptions.rename)
        .addOption('lower', TAG_EDITOR_TEXT.actionOptions.lower)
        .addOption('totext', TAG_EDITOR_TEXT.actionOptions.toText)
        .addOption('summary', TAG_EDITOR_TEXT.actionOptions.summary);
        this.tagActionDropdown.selectEl.classList.add ('tag-editor-dropdown');

        contentEl.appendChild (this.editDiv)
        contentEl.appendChild(this.optionsDiv)

        this.showEditTagOptions('rename');

        const hr = createEl ('hr')
        hr.classList.add ('tag-editor-hr');
        contentEl.appendChild (hr);

        this.tagActionDropdown.onChange((value) => {
            this.settings.action = value as TagEditorAction;
            if (value == "summary") {
                this.showSummaryOptions ();
            } else {
                this.showEditTagOptions (value)
            }
        });

        new ButtonComponent(contentEl)
            .setClass ('tag-editor-submit')
            .setButtonText(TAG_EDITOR_TEXT.submit)
            .onClick (async () => {
                await this.submitTagEdit();
            }
        )
    }

    async submitTagEdit () {

        const normalizedNewName = Utils.normalizeTagInput(this.settings.newName, true);
        const isValidTag = normalizedNewName != null;
        const action = this.settings.action;
        let newName = this.settings.originalTag;

        if (action == 'summary') {
            const summaryTags = Utils.extractValidTags (this.input.getValue());
            if (summaryTags.length < 1) {
                new Notice(NOTICE_TEXT.invalidTagFormat)
            } else {
                await this.plugin.tagSummary.createCodeBlock(summaryTags, this.settings.summaryPos);
                this.close();
            }
        } else if (action == 'rename' && !isValidTag) {
            new Notice(NOTICE_TEXT.invalidTagFormat)
        } else {

            if (action == 'rename' && normalizedNewName) newName = normalizedNewName;
            else if (action == 'lower') newName = this.settings.originalTag.toLowerCase();
            else if (action == 'totext') newName = this.settings.originalTag.substring(1);

            const batchAction = this.settings.batchAction == 'instance'
                ? this.settings.originalIndex
                : this.settings.batchAction;
            await this.plugin.tagEditor.renameTag (
                this.settings.originalTag,
                newName,
                batchAction,
                this.settings.filePath,
                this.settings.tagEl
            )
            this.close();
            const summaryEl = this.settings.tagEl ? this.settings.tagEl.closest('.tag-summary-block') as HTMLElement | null : null;
            if (summaryEl) {
                setTimeout(async () => {
                    this.plugin.tagSummary.update(summaryEl);
                }, 500);
            }
        }

    }

    showSummaryOptions () {
        this.optionsDiv.empty();

        this.input.setDisabled(false)

        new Setting (this.optionsDiv)
            .setName(TAG_EDITOR_TEXT.summaryDestination.name)
            .setDesc(TAG_EDITOR_TEXT.summaryDestination.desc)
            .addDropdown((opt) =>
                opt
                .addOption('top', TAG_EDITOR_TEXT.summaryDestination.top)
                .addOption('end', TAG_EDITOR_TEXT.summaryDestination.end)
                .addOption('note', TAG_EDITOR_TEXT.summaryDestination.note)
                .onChange((value) => {
                   this.settings.summaryPos = value as SummaryPosition;
                }
            )
        );
    }


    showEditTagOptions (editType: string) {

        this.optionsDiv.empty();

        this.input.setValue(this.settings.originalTag);
        this.input.setDisabled(true)

        if (editType == 'rename') {
            new Setting(this.optionsDiv)
                .setName(TAG_EDITOR_TEXT.rename.newName)
                .setDesc(TAG_EDITOR_TEXT.rename.newNameDesc)
                .addText((opt) =>
                    opt
                    .setValue('')
                    .onChange((value) => {
                       this.settings.newName = value;
                    }
                )
            );
        }

        const whereEditOpt = new Setting (this.optionsDiv)
            .setName(TAG_EDITOR_TEXT.scope.name)
            .addDropdown((opt) =>
            opt
            .addOption('instance', TAG_EDITOR_TEXT.scope.instance)
            .addOption('note', TAG_EDITOR_TEXT.scope.note)
            .addOption('vault', TAG_EDITOR_TEXT.scope.vault)
            .onChange((value) => {
                if (value == 'vault') {
                    whereEditOpt.setDesc(TAG_EDITOR_TEXT.scope.vaultDesc)
                    this.settings.batchAction = 'vault';
                } else if (value == 'note') {
                    whereEditOpt.setDesc(TAG_EDITOR_TEXT.scope.noteDesc)
                    this.settings.batchAction = 'note';
                } else if (value == 'instance') {
                    whereEditOpt.setDesc(TAG_EDITOR_TEXT.scope.instanceDesc)
                    this.settings.batchAction = 'instance';
                }
            })
        );
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }


}
