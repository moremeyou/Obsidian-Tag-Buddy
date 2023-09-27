## Obsidian Tag Buddy
A collection of tag functionalities for Obsidian.

#### Use 1: Remove tag in-line
Quickly remove, edit or convert your tags in the active note, embeded note or generated tag-summary blocks. Hold ctrl/cmd+click to preserve the native functionality (tag search).

#### Use 2: Remove child tags in-line
If a tag has children, Use 1 will progressively remove them before removing the tag completely.

#### Use 3: Convert tag to text
OPT/ALT+CLICK removes the hash from the tag text.  

#### Use 4: Remove/edit/convert tags in generated tag summary blocks
Tags are editable in the active note, embeded notes AND when rendered using a tag-summary code block. Use this syntax:
````markdown
```tag-summary
tags: #tag1 #tag2 // search for notes with blocks that have these tags
include: #tag3 #tag4 // summaries for tag1 or tag2 must also include tag3 and tag4
exclude: #tag5 // but not have tag5
```
````

#### How I use?
Why is this useful to me? I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note/tag so I can review on-demand. In this workflow, tapping or removing a tag saves a few clicks, and with future updates, a few more. 

#### Settings
- Require CMD/WIN+CLICK to edit or delete a tag (default: off)
- Convert tag to text (remove hash) with ALT/OPT+CLICK (default: on)
- Remove child tags first (default: on). OFF: Use SHIFT+CLICK. 

## Notes
- ALWAYS BACKUP YOUR VAULT BEFORE USING NEW PLUGINS THAT EDIT YOUR NOTES.
- This plugin is for reading mode only. No plans to make it work in editing mode.
- Switch to editing mode to undo any deletions. **Deletions are permanent when applied to embeded or tag summaries.**
- I have incorporated custom functionalities from the [Tag Summary Plugin](https://github.com/moremeyou/tag-summary/tree/Tag-Summary-Mod).  

## To Do:
- [x] Optimizations 
- [ ] More optimizations
- [x] Test functionalities in other view types (canvas, tables, etc)
- [x] Settings to customize removal and convert (alt+click removes #, cmd+click native search)
- [ ] Bug: mobile tapping deletes tag AND opens tag search
- [x] Remove child tags before parent
- [x] Dynamic editing: Delete tags from Tag Summary (requires my modifed Tag Summary plugin)
- [x] Integrate parts of Tag Summary into this plugin
- [x] Dynamic editing support for embeds
- [ ] Consider Button and QuickAdd Plugin hook
- [ ] Right-click to add tag-summary in-line or in new note
- [x] Debug mode

## Disclaimer
This plugin modifies your notes. There are multiple safety precautions implemented, like checking if more than the tag has been changed. If so, the file is not modified. This plugin comes with no guarantee of any kind, and neither the author nor Obsidian are responsible for any loss of data or inconvenience. Use this plugin at your own risk.