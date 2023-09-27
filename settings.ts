
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
        .setName("Remove tag on click")
        .setDesc("ON: Use CMD/WIN+CLICK for native tag search. \nOFF: Use CMD/WIN+CLICK to remove tag.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.removeOnClick)
            .onChange(async (value) => {
                this.plugin.settings.removeOnClick = value;
                await this.plugin.saveSettings();
            })
        );
        new Setting(containerEl)
        .setName("Convert to tag text with OPT/ALT+CLICK (removes #)")
        .setDesc("OFF: OPT/ALT+CLICK performs native tag search.")
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
        .setDesc("OFF: Use SHIFT+CLICK to remove child tags fitst.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.removeChildTagsFirst)
            .onChange(async (value) => {
                this.plugin.settings.removeChildTagsFirst = value;
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

