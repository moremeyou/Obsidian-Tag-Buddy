import { createHash } from "crypto";
import { copyFile, mkdir, readFile, stat } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const pluginId = "tag-buddy-fork2026";
const vaultPath = process.env.OBSIDIAN_VAULT;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(scriptDir, "..");
const repoRoot = path.resolve(srcDir, "..");
const verifyOnly = process.argv.includes("--verify-only");

if (!vaultPath) {
	throw new Error("Set OBSIDIAN_VAULT to your Obsidian vault path before deploying.");
}

const pluginDir = path.join(vaultPath, ".obsidian", "plugins", pluginId);

const files = [
	{ name: "manifest.json", source: path.join(repoRoot, "manifest.json") },
	{ name: "main.js", source: path.join(srcDir, "main.js") },
	{ name: "styles.css", source: path.join(srcDir, "styles.css") },
];

async function hashFile(filePath) {
	const bytes = await readFile(filePath);
	return createHash("sha256").update(bytes).digest("hex");
}

async function fileSize(filePath) {
	const info = await stat(filePath);
	return info.size;
}

async function assertManifestIdentity() {
	const manifest = JSON.parse(await readFile(path.join(repoRoot, "manifest.json"), "utf8"));
	if (manifest.id !== pluginId) {
		throw new Error(`Expected manifest id "${pluginId}", found "${manifest.id}".`);
	}
}

async function copyArtifacts() {
	await mkdir(pluginDir, { recursive: true });

	for (const file of files) {
		await copyFile(file.source, path.join(pluginDir, file.name));
	}
}

async function verifyArtifacts() {
	for (const file of files) {
		const deployed = path.join(pluginDir, file.name);
		const [sourceHash, deployedHash, sourceSize, deployedSize] = await Promise.all([
			hashFile(file.source),
			hashFile(deployed),
			fileSize(file.source),
			fileSize(deployed),
		]);

		if (sourceHash !== deployedHash || sourceSize !== deployedSize) {
			throw new Error(`${file.name} does not match deployed copy.`);
		}

		console.log(`${file.name}: ${sourceHash.slice(0, 12)} ${sourceSize} bytes`);
	}
}

await assertManifestIdentity();

if (!verifyOnly) {
	await copyArtifacts();
}

await verifyArtifacts();
console.log(`${verifyOnly ? "Verified" : "Deployed and verified"} ${pluginId} at ${pluginDir}`);
