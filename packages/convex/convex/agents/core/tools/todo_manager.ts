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
};

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
	if (!Array.isArray(raw.items)) {
		throw new Error("todo_manager: items array is required");
	}
	if (raw.items.length > PLAN_MAX_ITEMS) {
		throw new Error(
			`todo_manager: plan cannot exceed ${PLAN_MAX_ITEMS} items`,
		);
	}
	const inProgressCount = raw.items.filter(
		(item) => item?.status === "in_progress",
	).length;
	if (inProgressCount > 1) {
		throw new Error("todo_manager: only one item can be in_progress");
	}
	for (const item of raw.items) {
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
		items: raw.items,
	};
}
