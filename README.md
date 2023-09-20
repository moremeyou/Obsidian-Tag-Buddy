<<<<<<< HEAD
## Obsidian Tag Buddy
A collection of tag functionalities for Obsidian. 

#### Use 1: Quick delete tag in-line
Replicates the quick delete functionality of the #tagName(x) in YAML or properties panel. Hold ctrl/cmd+click to preserve the native functionality (tag search).

#### Use 2: Remove child tags in-line
If a tag has children, Use 1 will progressively remove them before removing the tag completely.

#### Use 3: Convert tag to text
OPT/ALT+CLICK removes the hash from the tag text.  

#### How I use?
Why is this useful to me? I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note/tag so I can review on-demand. In this workflow, tapping or removing a tag saves a few clicks, and with future updates, a few more. 

## Notes
- For now, the functionality only works in reading mode. 
- Switch to editing to undo any deletions. 
- **Deletions are permanent when applied to unopened files.**
- Works best with [Tag Summary](https://github.com/macrojd/tag-summary) and [Colored Tags](https://github.com/pfrankov/obsidian-colored-tags) plugins. 
- ALWAYS BACKUP YOUR VAULT BEFORE USING NEW PLUGINS THAT EDIT YOUR NOTES. 

## To Do:
- [x] Optimizations 
- [ ] More optimizations
- [x] Settings to customize removal and convert (alt+click removes #, cmd+click native search)
- [ ] Bug: mobile tapping deletes tag AND opens tag search
- [ ] Bug: should be ignoring the yaml and code blocks. indexs will need to account for this
- [x] Dynamic editing: Delete tags from Tag Summary (requires my modifed Tag Summary plugin)
- [ ] Dynamic editing: Integrate Tag Summary and/or find another way to know if this is "summary"
- [ ] Dynamic editing support for embeds
=======
# Tag Buddy

A collection of tag functionalities for Obsidian. 

**Functionality 1:** Quick delete in-line 

Replicates the quick delete functionality of the #tagName(x) in YAML or properties panel. Why? I use tags to connect ideas, but also as a flexible I/O or state/status management system. For example, most of my content comes in through daily notes with tags. Then I have specialized notes that query those tags into an "Inbox" section of the specialized note so I can review on-demand. This functionality saves a few clicks, and with future updates, a few more. 

**How to use**
- Click/tap a tag in reading mode and it delete from your note.
- Hold ctrl/cmd+click to preserve the native functionality (tag search).
- For now, only use this with tags in the current note. 
- For now, the functionality only works in reading mode. 
- Switch to editing to undo any deletions. 
- Works best with [Tag Summary](https://github.com/macrojd/tag-summary) and [Colored Tags](https://github.com/pfrankov/obsidian-colored-tags) plugins. 

**To Do:**
- [ ] Optimizations 
- [ ] Bug: mobile tapping deletes tag AND opens tag search
>>>>>>> parent of 04e1d81 (More functions)
- [ ] Rollover turns the tag background red
- [ ] Delete tags from embedded notes. 
- [ ] Delete tags from queried embedded notes (via Tag Summary). 
- [ ] More functionalites.