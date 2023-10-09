import { App, debounce, Editor, MarkdownRenderer, Component, TFile, getAllTags, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';


export function getTagsFromApp(): string[] {
    const tagsObject = this.app.metadataCache.getTags();

    // Convert tagsObject to an array of [tag, count] tuples
    const tagsArray = Object.entries(tagsObject);

    // Sort by use count
    tagsArray.sort((a, b) => b[1] - a[1]);

    // Extract tag names after removing the #
    return tagsArray.map(([tag, _]) => tag.replace(/^#/, ""));
}

// Rules to ensure finding summaries in their source file works properly
export function htmlToMarkdown(html:string):string {
    const turndownService = new TurndownService();

    // Add custom rules here
    turndownService.addRule('ignoreHashTags', {
        filter: function(node) {
            return node.nodeName === 'A' && node.getAttribute('href') === `#${node.textContent.slice(1)}`;
        },
        replacement: function(content) {
            return content;
        }
    });

    turndownService.addRule('ignoreInternalLinks', {
        filter: function(node) {
            // Check if the node is an anchor tag with the class "internal-link"
            return node.nodeName === 'A' && node.classList.contains('internal-link');
        },
        replacement: function(content, node) {
            // Return the content wrapped in [[...]]
            return `[[${content}]]`;
        }
	});

	// Rule for task lists
	turndownService.addRule('taskLists', {
	    filter: function(node) {
	        // Check if the node is a list item containing a checkbox
	        return node.nodeName === 'LI' && node.querySelector('input[type="checkbox"]');
	    },
	    replacement: function(content, node) {
	        const checkbox = node.querySelector('input[type="checkbox"]');
	        return checkbox.checked 
	            ? `- [*] ${content.replace(/\[x\]\s*/, '')}`  // remove any [*] Turndown might have added
	            : `- [ ] ${content.replace(/\[\]\s*/, '')}`;  // remove any [ ] Turndown might have added
	    }
	});

    // Rule for strikethrough
    turndownService.addRule('strikethrough', {
        filter: ['del', 's'],
        replacement: function(content) {
            return `~~${content}~~`;
        }
    });

    // Rule for italics
	turndownService.addRule('italics', {
		filter: ['i', 'em'],
		replacement: function(content) {
    		return `*${content}*`;
		}
	});

    return turndownService.turndown(html);
}