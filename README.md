# Obsidian Tag Buddy 🔖
Add, edit and remove tags in reading mode. Copy, move or edit tagged blocks in reading and edit mode. 

### ✏️  Use 1: Add tags to note in reading-mode
![Add Tag Demo](https://user-images.githubusercontent.com/8971804/273914678-1f574966-a8fe-4fe4-8c91-7c3ef828c8c9.gif)

Add tag to text block/areas with **CTRL/CMD+RIGHT-CLICK**. Recently added tags are saved. Lock this list in settings, effectively making a favorites list. 

### 🫥 Use 2: Remove tags in reading-mode
![Remove Tag Demo](https://user-images.githubusercontent.com/8971804/273923015-9eb2de41-3aeb-4243-9655-efdf4fd70ace.gif)

**CLICK** to remove tags in the active note, embedded note/block or generated tag summary blocks. **DOUBLE-TAP** on mobile. Hold **CTRL/CMD+CLICK** to use the native tag search. Customize this in plugin settings. 

### 🪺  Use 3: Edit nested tags in reading mode
![Nested Tag Demo](https://user-images.githubusercontent.com/8971804/273923013-0b449539-cd7d-4c50-bb30-a2eb7c66dc93.gif)

If there are nested tags, Tag Buddy will progressively remove these first. 

### 🧼  Use 4: Convert tags to text in reading-mode
![Convert Tag Demo](https://user-images.githubusercontent.com/8971804/273923003-d22b0c3e-39dc-4444-8716-fa9bcb327319.gif)

Removes the hash (converts the tag to text) with **OPT/ALT+CLICK** on desktop or **PRESS+HOLD** on mobile.

### 🔎  Use 5: Add/edit tags in tag summaries
![Tag Summary Demo](https://user-images.githubusercontent.com/8971804/274069683-1e6257a6-f6d6-402a-adae-c534c2f5a507.gif)

Tags are editable in the active note, native embeds and when rendered using a tag summary code block. Use this syntax:
````markdown
```tag-summary
tags: #tag1 #tag2 // Find notes that have these tags (required)
include: #tag3 #tag4 // Results must also have these tags (optional)
exclude: #tag5 #tag6 // But not have these tags (optional)
max: 3 // Limits the results in the summary (optional)
```
````
Thanks to [Tag Summary Plugin](https://github.com/macrojd/tag-summary) for the original code behind the summaries.
### 🔤  Use 6 (BETA): Copy/remove tagged blocks
- Copy button: copy's paragraph to clipboard.
- Remove-tag button: removes the queried tag from the paragraph (which also removes it from the summary).
	- Made a mistake? Use notices to easily jump to the tagged note.
![Notice Demo](https://user-images.githubusercontent.com/8971804/274208965-fb8423e7-4f64-4bf6-84e8-afe1d44d81b4.gif)

Enable these buttons in plugin settings. 

### 📑   Use 7 (BETA): Copy/move tagged blocks to section
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
- Lock recently added tags

## 🗒️ Notes
- Switch to editing to undo any edits in the active note. 
	- **Edits are permanent in embeds/summaries (unless that note is open in a tab). I'm considering undo functionality with notices.**
- **Known limitations:**    
	 - Editing tags within some other plugins or unknown view types is not supported, for now. Please reach out if you have a use case.
	 - Checkboxes are superficially functional in summaries. But the state change isn't applied to the source file. This functionality might be beyond the scope of this plugin. But I will implement warnings.
	 - Two (or more) tag summaries or embeds in the same note referencing the same tags will lose sync with each other. Warnings have been implemented. WORKAROUND: Use the **Refresh button** below the tag summary to manually update. 
	
## ✅ To Do:
- [ ] Make add-tag popup look more like native Obsidian tag autocomplete
- [ ] Specify copy to section prefix within the tag-summary code block Ex: Section 1(-)  
- [ ] Possible undo/redo without switching to edit mode? Notices or buttons.
- [ ] Possible undo/redo changes to embedded or generated content? 
- [ ] Swap default convert tag function on mobile with add tag. 
- [ ] Command to add tag at cursor position
- [ ] Command to create tag summary
- [ ] Remove extra space if removing between words
- [ ] ON-GOING: Refactoring and cleanup
- [x] ~~Tag processing rebuilt around markdown rendering and observers~~
- [x] ~~Add tag location defaults to end of line if near last word~~
- [x] ~~Long-note tag rendering/processing issue~~
- [x] ~~Mobile editing “Can’t find tag location” issue.~~
- [x] ~~Cancel text selection on mobile after editing or removing a tag~~
- [x] ~~Error handling when editing very small and duplicated embeds~~
- [x] ~~Bake summary into note~~
- [x] ~~Settings for recently used tags~~ (edit, lock)
- [x] ~~Copy/make note from summary~~
- [x] ~~Add tags to content with CTRL/CMD+Right-click~~
- [x] ~~Option to remove tags from source note tagged block when copying~~
- [x] ~~Debug mode~~
- [x] ~~Test functionalities in other view types (canvas, tables, etc). Errors handled!~~
- [x] ~~Settings to customize removal and convert (alt+click removes #, cmd+click native search)~~
- [x] ~~Bug: mobile tapping deletes tag AND opens tag search~~
- [x] ~~Remove child tags before parent~~
- [x] ~~More optimizations~~
- [x] ~~Full mobile support (double tap to remove/edit, hold to convert)~~
- [x] ~~Deep editing: Remove/edit tags in embeded notes and from rendered code block tag summary~~
- [x] ~~Integrate parts of [Tag Summary Plugin](https://github.com/macrojd/tag-summary) into this plugin~~
- [x] ~~Setting to disable notices on mobile~~
- [x] ~~Restore native tag search functionality on single tap on mobile.~~
- [x] ~~Summary paragraph buttons: Copy summary paragraph, remove tag (removes the paragraph from summary), Copy To Section~~
- [x] ~~Notices when removing tags with buttons let you load and deep links you to the paragraph in the source note~~
- [x] ~~CMD/CTRL+Click Copy To Section button also removes the tag (and paragraph) from the summary~~
- [x] ~~Setting for tag summary buttons~~
- [x] ~~Limit tag summary results~~
- [x] ~~Bug: ctrl+click on windows breaks the plugin - fixed!~~
- [x] ~~Optimizations~~ 

## 👍 Support a buddy
There’s lots to do and I’d like this plugin to grow with Obsidian and the community. Your support will ensure on-going development and maintenance. 

<a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>
- - -

## Disclaimer
This plugin modifies your notes. And while there are multiple safety precautions, this plugin comes with no guarantee of any kind. Neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk. [See complete license here.](https://raw.githubusercontent.com/moremeyou/Obsidian-Tag-Buddy/main/LICENSE)