import type { AgentLoopSampling } from "./agent_loop";
import type { Skill } from "./skill_loader";
import { loadSkillFromRegistry } from "./skill_loader";
import { SKILL_CONTENTS } from "../skills";

export type AgentConfig = {
	maxTurns: number;
	timeoutMs: number;
	maxTokens?: number;
	maxTotalTokens?: number;
	sampling?: AgentLoopSampling;
};

export type AgentEntrypoint = {
	name: string;
	skill: Skill;
	defaultConfig: AgentConfig;
};

const ENTRYPOINTS: Record<string, AgentEntrypoint> = {
	structure_scout: {
		name: "structure_scout",
		skill: loadSkillFromRegistry("structure-scout", SKILL_CONTENTS),
		defaultConfig: {
			maxTurns: 8,
			timeoutMs: 90_000,
			maxTokens: 1800,
		},
	},
	glossary_scout: {
		name: "glossary_scout",
		skill: loadSkillFromRegistry("glossary-scout", SKILL_CONTENTS),
		defaultConfig: {
			maxTurns: 8,
			timeoutMs: 120_000,
			maxTokens: 2400,
		},
	},
	domain_mapper: {
		name: "domain_mapper",
		skill: loadSkillFromRegistry("domain-map-agent", SKILL_CONTENTS),
		defaultConfig: {
			maxTurns: 10,
			timeoutMs: 180_000,
			maxTokens: 3000,
		},
	},
	feature_scout: {
		name: "feature_scout",
		skill: loadSkillFromRegistry("feature-scout", SKILL_CONTENTS),
		defaultConfig: {
			maxTurns: 10,
			timeoutMs: 180_000,
			maxTokens: 3000,
		},
	},
};

export function getAgentEntrypoint(agentType: string): AgentEntrypoint {
	const entrypoint = ENTRYPOINTS[agentType];
	if (!entrypoint) {
		throw new Error(`Unknown agent entrypoint: ${agentType}`);
	}
	return entrypoint;
}

export const AGENT_ENTRYPOINTS = Object.values(ENTRYPOINTS);
