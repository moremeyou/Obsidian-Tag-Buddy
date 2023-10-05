## Obsidian Tag Buddy
Edit your tags without switching to edit mode! Tag Buddy is a collection of tag functionalities for Obsidian.

![demo](https://github.com/moremeyou/Obsidian-Tag-Buddy/blob/main/Demo.gif)

#### Use 1: Remove tag in reading mode
Quickly remove, edit or convert your tags in the active note, embeded note or generated tag summary blocks. Hold ctrl/cmd+click to preserve the native functionality (tag search).

#### Use 2: Remove child tags
If a tag has children, Use 1 will progressively remove the deepest child first.

#### Use 3: Convert tag to text
OPT/ALT+CLICK removes the hash (converts the tag to text).

#### Use 4: Render a summary of any tags. Tags rendered in this summary are also editable.
Tags are editable in the active note, natively embeded notes AND when rendered using a tag summary code block. Use this syntax:
````markdown
```tag-summary
tags: #tag1 #tag2 // search for notes with blocks that have these tags
include: #tag3 #tag4 // summaries for tag1 or tag2 must also include tag3 and tag4
exclude: #tag5 // but not have tag5
```
````
Thanks to [Tag Summary Plugin](https://github.com/macrojd/tag-summary) for the original code behind the summaries.

### Why is this useful to me? 
I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note/tag so I can review on-demand. With this plugin, I dont have to switch to editing mode to quickly process a tagged note. I will make a video of demo'ing this workflow.

### Settings
- Override native tag seatch. Toggle off to use cmd+click to remove tag, restoring native tag search.
- Convert to tag text with opt+click. Toggle off to use opt+click to perform native tag search.
- Remove child tags first. Toggle off to use shift+click to remove child tags fitst. 
- Override native mobile tag search. Toggle on to restore mobile native tag search on tap. Tag removal will then use press+hold.
- Show mobile notices. Toggle off to hide notices when editing or removing a tag.

### Notes
- ** BETA WARNING ** Plugin is stable, but not fully tested.
- ALWAYS BACKUP YOUR VAULT BEFORE USING NEW PLUGINS THAT EDIT YOUR NOTES.
- Tag interaction is for reading mode only. No plans to make it work in editing mode.
- Switch to editing mode to undo any edits in the active note. **Edits are permanent in embeds, for now.**

### To Do:
- [x] Optimizations 
- [x] Test functionalities in other view types (canvas, tables, etc). Errors handled!
- [x] Settings to customize removal and convert (alt+click removes #, cmd+click native search)
- [x] Bug: mobile tapping deletes tag AND opens tag search
- [x] Remove child tags before parent
- [x] More optimizations
- [x] Full mobile support (double tap to remove/edit, hold to convert)
- [x] Deep editing: Remove/edit tags in embeded notes and from rendered code block tag summary
- [x] Integrate parts of [Tag Summary Plugin](https://github.com/macrojd/tag-summary) into this plugin
- [x] Setting to disable notices on mobile
- [x] Restore native tag search functionality on single tap on mobile. 
- [ ] Setting to open notes in new tab or not
- [ ] Look into cancelling the text selection on mobile after editing or removing a tag
- [x] Bug: ctrl=click on windows breaks the plugin, working on it.
- [ ] Explore ability to convert normal word to tag (add hash to word)
- [ ] Investigate the limit on rendered tag elements
- [ ] More optimizations and major refactoring.
- [ ] Possible undo/redo without switching to edit mode?
- [ ] Possible undo/redo changes to embeded or generated content? 
- [ ] Consider Button and QuickAdd Plugin hooks
- [ ] Right-click or extra-long press to add tag summary in-line or in new note?
- [ ] Debug mode
- [ ] Video demo of my workflow using this plugin. "Super-powered creative inbox: Capture, curate and process your ideas"

### Disclaimer
This plugin modifies your notes. There are multiple safety precautions implemented, like checking if more than the clicked tag was changed. If so, the file is not modified. That said, this plugin comes with no guarantee of any kind, and neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk.