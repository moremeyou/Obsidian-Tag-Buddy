const SOURCE_NOTE_READING_MODE = 'Open the source note in Reading Mode and try again.';
const EDIT_BLOCKED_WRONG_NOTE_SAFETY = 'Edit blocked so Tag Buddy does not change the wrong note.';

export const NOTICE_TEXT = {
	cannotIdentifyTagLocationRefresh: "Tag Buddy: Can't identify tag location. Please refresh and try again.",
	cannotIdentifyTagLocationTryAgain: "Tag Buddy: Can't identify tag location. Please try again.",
	cannotIdentifySummarySource: "Tag Buddy: Can't identify summary source note. Refresh this summary and try again.",
	cannotSafelyEditChangedSource: "Tag Buddy: Can't safely edit tag: source text changed. Edit blocked.",
	cannotSafelyEditCanvasContext: `Tag Buddy: Can't safely edit tags from Canvas yet. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditUnsupportedView: `Tag Buddy: Can't safely edit this tag from this non-Markdown view. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditUnsupportedContext: `Tag Buddy: Can't safely edit this tag here. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	markdownRenderedTagsOutOfSync: 'Tag Buddy: Markdown source and rendered tags are out of sync. Switch Reading Mode off and on, then check for tag syntax errors.',
	noFilePathForTagSource: 'Tag Buddy: No file path found. Try again, or this tag might be in an unsupported embed type.',
	noFileForTagSource: 'Tag Buddy: No file found. Try again, or this tag might be in an unsupported embed type.',
	multipleFilesForTagSource: "Tag Buddy: Multiple files found with the same name. Can't safely edit tag.",
	refreshRenderedTagPositionsAttempt: 'Tag Buddy: Tried refreshing rendered tag positions. Try again.',
	refreshRenderedTagPositionsSuccess: 'Tag Buddy: Refreshed rendered tag positions. Try again.',
	refreshEmbeddedTagPositionsSuccess: 'Tag Buddy: Refreshed embedded tag positions. Try again.',
	refreshSummaryTagPositionsSuccess: 'Tag Buddy: Refreshed summary tag positions. Try again.',
} as const;

export function cannotSafelyEditUnsupportedTagContext(target: HTMLElement | null): string {
	if (target && isCanvasTagContext(target)) {
		return NOTICE_TEXT.cannotSafelyEditCanvasContext;
	}

	return NOTICE_TEXT.cannotSafelyEditUnsupportedView;
}

export function markdownRenderedTagsOutOfSync(type: string): string {
	let message = 'Tag Buddy: Markdown source and rendered tags are out of sync.';

	if (type == 'active') {
		message += ' Try switching Reading Mode off and on, then check for tag syntax errors or conflicts in metadata.';
	} else if (type == 'plugin-summary') {
		message += ' Refresh this summary, then check for duplicate paragraphs or tag syntax errors.';
	} else if (type == 'native-embed') {
		message += ' Refresh this note or embed, then check for tag syntax errors in the embedded note.';
	}

	return message + ' Please report if this error persists.';
}

function isCanvasTagContext(target: HTMLElement): boolean {
	return Boolean(target.closest('.canvas, .canvas-wrapper, .canvas-node, .canvas-node-content'));
}
