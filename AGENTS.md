# AGENTS.md

## Project Context

This repo is David's Obsidian Tag Buddy plugin. Treat it as an active cleanup/refinement project with older code, uneven architecture, and a need for careful deployment discipline.

The current development fork identity is:

- Plugin id: `tag-buddy-fork2026`
- Display name: `Tag Buddy Fork 2026`
- Dev vault folder: `/Users/davidfasullo/Desktop/dBrain/.obsidian/plugins/tag-buddy-fork2026`
- Original plugin folder: `/Users/davidfasullo/Desktop/dBrain/.obsidian/plugins/tag-buddy`
- Preferred working branch for this phase: `tag-buddy-fork2026`

Keep the original Tag Buddy installed while testing the fork. Do not deploy fork files into the original `tag-buddy` folder.

## Operating Model

Before editing, inspect the repo state:

- Run `git status --short --branch`.
- Read `README.md`, `manifest.json`, `src/package.json`, `src/main.ts`, `src/esbuild.config.mjs`, and relevant local docs.
- Check whether deployed Obsidian plugin files match repo artifacts before debugging runtime behavior.

Never assume the vault plugin folder matches source. Build first, copy second, verify third.

## Deployment Rules

Use the fork deploy workflow from `src/`:

```bash
cd "/Users/davidfasullo/Library/CloudStorage/GoogleDrive-moremeyou@gmail.com/My Drive/GIT/Obsidian-Tag-Buddy/src"
npm run deploy:fork2026
```

This command builds `main.js`, copies `manifest.json`, `main.js`, and `styles.css` to the fork plugin folder, then verifies all three by hash.

For read-only deployment verification:

```bash
npm run verify:fork2026
```

If `src/main.js` disappears or deployment verification fails unexpectedly, first check for external automation or sync tooling moving generated artifacts.

## Obsidian Testing Rules

Only one Tag Buddy variant should be enabled at a time. The original and fork both register global rendered-tag handlers and the `tag-summary` code block processor.

For plugin identity, settings tab, or suspicious runtime behavior, restart Obsidian fully. Do not rely on hot reload for those cases.

When creating or updating Obsidian test notes, put instructional tag-looking examples such as `#example` inside fenced code blocks, not inline code or normal prose. Tag Buddy's source scanner intentionally ignores fenced code blocks, but inline code/prose can still be scanned as source tags while Obsidian may not render matching `.tag` elements. That mismatch can trigger a false rendered-tag/source out-of-sync warning and waste debugging time. Keep normal test target tags as real markdown tags, and keep example input strings fenced.

Test notes should have direct inline instructions for the specific behavior under test. Prefer headings like `Testing add-tag validation`, `Do this`, `Expected`, and `Watch for errors`. Do not repeat general setup boilerplate such as enabling the fork plugin in every note; assume the fork testing setup from this file. Include edge cases in the note itself, but keep them isolated from normal pass cases when they are expected to trigger fail-safe warnings.

Use a safe smoke test before broader changes:

- Open Obsidian after deployment.
- Disable `Tag Buddy`.
- Enable `Tag Buddy Fork 2026`.
- Test Reading Mode tag click behavior.
- Open the fork settings tab.
- Test a safe `tag-summary` block if needed.

Manual smoke-test checklist used for this fork:

1. Stale/source safety:
   - Test file: `/Users/davidfasullo/Desktop/dBrain/Tag Buddy/Testing 2026/TB Test 7 - Stale Source Safety.md`
   - If natural side-by-side stale state is hard to reproduce, force stale metadata from Obsidian DevTools by setting a rendered Reading Mode tag's `md-index` to `0`, then click it.
   - Expected: stale/source edit is blocked, then Tag Buddy shows a rendered-tag refresh/try-again notice.
2. Basic Reading Mode remove:
   - In a safe test note, add `#tb-test-remove`, switch to Reading Mode, and click the tag.
   - Expected: the tag is removed from markdown.
   - For nested tags such as `#tb-test/parent/child`, repeated clicks should remove child segments first.
3. Edit modal rename/validation:
   - Add `#tb-test-rename`, then Cmd-click it in Reading Mode.
   - Expected: Tag Actions opens.
   - Rename to `tb-test-renamed` and `tb-test/nested`; both should normalize and save as valid tags.
   - Rename to `bad tag`; it should be rejected without changing source.
4. Summary dashboard:
   - Test file: `/Users/davidfasullo/Desktop/dBrain/Tag Buddy/Testing 2026/TB Test 10 - Summary Dashboard.md`
   - Source fixtures: `TB Test 10 - Summary Source A.md` and `TB Test 10 - Summary Source B.md`
   - Expected: summaries render, remove-tag updates the source/summary, and copy-to-section can copy a paragraph under `Inbox` or `Archive`.
5. Recent tags settings:
   - Test file: `/Users/davidfasullo/Desktop/dBrain/Tag Buddy/Testing 2026/TB Test 11 - Recent Tags Settings.md`
   - In fork settings, enter `alpha, #beta/nested, bad tag, #gamma-test`.
   - Expected: valid tags normalize and invalid `bad tag` is dropped.

## Git Rules

Use non-interactive Git commands. Avoid destructive Git operations unless the user explicitly asks.

Do not revert unrelated local work. If committing, stage only relevant files and summarize what changed.

If GitHub Desktop reports stale lock errors, inspect `.git/**/*.lock` files before assuming the push failed. The fork branch has previously pushed successfully even while stale local lock files existed.

## Cleanup Phase Rules

Do not start broad refactoring just because the code has debt. Preserve user-facing behavior while making the side-by-side fork and deployment path reliable.

README media assets live in `docs/assets/`. Keep README image links branch-relative so they render correctly on fork branches.

Prefer small, verified changes:

- Establish deployment integrity.
- Fix one behavior or structural issue at a time.
- Rebuild and verify the fork after each meaningful change.
- Document any recurring operational lesson here.

## Current Cleanup Checkpoints

Latest verified fork state after the Reading Mode editor cleanup and tag-sync safety pass:

- Reading Mode edit/remove/hash behavior is split into smaller helper flows in `src/ReadingModeTagEditor.ts`.
- Active-file rendered tag mapping in `src/TagProcessor.ts` must preserve Obsidian's internal `view.currentMode.renderer.sections` path. Do not replace it with a plain visible-container `.querySelectorAll('.tag')` query; long notes can have off-screen or not-yet-rendered DOM, which can produce false source/render out-of-sync warnings.
- When comparing rendered `.tag` elements to markdown source positions, skip source tags in contexts Obsidian does not expose as editable body tags for that rendered view, such as frontmatter/properties. Full source scans used for note/vault-wide edits can still include those tags when appropriate.
- For out-of-sync warnings that happen only on app startup or only with a specific long note, first check whether active-file processing is using `renderer.sections`, whether a scoped container path bypasses it, and whether a `tag-summary` block at the top is still rendering.
- Test notes added for this checkpoint live in `/Users/davidfasullo/Desktop/dBrain/Tag Buddy/Testing 2026/`: `TB Test 13 - Reading Mode Editor Full Pass.md`, `TB Test 14 - Frontmatter Tag Sync.md`, and `TB Test 15 - Startup Summary Sync.md`.

Latest verified fork state after the tag-summary cosmetic/layout pass:

- Summary item rendering in `src/TagSummary.ts` still renders markdown first, then decorates the rendered DOM. Preserve that order; it keeps Obsidian-rendered links/tags intact before Tag Buddy moves the note link and item controls into the item header row.
- Summary item `md-source` must remain the original source paragraph, even when the displayed/exported paragraph is compacted. Tag edit/remove safety and source mapping depend on the untouched `md-source` value.
- Whole-summary copy, create-note, and flatten actions use cleaned export markdown: queried `tags` and `include` tags are removed from output bodies, leading tag-only lines can compact onto the following body line, and link/body line breaks must be preserved.
- Summary header controls support platform-specific visibility for query tags and each whole-summary button. The default is query tags plus refresh only; user settings in the fork vault can still show all buttons.
- Item controls use the `.tagsummary-copy-to-controls` wrapper inside `.tagsummary-buttons` so copy/move/dropdown spacing remains consistent for every visible button combination.
- Test notes added for this checkpoint live in `/Users/davidfasullo/Desktop/dBrain/Tag Buddy/Testing 2026/`: `TB Test 16 - Summary Header Controls.md`, `TB Test 17 - Summary Output Cleanup.md`, and `TB Test 18 - Summary Leading Tag Lines.md`.
