const SOURCE_NOTE_READING_MODE = 'Open the source note in Reading Mode and try again.';
const EDIT_BLOCKED_WRONG_NOTE_SAFETY = 'Edit blocked so Tag Buddy does not change the wrong note.';

export const NOTICE_TEXT = {
	cannotIdentifyTagLocationRefresh: "Tag Buddy: Can't identify tag location. Please refresh and try again.",
	cannotIdentifyTagLocationTryAgain: "Tag Buddy: Can't identify tag location. Please try again.",
	cannotIdentifyDestinationNote: "⚠️ Tag Buddy: Can't identify destination note.",
	cannotFindStableTextPosition: "Tag Buddy: Can't find a stable text position. Try a different text area.",
	cannotFindClickedWord: "Tag Buddy: Can't find clicked word. Try again.",
	cannotIdentifyActiveNote: 'Tag Buddy: Can\'t identify the active note. Open a Markdown note in Reading Mode and try again.',
	cannotIdentifyEmbedSource: 'Tag Buddy: Can\'t identify source note for this embed. Open the embedded note in Reading Mode and try again.',
	cannotIdentifySummarySource: "Tag Buddy: Can't identify summary source note. Refresh this summary and try again.",
	cannotIdentifySourceNoteForSummary: "⚠️ Tag Buddy: Can't identify source note for this summary.",
	cannotIdentifySummaryItemSource: "Tag Buddy: Can't identify source note for this summary item. Refresh this summary and try again.",
	cannotIdentifySummaryItemSourceShort: "⚠️ Tag Buddy: Can't identify source note for this summary item.",
	cannotIdentifySummaryItemSourceText: "Tag Buddy: Can't identify source text for this summary item. Refresh this summary and try again.",
	cannotIdentifyTagSummaryItem: "⚠️ Can't identify tag summary item. Please refresh this summary and try again.",
	cannotAddTagNoText: "Tag Buddy: Can't add tag here. Try a different text area.",
	cannotAddTagRepeatedText: "Tag Buddy: Can't safely add tag: clicked text repeats in the source note. Try a more specific text block.",
	cannotSafelyEditChangedSource: "Tag Buddy: Can't safely edit tag: source text changed. Edit blocked.",
	cannotSafelyEditCanvasContext: `Tag Buddy: Can't safely edit tags from Canvas yet. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditUnsupportedView: `Tag Buddy: Can't safely edit this tag from this non-Markdown view. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditUnsupportedContext: `Tag Buddy: Can't safely edit this tag here. ${EDIT_BLOCKED_WRONG_NOTE_SAFETY} ${SOURCE_NOTE_READING_MODE}`,
	cannotSafelyEditRepeatedSummarySource: "Tag Buddy: Can't safely remove/edit tag: surrounding text repeats in the source note. Edit blocked.",
	cannotFindTagInSourceNote: 'Tag Buddy: Can\'t find tag in source note. Refresh and try again.',
	cannotFindSummaryCodeBlockSourceBug: "⚠️ Tag Buddy: Can't find code block source. This is a BUG.",
	cannotIdentifyFileToRename: "Tag Buddy: Can't identify file to rename.",
	fileChangeError: 'Tag Buddy: File change error.',
	invalidTag: 'Invalid tag.',
	invalidTagFormat: 'Invalid tag format.',
	markdownRenderedTagsOutOfSync: 'Tag Buddy: Markdown source and rendered tags are out of sync. Switch Reading Mode off and on, then check for tag syntax errors.',
	noFilePathForTagSource: 'Tag Buddy: No file path found. Try again, or this tag might be in an unsupported embed type.',
	noFileForTagSource: 'Tag Buddy: No file found. Try again, or this tag might be in an unsupported embed type.',
	multipleFilesForTagSource: "Tag Buddy: Multiple files found with the same name. Can't safely edit tag.",
	noteAlreadyExistsOverwrite: '⚠️ Note already exists.\nClick here to overwrite.',
	noteUpdatedOpen: 'Note updated.\n🔗 Open note.',
	refreshSummaryToSeeChanges: 'Refresh this summary to see changes.',
	refreshRenderedTagPositionsAttempt: 'Tag Buddy: Tried refreshing rendered tag positions. Try again.',
	refreshRenderedTagPositionsSuccess: 'Tag Buddy: Refreshed rendered tag positions. Try again.',
	refreshEmbeddedTagPositionsSuccess: 'Tag Buddy: Refreshed embedded tag positions. Try again.',
	refreshSummaryTagPositionsSuccess: 'Tag Buddy: Refreshed summary tag positions. Try again.',
	selectionCopiedToClipboard: 'Selection copied to clipboard.',
	summaryCopiedToClipboard: 'Summary copied to clipboard.',
	summaryNoteCreatedOpen: 'Summary note created. 📜\n🔗 Open note.',
	taggedParagraphCopiedToClipboard: 'Tagged paragraph copied to clipboard.',
	tagSummaryFlattenedToActiveNote: 'Tag summary flattened to active note.',
	tagSummaryUpdated: 'Tag Summary updated',
	tagRemovedEmptyNote: 'Tag Buddy: Tag removed. The note is empty.',
} as const;

export const SETTINGS_TEXT = {
	sections: {
		general: 'General',
		desktop: 'Desktop',
		mobile: 'Mobile',
		tagSummaries: 'Tag Summaries',
		tagSummaryControls: 'Tag Summary Buttons',
		tagSummaryItems: 'Tag Summary Item Buttons',
		support: 'Support a buddy',
	},
	recentTags: {
		name: 'Recent tags',
		desc: 'The most recent tags added via Tag Buddy are stored here. These will show up first in the list when adding.',
	},
	lockRecentTags: {
		name: 'Lock recent tags',
		desc: 'Toggle ON to lock the recent tags list. Recent tags will not be updated. Instead, the tags above will act like a favorites list.',
	},
	desktopClickTag: {
		name: 'Action when clicking a tag:',
		desc: 'What should happen when you click a tag?',
	},
	desktopCmdClickTag: {
		name: 'Action when clicking a tag with CMD/CTRL modifier key:',
		desc: 'What should happen when you click a tag while holding the CMD or CTRL key?',
	},
	desktopOptClickTag: {
		name: 'Action when clicking a tag with OPT/ALT modifier key:',
		desc: 'What should happen when you click a tag while holding the OPT or ALT key?',
	},
	mobileNotices: {
		name: 'Show mobile notices',
		desc: 'Toggle OFF to hide notices.',
	},
	mobileDoubleTapTag: {
		name: 'Action when DOUBLE-TAPPING a tag:',
		desc: 'What should happen when you DOUBLE-TAP a tag?',
	},
	mobileLongPressTag: {
		name: 'Action when LONG-PRESSING a tag:',
		desc: 'What should happen when you LONG-PRESS a tag?',
	},
	mobileTripleTapText: {
		name: 'TRIPLE-TAP non-tag, non-link text to add a tag:',
		desc: 'Toggle OFF to disable triple-tap.',
	},
	showSummaryTags: {
		name: 'Summary tags:',
		desc: 'Show or hide the query tags above summaries.',
	},
	summaryActionButtons: {
		refresh: 'Refresh summary button:',
		copySummary: 'Copy summary button:',
		createNote: 'Create summary note button:',
		flatten: 'Flatten summary button:',
	},
	summaryButtons: {
		removeTag: 'Remove tag button:',
		copyToClipboard: 'Copy to clipboard button:',
		moveToSection: 'Move to section button:',
		copyToSection: 'Copy to section button:',
		copyLinkToSection: 'Copy link to section button:',
		copyToNote: 'Copy to note button:',
	},
	tagActionOptions: {
		remove: 'Remove tag',
		hash: 'Remove hash',
		edit: 'Edit tag',
		native: 'Search tag',
	},
	summaryButtonVisibility: {
		always: 'Desktop and mobile',
		desktop: 'Only desktop',
		mobile: 'Only mobile',
		hide: 'Hide',
	},
	donateAlt: 'Buy Me A Coffee',
	debugMode: {
		name: 'Debug mode',
		desc: 'Output to console.',
	},
} as const;

export const TAG_EDITOR_TEXT = {
	title: 'Tag Actions',
	submit: 'Submit',
	actionOptions: {
		rename: 'Rename',
		lower: 'Convert to lower case',
		toText: 'Remove hash (#)',
		summary: 'Create summary',
	},
	summaryDestination: {
		name: 'Where do you want to add the tag summary?',
		desc: 'Add multiple tags above separated by a comma.',
		top: 'Top of this note',
		end: 'Bottom of this note',
		note: 'In a new note',
	},
	rename: {
		newName: 'New name',
		newNameDesc: 'Enter the tag with or without #. Tags can include letters, numbers, underscores (_), hyphens (-), and forward slashes (/) for nested tags.',
	},
	scope: {
		name: 'Where to make this change?',
		instance: 'Just this instance',
		note: 'All in this note',
		vault: 'Across entire vault',
		vaultDesc: 'WARNING: There is NO UNDO for vault changes. Consider making a backup of your vault first.',
		noteDesc: "Only tags in this note will be updated. Choose 'Across entire vault' to update this tag everywhere.",
		instanceDesc: '',
	},
} as const;

export const GUI_TEXT = {
	titles: {
		unselectParagraph: 'Unselect this paragraph.',
		selectParagraph: 'Select this paragraph.',
		refreshTagSummary: 'Refresh tag summary',
		flattenSummary: 'Flatten summary (replaces code block).',
		copyParagraphToClipboard: 'Copy paragraph to clipboard.',
		copySummary: 'Copy summary',
		createNoteFromSummary: 'Create note from summary',
	},
	copyToButtonTitles: {
		link: 'Copy paragraph link.',
		copy: 'Copy paragraph.',
		move: 'Move paragraph.',
		note: 'Copy paragraph to section in note.',
	},
	dropdown: {
		noteTop: 'Note top',
		noteEnd: 'Note end',
	},
} as const;

export const TAG_SUMMARY_TEXT = {
	emptyNoMatchesPrefix: 'There are no notes with tagged paragraphs that match the tags:<br>',
	generatedFileNamePrefix: 'Tag Summary',
	generatedTitleSuffix: 'Tag Summary',
	noTagsSpecified: 'No tags specified.',
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

export function copiedToSection(section: string, canLink: boolean): string {
	return 'Copied to section: ' + section + '. ' + (canLink ? '🔗' : '');
}

export function copiedToSectionCannotUpdateSource(section: string): string {
	return 'Copied to section: ' + section + '.\nCan\'t update source file.';
}

export function copiedToSectionInNote(section: string, noteName: string): string {
	return 'Copied to section: ' + section + ' in ' + noteName + ' 🔗';
}

export function copyToButtonTitle(mode: keyof typeof GUI_TEXT.copyToButtonTitles): string {
	return GUI_TEXT.copyToButtonTitles[mode];
}

export function fileReadError(errorMessage: string): string {
	return 'Tag Buddy file read error:\n' + errorMessage;
}

export function removedTagFromParagraphTitle(tag: string): string {
	return 'Removed ' + tag + ' from paragraph.';
}

export function sectionNotFoundPastingTop(section: string): string {
	return section + ' not found. Pasting at top of note.';
}

export function tagConvertedToText(tag: string): string {
	return 'Tag Buddy: ' + tag + ' converted to text.';
}

export function childTagRemovedFromParent(removedChild: string | undefined): string {
	return 'Tag Buddy: \'' + (removedChild ?? '') + '\' removed from parent tag.';
}

export function tagRemoved(tag: string): string {
	return 'Tag Buddy: ' + tag + ' removed.';
}

export function tagRemovedFromParagraph(tag: string): string {
	return tag + ' removed from paragraph.\n🔗 Open source note.';
}

export function tagNoteEditingErrorBackup(errorMessage: string, backupFileName: string): string {
	return '⚠️ Tag/note editing error: ' + errorMessage + '\n' + backupFileName + ' saved to vault root.';
}

export function tagNoteEditingErrorClipboard(errorMessage: string): string {
	return '⚠️ Tag/note editing error: ' + errorMessage + '\nNote content copied to clipboard.';
}

export function tagSummaryEmptyHtml(tags: string[]): string {
	return TAG_SUMMARY_TEXT.emptyNoMatchesPrefix
		+ (tags.length > 0 ? tags.join(', ') : TAG_SUMMARY_TEXT.noTagsSpecified) + '<br>';
}

function isCanvasTagContext(target: HTMLElement): boolean {
	return Boolean(target.closest('.canvas, .canvas-wrapper, .canvas-node, .canvas-node-content'));
}
