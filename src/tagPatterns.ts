export const CODE_FENCE_MARKER = '```';
export const NUMBERED_LIST_LINE_PATTERN = /^\d+\./;

/*
 * User-entered tag validation. These patterns preserve the existing Tag Buddy
 * behavior: ASCII letters, numbers, underscores, hyphens, and forward slashes
 * are accepted, and at least one non-digit character is required. The non-digit
 * slot intentionally includes "_", "-", and "/" because that is what the prior
 * validator allowed.
 *
 * Do not use these to scan rendered markdown source. Existing notes can contain
 * broader Obsidian-rendered tag shapes, and source scanning has different
 * boundary requirements.
 */
export const BARE_TAG_INPUT_PATTERN = /^[a-zA-Z0-9_\-\/]*[a-zA-Z_\-\/][a-zA-Z0-9_\-\/]*$/;
export const FULL_TAG_INPUT_PATTERN = /^#[a-zA-Z0-9_\-\/]*[a-zA-Z_\-\/][a-zA-Z0-9_\-\/]*$/;

/*
 * TagProcessor needs source positions to line up with Obsidian's rendered tag
 * elements. This scanner intentionally matches both tags and fenced code markers
 * in one ordered pass so code-block state changes at the right source offset.
 *
 * Tag behavior mirrored here:
 * - Left boundary is start-of-text or whitespace, which avoids hashes inside words.
 * - The tag body excludes whitespace, another #, common punctuation, and straight or
 *   curly apostrophes. That keeps punctuation outside the editable tag source.
 * - The lookahead requires at least one non-digit character, matching Obsidian's
 *   "tags cannot be only numbers" rule.
 * - Right boundary accepts punctuation, apostrophes, whitespace, or end-of-text
 *   without consuming that boundary character.
 * - The code-fence branch matches exactly three backticks that are not part of a
 *   longer backtick run. The surrounding context logic decides whether later tag
 *   matches are ignored while inside a fenced block.
 *
 * Return a new global RegExp each time. Reusing a /g RegExp would leak lastIndex
 * between scans and can silently skip tags.
 */
export function createMarkdownTagOrCodeFencePattern(): RegExp {
	return /(?<=^|\s)(#(?=[^\s#.'’,;!?:]*[^\d\s#.'’,;!?:])[^\s#.'’,;!?:]+)(?=[.,;!?:'’\s]|$)|(?<!`)```(?!`)/g;
}
