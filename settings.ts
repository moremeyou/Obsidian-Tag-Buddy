
import TagBuddy from "main";
import { App, PluginSettingTab, Setting } from "obsidian";

export class TBSettingsTab extends PluginSettingTab {
    plugin: TagBuddy;

    constructor(app: App, plugin: TagBuddy) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        containerEl.createEl("h1", { text: "Tag Buddy" });

        new Setting(containerEl)
        .setName("Override native tag search on click")
        .setDesc("Toggle OFF to use CTRL/CMD+CLICK to remove tag.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.removeOnClick)
            .onChange(async (value) => {
                this.plugin.settings.removeOnClick = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Convert to tag text (removes #)")
        .setDesc("Toggle OFF to use OPT/ALT+CLICK to perform native tag search.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.optToConvert)
            .onChange(async (value) => {
                this.plugin.settings.optToConvert = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Remove nested tags first")
        .setDesc("Toggle OFF to use SHIFT+CLICK to remove nested tags first.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.removeChildTagsFirst)
            .onChange(async (value) => {
                this.plugin.settings.removeChildTagsFirst = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Mobile tag search")
        .setDesc("Toggle ON to restore mobile native tag search on tap. Tag removal will then use LONG PRESS.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.mobileTagSearch)
            .onChange(async (value) => {
                this.plugin.settings.mobileTagSearch = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Show mobile notices")
        .setDesc("Toggle OFF to hide notices when editing or removing a tag.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.mobileNotices)
            .onChange(async (value) => {
                this.plugin.settings.mobileNotices = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Show tag summary buttons")
        .setDesc("Show buttons below each tagged paragraph that let you copy, remove, and move the paragraph.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.tagSummaryButtonsNotices)
            .onChange(async (value) => {
                this.plugin.settings.tagSummaryButtonsNotices = value;
                await this.plugin.saveSettings();
            })
        );

        new Setting(containerEl)
        .setName("Copy to section prefix")
        .setDesc("When moving a tagged paragraph from tag summaries below note header sections use this prefix:\nExample: '- ', '> ', '- [ ]'")
        .addText((text) => {
            text
            .setPlaceholder(this.plugin.settings.taggedParagraphCopyPrefix)
            .setValue(this.plugin.settings.taggedParagraphCopyPrefix)
            .onChange(async (value) => {
                this.plugin.settings.taggedParagraphCopyPrefix = value;
                await this.plugin.saveSettings();
            });
        });

        containerEl.createEl('hr');
        containerEl.createEl("h1", { text: "Support a buddy" });
        const donateButton = containerEl.createEl('a');
        donateButton.setAttribute('href', 'https://www.buymeacoffee.com/moremeyou');
        donateButton.innerHTML = `<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>`;

        containerEl.createEl('br');
        containerEl.createEl('br');
        containerEl.createEl('br');

        new Setting(containerEl)
        .setName("Debug mode")
        .setDesc("Output to console.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.debugMode)
            .onChange(async (value) => {
                this.plugin.settings.debugMode = value;
                await this.plugin.saveSettings();
            })
        );
    }
}

