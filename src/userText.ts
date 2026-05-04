const SOURCE_NOTE_READING_MODE = 'Open the source note in Reading Mode and try again.';

export const NOTICE_TEXT = {
	cannotIdentifyTagLocationRefresh: "Tag Buddy: Can't identify tag location. Please refresh and try again.",
	cannotIdentifyTagLocationTryAgain: "Tag Buddy: Can't identify tag location. Please try again.",
	cannotIdentifySummarySource: "Tag Buddy: Can't identify summary source note. Refresh this summary and try again.",
	cannotSafelyEditChangedSource: "Tag Buddy: Can't safely edit tag: source text changed. Edit blocked.",
	cannotSafelyEditUnsupportedView: `Tag Buddy: Can't safely edit this tag from this view. ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditUnsupportedContext: `Tag Buddy: Can't safely edit this tag here. ${SOURCE_NOTE_READING_MODE}`,
	markdownRenderedTagsOutOfSync: 'Tag Buddy: Markdown source and rendered tags are out of sync. Switch Reading Mode off and on, then check for tag syntax errors.',
	noFilePathForTagSource: 'Tag Buddy: No file path found. Try again, or this tag might be in an unsupported embed type.',
	noFileForTagSource: 'Tag Buddy: No file found. Try again, or this tag might be in an unsupported embed type.',
	multipleFilesForTagSource: "Tag Buddy: Multiple files found with the same name. Can't safely edit tag.",
	refreshRenderedTagPositionsAttempt: 'Tag Buddy: Tried refreshing rendered tag positions. Try again.',
	refreshRenderedTagPositionsSuccess: 'Tag Buddy: Refreshed rendered tag positions. Try again.',
	refreshEmbeddedTagPositionsSuccess: 'Tag Buddy: Refreshed embedded tag positions. Try again.',
	refreshSummaryTagPositionsSuccess: 'Tag Buddy: Refreshed summary tag positions. Try again.',
} as const;

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
