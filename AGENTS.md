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
