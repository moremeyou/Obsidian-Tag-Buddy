## Obsidian Tag Buddy
A collection of tag functionalities for Obsidian. 

**BETA WARNING**
- For now, you need the modified tag-summary plugin (also on git) to use this plugin. 
- Multiple safety checks are implemented, but please backup your vault before using.

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
- ALWAYS BACKUP YOUR VAULT BEFORE USING NEW PLUGINS THAT EDIT YOUR NOTES. 

## To Do:
- [x] Optimizations 
- [ ] More optimizations
- [x] Settings to customize removal and convert (alt+click removes #, cmd+click native search)
- [ ] Bug: mobile tapping deletes tag AND opens tag search
- [x] Remove child tags before parent
- [x] Dynamic editing: Delete tags from Tag Summary (requires my modifed Tag Summary plugin)
- [ ] Integrate parts of Tag Summary into this plugin
- [x] Dynamic editing support for embeds