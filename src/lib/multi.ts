import * as path from "node:path";

export async function expandGlob(patterns: string[]): Promise<string[]> {
	const seen = new Set<string>();
	for (const pattern of patterns) {
		const glob = new Bun.Glob(pattern);
		for await (const file of glob.scan(".")) {
			seen.add(file);
		}
	}
	return [...seen].sort();
}

export function resolveVars(
	template: string,
	vars: Record<string, string>,
): string {
	return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export function buildFileCommands(
	file: string,
	commandTemplates: string[],
	outputTemplate: string,
): string[] {
	const dir = path.dirname(file);
	const stem = path.basename(file, path.extname(file));
	const input = file;

	const baseVars: Record<string, string> = { input, stem, dir, output: "" };
	const output = resolveVars(outputTemplate, baseVars);
	const vars: Record<string, string> = { input, stem, dir, output };

	return commandTemplates.map((tpl) => resolveVars(tpl, vars));
}

export function buildBatchCommands(
	files: string[],
	commandTemplates: string[],
	outputTemplate: string,
): Array<{ file: string; commands: string[] }> {
	return files.map((file) => ({
		file,
		commands: buildFileCommands(file, commandTemplates, outputTemplate),
	}));
}
