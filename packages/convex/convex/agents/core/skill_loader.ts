export type Skill = {
	name: string;
	version: string;
	description: string;
	body: string;
	examples?: string[];
};

export type SkillFileLoader = (fileName: string) => Promise<string>;

export async function loadSkill(
	skillName: string,
	readSkillFile: SkillFileLoader,
): Promise<Skill> {
	const content = await readSkillFile(`${skillName}.skill.md`);
	return parseSkillMd(content);
}

export function loadSkillFromRegistry(
	skillName: string,
	registry: Record<string, string>,
): Skill {
	const content = registry[skillName];
	if (!content) {
		throw new Error(`Skill not found: ${skillName}`);
	}
	return parseSkillMd(content);
}

export function parseSkillMd(content: string): Skill {
	const trimmed = content.trim();
	if (!trimmed.startsWith("---")) {
		throw new Error("Skill file missing frontmatter");
	}

	const lines = trimmed.split("\n");
	const frontmatter: Record<string, string> = {};
	let bodyStart = -1;
	let inFrontmatter = false;

	for (let i = 0; i < lines.length; i += 1) {
		const line = lines[i].trimEnd();
		if (line === "---") {
			if (!inFrontmatter) {
				inFrontmatter = true;
				continue;
			}
			bodyStart = i + 1;
			break;
		}

		if (inFrontmatter) {
			const separatorIndex = line.indexOf(":");
			if (separatorIndex === -1) continue;
			const key = line.slice(0, separatorIndex).trim();
			const value = line.slice(separatorIndex + 1).trim();
			if (key) {
				frontmatter[key] = value;
			}
		}
	}

	if (bodyStart === -1) {
		throw new Error("Skill file frontmatter not closed");
	}

	const name = frontmatter.name ?? "";
	const version = frontmatter.version ?? "";
	const description = frontmatter.description ?? "";
	const body = lines.slice(bodyStart).join("\n").trim();

	if (!name || !version || !description || !body) {
		throw new Error("Skill file missing required fields");
	}

	return { name, version, description, body };
}

export function injectSkill(skill: Skill): { role: "user"; content: string } {
	return {
		role: "user",
		content: `<skill name="${skill.name}" version="${skill.version}">\n${skill.body}\n</skill>`,
	};
}
