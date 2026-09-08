import assert from "node:assert/strict";
import { build } from "esbuild";

const buildResult = await build({
	entryPoints: ["tagPatterns.ts"],
	bundle: true,
	format: "esm",
	logLevel: "silent",
	platform: "node",
	target: "node20",
	write: false,
});

const moduleUrl = "data:text/javascript;base64,"
	+ Buffer.from(buildResult.outputFiles[0].contents).toString("base64");
const patterns = await import(moduleUrl);

function matches(pattern, input) {
	return [...input.matchAll(pattern)].map(patterns.normalizeMarkdownTagOrCodeFenceMatch);
}

assert.deepEqual(
	"intro #a\n\n- item #b\n1. numbered #c\nplain".split(patterns.TAG_SUMMARY_BLOCK_SPLIT_PATTERN),
	["intro #a", "", "item #b\n", "numbered #c\nplain"],
);
assert.deepEqual(
	"- first #a\n* second #b".split(patterns.TAG_SUMMARY_BLOCK_SPLIT_PATTERN),
	["", "first #a\n", "second #b"],
);

assert.deepEqual(
	patterns.findTagSummaryParagraphTags("#alpha and #beta/nested, plus x#not and (#gamma).")
		.map((match) => match.value),
	["#alpha", "#beta/nested"],
);
assert.deepEqual(
	patterns.findTagSummaryParagraphTags("prefix\t#tabbed\n#next"),
	[
		{ index: 7, value: "#tabbed" },
		{ index: 15, value: "#next" },
	],
);
assert.deepEqual(
	patterns.findTagSummaryParagraphTags("line\n#éclair #123 #under_score")
		.map((match) => match.value),
	["#éclair", "#123", "#under_score"],
);

assert.deepEqual(
	matches(patterns.createMarkdownTagOrCodeFencePattern(), "#alpha middle #beta/nested."),
	[
		{ index: 0, value: "#alpha" },
		{ index: 14, value: "#beta/nested" },
	],
);
assert.deepEqual(
	matches(patterns.createMarkdownTagOrCodeFencePattern(), "x#no #123 #a1"),
	[{ index: 10, value: "#a1" }],
);
assert.deepEqual(
	matches(patterns.createMarkdownTagOrCodeFencePattern(), "```\n#hidden\n```\n#shown"),
	[
		{ index: 0, value: "```" },
		{ index: 4, value: "#hidden" },
		{ index: 12, value: "```" },
		{ index: 16, value: "#shown" },
	],
);
assert.deepEqual(
	matches(patterns.createMarkdownTagOrCodeFencePattern(), "````\n#shown"),
	[{ index: 5, value: "#shown" }],
);
assert.deepEqual(
	matches(patterns.createMarkdownTagOrCodeFencePattern(), "> #quote\n- #list"),
	[
		{ index: 2, value: "#quote" },
		{ index: 11, value: "#list" },
	],
);

console.log("Tag pattern characterization tests passed.");
