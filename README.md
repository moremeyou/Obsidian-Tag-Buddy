![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/moremeyou/Obsidian-Tag-Buddy?style=for-the-badge&sort=semver) ![GitHub All Releases](https://img.shields.io/github/downloads/moremeyou/Obsidian-Tag-Buddy/total?style=for-the-badge) <a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>
# Obsidian Tag Buddy 🔖
Unlock powerful tag editing features in Reading Mode. Add, remove, and edit tags across your vault, in the active note or a single instance. Use tag summaries to roundup and process tagged content like an inbox. 
###### Why only Reading Mode?
Tag Buddy is about maintaining your flow state when reading, reviewing, annotating, or processing your notes. Having tag function in Reading Mode means you can, for example, remove “new” from a “#book/highlight/new” tag, or quickly add a “#todo” tag–all without switching to Edit or Source Mode. Read on for use cases and documentation.

# Documentation
### ✏️  Add tags to note
CMD+RIGHT-CLICK (or TRIPLE-TAP on mobile) lets you add an displays a tag selector where you can chose recent, favorite or create a new tag in any native markdown note.  

![Add Tag Demo](https://raw.githubusercontent.com/moremeyou/Obsidian-Tag-Buddy/main/addTagDemo.gif) 

### 🧼 Remove tags and nested tags
By default, a CLICK (or DOUBLE-TAP on mobile) removes a tag. Nested tags be removed from the deepest tag first. And you can customize these actions with modifier keys. For example: you can preserve native tag search when CLICKING and assign CMD+CLICK to remove the tag. More on these functions in the settings later in this document.

![Remove Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/removeTagDemo.gif?raw=true)

### 🫥  Edit tags individually, in the note or across the vault
By default, CMD+CLICK (or LONG-PRESS on mobile) reveals the tag editor with various tag functions: From quickly renaming to generating tag summaries. And again, these actions can be customized in the plugin settings.  
![Edit Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/editTagDemo.gif?raw=true)
![Edit Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/tagEditorOverview.gif?raw=true)

### 🔎  Use 5: Add/edit tags in tag summaries
![Tag Summary Demo](https://user-images.githubusercontent.com/8971804/274069683-1e6257a6-f6d6-402a-adae-c534c2f5a507.gif)

Tags are editable in the active note, native embeds and when rendered using a tag summary code block. Use this syntax:
````markdown
```tag-summary
tags: #tag1 #tag2 // Results can have either of these tags 
include: #tag3 #tag4 // Results must have both these tags (optional)
exclude: #tag5 #tag6 // But not have these tags (optional)
max: 3 // Limits the results in the summary (optional)
```
````
Thanks to [Tag Summary Plugin](https://github.com/macrojd/tag-summary) for the original code behind the summaries.
### 🔤  Use 6: Copy/remove tagged blocks
- **Copy button:** copy's paragraph to clipboard.
- **Remove-tag button:** removes the queried tag from the paragraph (which also removes it from the summary).
	- Made a mistake? Use notices to easily jump to the tagged note.
![Notice Demo](https://user-images.githubusercontent.com/8971804/274208965-fb8423e7-4f64-4bf6-84e8-afe1d44d81b4.gif)

Enable these buttons in plugin settings. 

### 📑   Use 7: Copy/move tagged blocks to section
![Copy To Section Demo](https://user-images.githubusercontent.com/8971804/274069666-d56b899c-1d74-411b-8b6e-c048bc8df491.gif)

Buttons added to each tagged paragraph in summaries let you copy the paragraph (with a back link) to header sections in the active note. Use **CTRL/CMD** when clicking to also remove the tag, effectively moving the paragraph to the section. These buttons will appear when you add section details to the tag summary code block like this (max 3, for space):
````markdown
```tag-summary
tags: #tag1 #tag2 
sections: Section 1, Section 2 //  Header sections in the same note.
```
````

Enable these buttons in plugin settings. Thanks to [QuickAdd Plugin](https://github.com/chhoumann/quickadd) for the logic behind inserting content under headers.

### 📜  Use 8: Bake/create tag summary note
![Copy To Section Demo](https://user-images.githubusercontent.com/8971804/274069678-4191d61b-109b-4e90-a770-44dedc5edfce.gif)

**Summary buttons**: Using the include, exclude, and max parameters of the tag summary code block you can easily customise and build new notes from tagged content. Copy to clipboard, create new note or bake your summaries into the active note as markdown (replaces the code block). Enable these buttons in plugin settings.

## 🧐 Why is this useful to me? 
I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note so I can review and process on-demand.  

## 👍 Support a buddy
There’s lots to do and I’d like this plugin to grow with Obsidian and the community. Your support will ensure on-going development and maintenance. 

<a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>
## 📦 Install now
Obsidian approved December 6th, 2023! 🤘
- If you're already using community plugins, click here to install from the [Obsidian plugin store.](https://obsidian.md/plugins?id=tag-buddy)
- If you're new to Obsidian:
	1. Open Settings > Community Plugins
	2. Tap “Turn on Community Plugins” to access the store
	3. Search for **Tag Buddy**.
	4. Tap **Install**.
	5. After installation, tap **Enable**.
	6. Enjoy!

## 🧪 New version (0.6.7) pre-release notes 
0.6.4 will be downloaded by default. Pre-release only available through the [BRAT](https://tfthacker.com/brat-quick-guide) plugin. 

See To do’s below for the great new features in this pre-release. Updated documentation coming soon. For now, here’s a quick roundup:
- OPT/ALT+CLICK on a tag (previously removed hash) now opens a Tag Actions modal with renaming, removing hash and more – in the current note or across your entire vault. You can even generate a tag summary without code.
- Move to section now lets you copy just the link or selected text. And there’s new efficiencies like automatic list type detection when copying to a section (or top/bottom of note, also new).
- Don’t like all those buttons below each summary block? Settings will soon be overhauled to let you customize which buttons you want to see. 
- All the original features and functions have not be changed.

If you’re testing the pre-release, please [submit any issues you find](https://github.com/moremeyou/Obsidian-Tag-Buddy/issues). There’s ongoing cleanup and optimisations. But everything noted above should be stable. 

## ⚙️ Settings
- Override native tag search. Toggle off to use **CMD/CTRL+CLICK** to remove tag, restoring native  tag search on click.
- Convert to tag text with **ALT/OPT+CLICK**. Toggle off to use **ALT/OPT+CLICK** to perform native tag search.
- Remove child tags first. Toggle off to use **SHIFT+CLICK** to remove child tags first. 
- Override native mobile tag search. Toggle on to restore mobile native tag search on tap. Tag removal will then use LONG-PRESS.
- Show mobile notices. Toggle off to hide notices when editing or removing a tag.
- Specify the copy-to-section prefix when using buttons in tag summary.
- Enable tag summary paragraph action buttons. 
- Disable tag summary buttons.
- Edit recently added tags.
- Lock recently added tags: Makes this a favorites list.
	
## ✅ #ToDo :
- [ ] ON-GOING: Refactoring and cleanup 👨🏻‍💻
- [ ] Add ‘exclude folder‘ parameter to summary code block
- [x] ~~Edit tag modal “Just this instance”~~
- [x] ~~Mobile bugs with new settings~~
- [x] ~~Refactor settings~~
- [x] ~~BUG: Remove extra space if removing between words~~
- [x] ~~BUG: making new notes doesn’t work on mobile~~
- [x] ~~BUG: uncaught exceptions when using kanban and others~~
- [x] ~~BUG: Summaries aren’t showing tagged lists~~
- [x] ~~Ignore file paths that include, “_exclude”~~
- [x] ~~Better button/icons~~
- [x] ~~Summary improvements~~
	- [x] ~~Move to section is a dropdown of headers~~
	- [x] ~~Detect list type below heading~~
	- [x] ~~Add to section functionality checks for selected text~~
	- [x] ~~Add only link to section~~
	- [x] ~~Copy and move to section now buttons (not mod keys)~~
- [x] ~~Edit tag text modal (options for this note, across vault)~~
	- [x] ~~rename~~
	- [x] ~~remove hash~~
	- [x] ~~lower case~~
	- [x] ~~make summary~~

## 👍 Support a buddy
There’s lots to do and I’d like this plugin to grow with Obsidian and the community. Your support will ensure on-going development and maintenance. 

<a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>

## 🗒️ Notes
- Switch to editing to undo any edits in the active note. 
	- **Edits are permanent in embeds/summaries (unless that note is open in a tab). 
- **Design rationale:** Tag Buddy is about helping you maintain a specific state of mind when reviewing/annotating/processing your notes. For example, I don't want to switch to editing to simply remove “new” from a “book/highlight/new” tag, or if I want to quickly add a “todo” tag somewhere. Also, I think Obsidian already makes it super easy add/edit/remove tags. So there are no plans to bring those Tag Buddy functions to edit mode. That said, please let me know if you have a use case.
- **Known limitations:**    
	 - Editing tags within some other plugins or unknown view types is not supported, for now. Please reach out if you have a use case.
	 - Checkboxes are superficially functional in summaries. But the state change isn't applied to the source file. This functionality might be beyond the scope of this plugin.
	 - Two (or more) tag summaries or embeds in the same note referencing the same tags will lose sync with each other. Warnings have been implemented. WORKAROUND: Use the **Refresh button** below the tag summary to manually update. 
- - -

## Disclaimer
This plugin modifies your notes. And while there are multiple safety precautions, this plugin comes with no guarantee of any kind. Neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk. [See complete license here.](https://raw.githubusercontent.com/moremeyou/Obsidian-Tag-Buddy/main/LICENSE)