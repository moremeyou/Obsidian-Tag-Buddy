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


        function isValidTag(tag) {
            const tagPattern = /^#[\w]+$/;
            return tagPattern.test(tag);
        }

        function filterAndJoinTags(tagsString) {
            const tagsArray = tagsString.split(", ");
            const validTags = tagsArray.filter(isValidTag);
            return validTags.join(", ");
        }

        ////////////////////////////////////////////////////////////////////////////////
        containerEl.createEl("h3", { text: "General" });
        ////////////////////////////////////////////////////////////////////////////////

        // Adding will always limit to 3. But if they edit it here, it can be any length.
        new Setting(containerEl)
        .setName("Recent tags")
        .setDesc("The most recent tags added via Tag Buddy are stored here. These will show up first in the list when adding.")
        .addText((text) => {
            text
            .setPlaceholder(this.plugin.settings.recentlyAddedTags)
            .setValue(this.plugin.settings.recentlyAddedTags)
            .onChange(async (value) => {
                this.plugin.settings.recentlyAddedTags = filterAndJoinTags(value); //value;
                await this.plugin.saveSettings();
            });
        });

        new Setting(containerEl)
        .setName("Lock recent tags")
        .setDesc("Toggle ON to lock the recent tags list. Recent tags will not be updated. Instead, the tags above will act like a favorites list.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.lockRecentTags)
            .onChange(async (value) => {
                this.plugin.settings.lockRecentTags = value;
                await this.plugin.saveSettings();
            })
        );

        ////////////////////////////////////////////////////////////////////////////////
        containerEl.createEl("h3", { text: "Desktop" });
        ////////////////////////////////////////////////////////////////////////////////

        new Setting (containerEl)
            .setName("Action when clicking a tag:")
            .setDesc("What should happen when you click a tag?")
            .addDropdown((opt) =>
                opt
                .addOption('remove', "Remove tag")
                .addOption('hash', "Remove hash")
                .addOption('edit', "Edit tag")
                .addOption('native', "Search tag")
                .setValue(this.plugin.settings.desktopClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Action when clicking a tag with CMD/CTRL modifier key:")
            .setDesc("What should happen when you click a tag while holding the CMD or CTRL key?")
            .addDropdown((opt) =>
                opt
                .addOption('remove', "Remove tag")
                .addOption('hash', "Remove hash")
                .addOption('edit', "Edit tag")
                .addOption('native', "Search tag")
                .setValue(this.plugin.settings.desktopCMDClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopCMDClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Action when clicking a tag with OPT/ALT modifier key:")
            .setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('remove', "Remove tag")
                .addOption('hash', "Remove hash")
                .addOption('edit', "Edit tag")
                .addOption('native', "Search tag")
                .setValue(this.plugin.settings.desktopOPTClickTag)
                .onChange(async (value) => {
                    this.plugin.settings.desktopOPTClickTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        ////////////////////////////////////////////////////////////////////////////////
        containerEl.createEl("h3", { text: "Mobile" });
        ////////////////////////////////////////////////////////////////////////////////

        new Setting(containerEl)
            .setName("Show mobile notices")
            .setDesc("Toggle OFF to hide notices.")
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
            .setName("Action when DOUBLE-TAPPING a tag:")
            .setDesc("What should happen when you DOUBLE-TAP a tag?")
            .addDropdown((opt) =>
                opt
                .addOption('remove', "Remove tag")
                .addOption('hash', "Remove hash")
                .addOption('edit', "Edit tag")
                .addOption('native', "Search tag")
                .setValue(this.plugin.settings.mobileDoubleTapTag)
                .onChange(async (value) => {
                    this.plugin.settings.mobileDoubleTapTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Action when LONG-PRESSING a tag:")
            .setDesc("What should happen when you LONG-PRESS a tag?")
            .addDropdown((opt) =>
                opt
                .addOption('remove', "Remove tag")
                .addOption('hash', "Remove hash")
                .addOption('edit', "Edit tag")
                .addOption('native', "Search tag")
                .setValue(this.plugin.settings.mobileLongPressTag)
                .onChange(async (value) => {
                    this.plugin.settings.mobileLongPressTag = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("TRIPLE-TAP non-tag, non-link text to add a tag:")
            .setDesc("Toggle OFF to disable triple-tap.")
            .addToggle((toggle) =>
                toggle
                .setValue(this.plugin.settings.mobileTripleTapText)
                .onChange(async (value) => {
                    this.plugin.settings.mobileTripleTapText = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        ////////////////////////////////////////////////////////////////////////////////
        containerEl.createEl("h3", { text: "Tag Summaries" });
        ////////////////////////////////////////////////////////////////////////////////

        new Setting(containerEl)
            .setName("Show tag summary buttons")
            .setDesc("Toggle OFF to hide these buttons.")
            .addToggle((toggle) =>
                toggle
                .setValue(this.plugin.settings.showSummaryButtons)
                .onChange(async (value) => {
                    this.plugin.settings.showSummaryButtons = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        containerEl.createEl("h5", { text: "Tag Summaries Items" });

        // show button : both, desktop only, mobile only, none
        new Setting (containerEl)
            .setName("Remove tag button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.removeTagBtn)
                .onChange(async (value) => {
                    this.plugin.settings.removeTagBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Copy to clipboard button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.copyToCBBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToCBBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Move to section button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.moveToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.moveToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Copy to section button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.copyToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Copy link to section button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.copyLinkToSectionBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyLinkToSectionBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        new Setting (containerEl)
            .setName("Copy to note button:")
            //.setDesc("What should happen when you click a tag while holding the OPT or ALT key?")
            .addDropdown((opt) =>
                opt
                .addOption('always', "Desktop and mobile")
                .addOption('desktop', "Only desktop")
                .addOption('mobile', "Only mobile")
                .addOption('hide', "Hide")
                .setValue(this.plugin.settings.copyToNoteBtn)
                .onChange(async (value) => {
                    this.plugin.settings.copyToNoteBtn = value;
                    await this.plugin.saveSettings();
                }
            )
        );

        // if any of the other buttons are shown, we show the drop down
            // do this in the tag summary



        /*
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
        .setName("Show tag summary paragraph buttons")
        .setDesc("Show buttons below each tagged paragraph that let you copy, remove, and move the paragraph.")
        .addToggle((toggle) =>
            toggle
            .setValue(this.plugin.settings.tagSummaryBlockButtons)
            .onChange(async (value) => {
                this.plugin.settings.tagSummaryBlockButtons = value;
                await this.plugin.saveSettings();
            })
        );
        */

        containerEl.createEl('hr');
        containerEl.createEl("h1", { text: "Support a buddy" });
        const donateLink = containerEl.createEl('a');
        donateLink.setAttribute('href', 'https://www.buymeacoffee.com/moremeyou');
        const donateButton = createEl('img');
        donateButton.setAttribute('src', 'https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png');
        donateButton.setAttribute('alt', 'Buy Me A Coffee');
        donateButton.style = 'height: 40px !important;width: 150px !important;'
        donateLink.appendChild(donateButton)
        //.innerHTML = `<img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>`;

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

