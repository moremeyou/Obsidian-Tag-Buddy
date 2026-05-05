import TagBuddy from "main";
import { App, PluginSettingTab, Setting } from "obsidian";
import * as Utils from './utils';
import { SETTINGS_TEXT } from './userText';

export class TBSettingsTab extends PluginSettingTab {
    plugin: TagBuddy;

    constructor(app: App, plugin: TagBuddy) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;
        containerEl.empty();

        function filterAndJoinTags(tagsString: string): string {
            const tagsArray = tagsString.split(",");
            const validTags = tagsArray
                .map((tag: string) => Utils.normalizeTagInput(tag, true))
                .filter((tag: string | null): tag is string => tag != null);
            return validTags.join(", ");
        }

        containerEl.createEl("h3", { text: SETTINGS_TEXT.sections.general });

        // Adding will always limit to 3. But if they edit it here, it can be any length.
        new Setting(containerEl)
        .setName(SETTINGS_TEXT.recentTags.name)
        .setDesc(SETTINGS_TEXT.recentTags.desc)
        .addText((text) => {
            text
            .setPlaceholder(this.plugin.settings.recentlyAddedTags)
            .setValue(this.plugin.settings.recentlyAddedTags)
            .onChange(async (value) => {
                this.plugin.settings.recentlyAddedTags = filterAndJoinTags(value);
                await this.plugin.saveSettings();
            });
        });

        new Setting(containerEl)
        .setName(SETTINGS_TEXT.lockRecentTags.name)
        .setDesc(SETTINGS_TEXT.lockRecentTags.desc)
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.lockRecentTags)
            .onChange(async (value) => {
                this.plugin.settings.lockRecentTags = value;
                await this.plugin.saveSettings();
            })
        );

        containerEl.createEl("h3", { text: SETTINGS_TEXT.sections.desktop });

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.desktopClickTag.name)
            .setDesc(SETTINGS_TEXT.desktopClickTag.desc)
            .addDropdown((opt) =>
                opt
                .addOption('remove', SETTINGS_TEXT.tagActionOptions.remove)
                .addOption('hash', SETTINGS_TEXT.tagActionOptions.hash)
                .addOption('edit', SETTINGS_TEXT.tagActionOptions.edit)
                .addOption('native', SETTINGS_TEXT.tagActionOptions.native)
                .setValue(this.plugin.settings.desktopClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.desktopCmdClickTag.name)
            .setDesc(SETTINGS_TEXT.desktopCmdClickTag.desc)
            .addDropdown((opt) =>
                opt
                .addOption('remove', SETTINGS_TEXT.tagActionOptions.remove)
                .addOption('hash', SETTINGS_TEXT.tagActionOptions.hash)
                .addOption('edit', SETTINGS_TEXT.tagActionOptions.edit)
                .addOption('native', SETTINGS_TEXT.tagActionOptions.native)
                .setValue(this.plugin.settings.desktopCMDClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopCMDClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.desktopOptClickTag.name)
            .setDesc(SETTINGS_TEXT.desktopOptClickTag.desc)
            .addDropdown((opt) =>
                opt
                .addOption('remove', SETTINGS_TEXT.tagActionOptions.remove)
                .addOption('hash', SETTINGS_TEXT.tagActionOptions.hash)
                .addOption('edit', SETTINGS_TEXT.tagActionOptions.edit)
                .addOption('native', SETTINGS_TEXT.tagActionOptions.native)
                .setValue(this.plugin.settings.desktopOPTClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopOPTClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        containerEl.createEl("h3", { text: SETTINGS_TEXT.sections.mobile });

        new Setting(containerEl)
            .setName(SETTINGS_TEXT.mobileNotices.name)
            .setDesc(SETTINGS_TEXT.mobileNotices.desc)
            .addToggle((toggle) =>
                toggle
                .setValue(this.plugin.settings.mobileNotices)
                .onChange(async (value) => {
                    this.plugin.settings.mobileNotices = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.mobileDoubleTapTag.name)
            .setDesc(SETTINGS_TEXT.mobileDoubleTapTag.desc)
            .addDropdown((opt) =>
                opt
                .addOption('remove', SETTINGS_TEXT.tagActionOptions.remove)
                .addOption('hash', SETTINGS_TEXT.tagActionOptions.hash)
                .addOption('edit', SETTINGS_TEXT.tagActionOptions.edit)
                .addOption('native', SETTINGS_TEXT.tagActionOptions.native)
                .setValue(this.plugin.settings.mobileDoubleTapTag)
                .onChange(async (value) => {
                    this.plugin.settings.mobileDoubleTapTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.mobileLongPressTag.name)
            .setDesc(SETTINGS_TEXT.mobileLongPressTag.desc)
            .addDropdown((opt) =>
                opt
                .addOption('remove', SETTINGS_TEXT.tagActionOptions.remove)
                .addOption('hash', SETTINGS_TEXT.tagActionOptions.hash)
                .addOption('edit', SETTINGS_TEXT.tagActionOptions.edit)
                .setValue(this.plugin.settings.mobileLongPressTag)
                .onChange(async (value) => {
                    this.plugin.settings.mobileLongPressTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.mobileTripleTapText.name)
            .setDesc(SETTINGS_TEXT.mobileTripleTapText.desc)
            .addToggle((toggle) =>
                toggle
                .setValue(this.plugin.settings.mobileTripleTapText)
                .onChange(async (value) => {
                    this.plugin.settings.mobileTripleTapText = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        containerEl.createEl("h3", { text: SETTINGS_TEXT.sections.tagSummaries });

        new Setting(containerEl)
            .setName(SETTINGS_TEXT.showSummaryButtons.name)
            .setDesc(SETTINGS_TEXT.showSummaryButtons.desc)
            .addToggle((toggle) =>
                toggle
                .setValue(this.plugin.settings.showSummaryButtons)
                .onChange(async (value) => {
                    this.plugin.settings.showSummaryButtons = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        containerEl.createEl("h5", { text: SETTINGS_TEXT.sections.tagSummaryItems });

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.removeTag)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.removeTagBtn)
                .onChange(async (value) => {
                    this.plugin.settings.removeTagBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.copyToClipboard)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.copyToCBBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToCBBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.moveToSection)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.moveToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.moveToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.copyToSection)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.copyToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.copyLinkToSection)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.copyLinkToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyLinkToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName(SETTINGS_TEXT.summaryButtons.copyToNote)
            .addDropdown((opt) =>
                opt
                .addOption('always', SETTINGS_TEXT.summaryButtonVisibility.always)
                .addOption('desktop', SETTINGS_TEXT.summaryButtonVisibility.desktop)
                .addOption('mobile', SETTINGS_TEXT.summaryButtonVisibility.mobile)
                .addOption('hide', SETTINGS_TEXT.summaryButtonVisibility.hide)
                .setValue(this.plugin.settings.copyToNoteBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToNoteBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        containerEl.createEl('hr');
        containerEl.createEl("h1", { text: SETTINGS_TEXT.sections.support });
        const donateLink = containerEl.createEl('a');
        donateLink.setAttribute('href', 'https://www.buymeacoffee.com/moremeyou');
        const donateButton = createEl('img');
        donateButton.setAttribute('src', 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png');
        donateButton.setAttribute('alt', SETTINGS_TEXT.donateAlt);
        donateButton.style.cssText = 'height: 40px !important;width: 150px !important;'
        donateLink.appendChild(donateButton)

        containerEl.createEl('br');
        containerEl.createEl('br');
        containerEl.createEl('br');

        new Setting(containerEl)
        .setName(SETTINGS_TEXT.debugMode.name)
        .setDesc(SETTINGS_TEXT.debugMode.desc)
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
