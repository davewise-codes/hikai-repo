import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import {
	createPlanFromItems,
	updatePlan,
	PLAN_MAX_ITEMS,
	type PlanItem,
	type PlanItemInput,
	type PlanManager,
} from "../plan_manager";
import type { ToolDefinition } from "../tool_registry";

type TodoManagerInput = {
	items: PlanItemInput[];
	tasks?: PlanItemInput[];
};

type RawPlanItem = {
	id?: string | number;
	status?: string;
	content?: string;
	activeForm?: string;
	task?: string;
	title?: string;
	notes?: string;
	evidence?: string | string[];
	checkpoint?: string;
};

const TODO_MANAGER_SCHEMA = {
	type: "object",
	additionalProperties: false,
	oneOf: [
		{ type: "object", required: ["items"] },
		{ type: "object", required: ["tasks"] },
	],
	properties: {
		productId: { type: "string" },
		items: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: { type: "string" },
					status: { type: "string" },
					content: { type: "string" },
					activeForm: { type: "string" },
					description: { type: "string" },
					task: { type: "string" },
					title: { type: "string" },
					notes: { type: "string" },
					evidence: {
						oneOf: [
							{ type: "string" },
							{ type: "array", items: { type: "string" } },
						],
					},
					checkpoint: { type: "string" },
				},
			},
		},
		tasks: {
			type: "array",
			items: {
				type: "object",
				additionalProperties: false,
				properties: {
					id: { type: "string" },
					status: { type: "string" },
					content: { type: "string" },
					activeForm: { type: "string" },
					description: { type: "string" },
					task: { type: "string" },
					title: { type: "string" },
					notes: { type: "string" },
					evidence: {
						oneOf: [
							{ type: "string" },
							{ type: "array", items: { type: "string" } },
						],
					},
					checkpoint: { type: "string" },
				},
			},
		},
	},
} as const;

export function createTodoManagerTool(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
): ToolDefinition {
	let plan: PlanManager | null = null;

	return {
		name: "todo_manager",
		description:
			"Update execution plan. Send the COMPLETE list of items with status.",
		inputSchema: TODO_MANAGER_SCHEMA,
		execute: async (input) => {
			const parsed = parseTodoManagerInput(input);
			const normalizedItems: PlanItem[] = parsed.items.map((item, index) => ({
				id: item.id ?? `step-${index + 1}`,
				content: item.content,
				activeForm: item.activeForm,
				status: item.status ?? "pending",
				evidence: item.evidence,
				checkpoint: item.checkpoint,
			}));
			plan = plan
				? updatePlan(plan, normalizedItems)
				: createPlanFromItems(normalizedItems);

			await ctx.runMutation(internal.agents.agentRuns.appendStep, {
				productId,
				runId,
				step: "plan_update",
				status: "info",
				metadata: { plan },
			});

			return plan;
		},
	};
}

function parseTodoManagerInput(input: unknown): TodoManagerInput {
	if (!input || typeof input !== "object") {
		throw new Error("todo_manager: invalid input");
	}
	const raw = input as Partial<TodoManagerInput>;
	const items = raw.items ?? raw.tasks;
	if (!Array.isArray(items)) {
		throw new Error("todo_manager: items array is required");
	}
	if (items.length > PLAN_MAX_ITEMS) {
		throw new Error(
			`todo_manager: plan cannot exceed ${PLAN_MAX_ITEMS} items`,
		);
	}
	const normalized = items.map((item) => normalizeItem(item));
	const inProgressCount = normalized.filter(
		(item) => item?.status === "in_progress",
	).length;
	if (inProgressCount > 1) {
		throw new Error("todo_manager: only one item can be in_progress");
	}
	for (const item of normalized) {
		if (
			item?.status &&
			item.status !== "pending" &&
			item.status !== "in_progress" &&
			item.status !== "completed" &&
			item.status !== "blocked"
		) {
			throw new Error("todo_manager: invalid status value");
		}
		if (!item?.content || item.content.trim().length === 0) {
			throw new Error("todo_manager: items require content");
		}
		if (!item?.activeForm || item.activeForm.trim().length === 0) {
			throw new Error(
				"todo_manager: items require activeForm in present tense",
			);
		}
	}
	return {
		items: normalized,
	};
}

function normalizeItem(input: PlanItemInput | RawPlanItem): PlanItemInput {
	const raw = input as RawPlanItem;
	const content = raw.content ?? raw.task ?? raw.title ?? raw.description ?? "";
	const activeForm = raw.activeForm ?? raw.notes ?? raw.description ?? content;
	const status = normalizeStatus(raw.status);
	const evidence = raw.evidence;
	return {
		id: raw.id ? String(raw.id) : undefined,
		content,
		activeForm,
		status,
		evidence,
		checkpoint: raw.checkpoint,
	};
}

function normalizeStatus(status?: string): PlanItemInput["status"] {
	if (!status) return "pending";
	switch (status) {
		case "pending":
		case "in_progress":
		case "completed":
		case "blocked":
			return status;
		case "not_started":
		case "todo":
			return "pending";
		case "doing":
		case "in-progress":
			return "in_progress";
		case "done":
		case "complete":
			return "completed";
		default:
			return status as PlanItemInput["status"];
	}
}
