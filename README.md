# Obsidian Tag Buddy 🔖
Edit and remove tags and copy, move or edit tagged blocks all without leaving **reading-mode**.

### Use 1: Remove tag  
![Remove tag demo](image.gif)
Click to remove tags in the active note, embedded note/block or generated tag summary blocks. Double-tap on mobile. Hold **CTRL/CMD+CLICK** to use the native tag search functionality on desktop and adjust the plugin settings to for native search on mobile.

### Use 2: Remove nested tags
![Remove child tags demo](image.gif)
If there are nested tags, Use 1 will progressively remove these first.

### Use 3: Convert tag to text
![Convert tags demo](image.gif)
Removes the hash (converts the tag to text) with **OPT/ALT+CLICK** on desktop or PRESS+HOLD on mobile.

### Use 4: Add tag to text
![Convert tags demo](image.gif)
Add tag to content block/area with CTRL/CMD+RIGHT-CLICK.

### Use 5: Render a summary of tagged paragraphs
![Tag summary demo](image.gif)
Tags are editable in the active note, native embeds and when rendered using a tag summary code block. Use this syntax:
````markdown
```tag-summary
tags: #tag1 #tag2 // search for notes with blocks that have these tags (required)
include: #tag3 #tag4 // summaries for tag1 or tag2 must also 
exclude: #tag5 // but not have tag5 (optional)
max: 3 // restricts the results in the summary (optional)
```
````
Thanks to [Tag Summary Plugin](https://github.com/macrojd/tag-summary) for the original code behind the summaries.

### Use 6: Tag summary buttons
![Summary copy/remove buttons demo](image.gif)
- Tagged paragraph copy button: copy's paragraph to clickboard.
- Tagged paragraph remove-tag button: removes the queried tag from the paragraph (which also removes it from the summary).
- Made a mistake? Use the notices to easily jump to the note the tag was removed from. 
![Notices demo](image.gif)

### Use 7: Copy/move tagged paragraphs other sections
![Summary copy-to-section button demo](image.gif)
Buttons added to each tagged paragraph in summaries let you copy the paragraph (with a back link) to header sections in the active note. Use CTRL/CMD when clicking to remove the tag (from the paragraph and summary), effectively moving the paragraph to the section. These buttons will appear when you add section details to the tag summary code block like this:
````markdown
```tag-summary
tags: #tag1 #tag2 
sections: Section 1, Section 2 //  Header sections in the same note as this code block. Max 3 (for space).
```
````
Thanks to [QuickAdd Plugin](https://github.com/chhoumann/quickadd) for the logic behind inserting content under headers.

- - - 
## Settings
- Override native tag search. Toggle off to use **CMD/CTRL+CLICK** to remove tag, restoring native tag search on click.
- Convert to tag text with ALT/OPT+CLICK. Toggle off to use ALT/OPT+CLICK to perform native tag search.
- Remove child tags first. Toggle off to use SHIFT+CLICK to remove child tags first. 
- Override native mobile tag search. Toggle on to restore mobile native tag search on tap. Tag removal will then use LONG-PRESS.
- Show mobile notices. Toggle off to hide notices when editing or removing a tag.
- Specify the copy-to-section prefix when using buttons in tag summary.
- Enable tag summary paragraph action buttons. Disable to hide. 

## Why is this useful to me? 
I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note/tag so I can review and process on-demand.  

## Notes
- **BETA WARNING!** Plugin is stable, but not fully tested.
> **ALWAYS BACKUP YOUR VAULT BEFORE USING NEW PLUGINS THAT EDIT YOUR NOTES.**
- Most Tag Buddy interactions are for **reading mode only**, though some features work naturally in both. Please let me know if you have a use case for multi-mode compatibility.
- Switch to editing mode to undo any edits in the active note. 
	- **Edits are permanent in embeds (unless that note is open in a tab). I'm considering undo functionality with notices.**
- **Known limitations:**  
	 - Editing tags in an embed that's very short and repeated in the source note will edit the first instance of the tag. I’m working on error handling for this. WORKAROUND: Avoid repeated content in the same note that you want to embed elsewhere.  
	 - Editing tags within some other plugins or unknown view types is not supported, for now. Please reach out if you have a use case.
	 - Checkboxes are superficially functional in summaries. But the state change isn't applied to the source file. This functionality might be beyond the scope of this plugin. But I should implement warnings.
	 - Tag editing doesn’t work on first click after unfolding content. WORKAROUND: Click again - the first click was needed to reprocess the tags. Please connect if you know of any fold-state events I can listen for so I can automatically re-process the tags.
	 - Two (or more) tag summaries in the same note referencing the same tags will lose sync with each other. The fix is to update all the summaries in the active note, not just the one you clicked into. But this causes screen flicker as the codeblocks are re-rendered. So I don't think the trade-off is worth it. Maybe make this a setting in there’s a use case. Please reach out.


## Support a buddy
<a href="https://www.buymeacoffee.com/moremeyou" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 150px !important;" ></a>


## To Do:
- [ ] ON-GOING: Tweak Turndown rules to ensure html and markdown match in all cases. Please share issues if found.
- [ ] ON-GOING: Total re-work for more robust/flexible/compatible tag processing
- [ ] ON-GOING: More safety checks when editing tagged content in embeds or summary with non-obsidian markdown formatting
- [ ] Setting to open notes in new tab or not when using buttons
- [ ] Cancel text selection on mobile after editing or removing a tag
- [ ] Add tags to content with CTRL/CMD+Right-click
- [ ] Option to remove tags from source note tagged block when using CTRL/CMD + copying to section button in tag summaries
- [ ] Error handling when editing very small and duplicated embeds
- [ ] Specify copy to section prefix within the tag-summary code block Ex: (Section 1(- ))
- [ ] Possible undo/redo without switching to edit mode? Notices or buttons.
- [ ] Possible undo/redo changes to embeded or generated content? 
- [ ] Right-click or extra-long press to add tag summary in-line or in new note?
- [ ] Automatic tag re-processing on fold state change
- [ ] Command to add tag at cursor position
- [ ] Video demo of my workflow using this plugin. "Super-powered creative inbox: Capture, curate and process your ideas"
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


- - -

## Disclaimer
This plugin modifies your notes. There are multiple safety precautions implemented, like checking if more than the clicked tag was changed. If so, the file is not modified. That said, this plugin comes with no guarantee of any kind, and neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk.