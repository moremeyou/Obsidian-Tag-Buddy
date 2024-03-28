![GitHub release (latest SemVer)](https://img.shields.io/github/v/release/moremeyou/Obsidian-Tag-Buddy?style=for-the-badge&sort=semver) ![GitHub All Releases](https://img.shields.io/github/downloads/moremeyou/Obsidian-Tag-Buddy/total?style=for-the-badge) <a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>
# Obsidian Tag Buddy 🔖
Unlock powerful tag editing features in Reading Mode. Add, remove, and edit tags across your vault, in the active note or a single instance. Use tag summaries to roundup and process tagged content like an inbox. 

### ✏️  Add tags to note
CMD+RIGHT-CLICK (or TRIPLE-TAP on mobile) displays a tag selector to a chose recent, favorite or create a new tag in any native markdown note, embedded content or tag summary (explained below).  

![Add Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/addTagDemo.gif?raw=true) 

### 🧼 Remove tags and nested tags
By default, a CLICK (or DOUBLE-TAP on mobile) removes a tag. Nested tags be removed from the deepest tag first. And you can customize these actions with modifier keys. For example: you can preserve native tag search when CLICKING and assign CMD+CLICK to remove the tag. More on settings below.

![Remove Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/removeTagDemo.gif?raw=true)

### 🫥  Edit tags individually, all in note or across the vault
By default, CMD+CLICK (or LONG-PRESS on mobile) on a tag reveals the Tag Action modal. From here you apply these actions to just the clicked tag, all of the same tag in this note, or all of the same tag across the entire vault:
- Rename tag 
- Change case
- Convert to text
- Create tag summary

![Edit Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/editTagDemo.gif?raw=true)
![Edit Tag Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/tagEditorOverview.gif?raw=true)

### 🔎 Generate and interact with tag summaries
Tag summaries can be auto-generated when editing a tag (as seen above) or with this basic syntax. Use the same interaction for adding, removing or editing tags within summaries or native embeds, just as you would elsewhere.

![Tag Summary Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/tagSummaryDemo1.gif?raw=true)

Interact with results in tag summaries with shortcut buttons:
- Copy paragraph to section in another note
- Copy paragraph to section in this note.
- Move paragraph to section in this note. To achieve this, Tag Buddy first removes the queried tag from the paragraph, then copies it to the section.
- Section dropdown is explained below. 
- Remove tag button removes the tag but doesn’t copy the paragraph.

Interact with the entire summary with shortcut buttons:
- Reload the summary. Useful if you’re updating tags in queried notes.
- Copy to clipboard copies the entire summary as markdown.
- Copy the entire summary to another note.
- Flatten summary converts the dynamic summary to standard markdown (replacing the code block).

All these buttons can be hidden in the settings outlined below.

### 📚  Copy or move paragraphs to a section
As noted above, each paragraph includes a dropdown to specify where the move or copy buttons should paste the tagged paragraph. “Top of note” and “End of note” are always available. But if you include a header section title in the tag summary, this will also become an option in the dropdown, as seem below. Likewise, when copying to another note, Tag Buddy will look for this section in that note. If it’s not found, it will paste to the top of the other note. In all cases, when pasting Tag Buddy will try to detect the list type below the section header.

![Copy To Section Demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/tagSummaryDemo2.gif?raw=true)

### 🧩 Tag summary code block
This is the full syntax for all the parameters you can pass to the tag-summary code block. Using the include, exclude, and max parameters of the tag summary code block you can easily customise and build new notes from tagged content. 
````markdown
```tag-summary
tags: #tag1 #tag2 // Results can have either of these tags 
include: #tag3 #tag4 // Results must have both these tags (optional)
exclude: #tag5 #tag6 // But not have these tags (optional)
section: Productivity // Header sections (optional)
max: 3 // Limits the results in the summary (optional)
```
````
Thanks to [Tag Summary Plugin](https://github.com/macrojd/tag-summary) for the original code behind the summaries.

## ⚙️ Settings
Customize how Tag Buddy looks and functions across desktop and mobile.
![Tag Buddy Settings Pt1](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/settings1.gif?raw=true)
![Tag Buddy Settings Pt2](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/settings2.gif?raw=true)
![raw.githubusercontent.com/moremeyou/Obsidian-Tag-Buddy/main/settings3.gif](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/settings3.gif?raw=true)

## 🧐 Why is this useful to me? 
I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note so I can review and process on-demand.  
###### Why only Reading Mode?
Tag Buddy is about maintaining your flow state when reading or reviewing your notes. Tag editing functionality in Reading Mode means you can, for example, remove “new” from “#book/highlight/new”, or quickly add “#todo” without switching to Edit or Source Mode. Read on for use cases and documentation.

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
- **Known limitations:**    
	 - Editing tags within some other plugins or unknown view types is not supported, for now. Please reach out if you have a use case.
	 - Checkboxes are superficially functional in summaries. But the state change isn't applied to the source file. This functionality might be beyond the scope of this plugin.
	 - Two (or more) tag summaries or embeds in the same note referencing the same tags will lose sync with each other. Warnings have been implemented. WORKAROUND: Use the **Refresh button** below the tag summary to manually update. 
- - -

## Disclaimer
This plugin modifies your notes. And while there are multiple safety precautions, this plugin comes with no guarantee of any kind. Neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk. [See complete license here.](https://raw.githubusercontent.com/moremeyou/Obsidian-Tag-Buddy/main/LICENSE)