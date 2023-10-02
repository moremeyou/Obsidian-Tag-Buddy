
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

        new Setting(containerEl)
        .setName("Override native tag search on click")
        .setDesc("Toggle off to use cmd+click to remove tag.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.removeOnClick)
            .onChange(async (value) => {
                this.plugin.settings.removeOnClick = value;
                await this.plugin.saveSettings();
            })
        );
        new Setting(containerEl)
        .setName("Convert to tag text with opt+click (removes #)")
        .setDesc("Toggle off to use opt+click to perform native tag search.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.optToConvert)
            .onChange(async (value) => {
                this.plugin.settings.optToConvert = value;
                await this.plugin.saveSettings();
            })
        );
        new Setting(containerEl)
        .setName("Remove child tags first")
        .setDesc("Toggle off to use shift+click to remove child tags fitst.")
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
        .setDesc("Toggle on to restore mobile native tag search on tap. Tag removal will then use press+hold.")
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
        .setDesc("Toggle off to hide notices when editing or removing a tag.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.mobileNotices)
            .onChange(async (value) => {
                this.plugin.settings.mobileNotices = value;
                await this.plugin.saveSettings();
            })
        );
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

