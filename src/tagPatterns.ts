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

export type TagSummaryTagListField = 'tags' | 'include' | 'exclude';

export const TAG_SUMMARY_MAX_LINE_PATTERN = /^\s*max:\s*(\d+)\s*$/;
export const TAG_SUMMARY_TAGS_PREFIX_PATTERN = /^\s*tags:/;
export const TAG_SUMMARY_INCLUDE_PREFIX_PATTERN = /^\s*include:/;
export const TAG_SUMMARY_EXCLUDE_PREFIX_PATTERN = /^\s*exclude:/;
export const TAG_SUMMARY_SECTIONS_PREFIX_PATTERN = /^\s*sections?:/;
export const TAG_SUMMARY_TAG_TOKEN_PATTERN = /^#[\p{L}]+[^#]*$/u;
export const TAG_SUMMARY_BLOCK_SPLIT_PATTERN = /(?:\n\s*\n|(?<=^|\n)[*-]\s|(?<=^|\n)\d+\.\s)/;

/*
 * tag-summary code blocks have their own parser. These patterns intentionally
 * preserve the existing behavior instead of sharing user-input validation:
 * summary query lines allow Unicode letters and spaces in directive values,
 * while individual query tokens still require a leading # followed by a letter.
 */
export function createTagSummaryTagListLinePattern(field: TagSummaryTagListField): RegExp {
	return new RegExp(String.raw`^\s*${field}:[\p{L}0-9_\-/# ]+$`, 'gu');
}

export function createTagSummarySectionsLinePattern(): RegExp {
	return /^\s*sections?:[\p{L}0-9_\-/#, ]+$/gu;
}

/*
 * Summary source scanning is also distinct from rendered-tag source scanning.
 * It works on paragraph candidates gathered from many files, not active rendered
 * tags, so the boundaries are intentionally simpler here.
 */
export function createTagSummaryParagraphTagPattern(): RegExp {
	return /(?<=^|\s)(#[^\s#.,;!?:]+)/g;
}

export function createTagSummaryMatchedTagPattern(tag: string): RegExp {
	const tagText = tag.replace('#', '\\#');
	return new RegExp(`${tagText}(\\W|$)`, 'g');
}

export function createTagSummaryBlockLinkPattern(): RegExp {
	return /\^[\p{L}0-9_\-/^]+/gu;
}

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
