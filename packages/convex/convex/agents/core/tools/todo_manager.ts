import type { ActionCtx } from "../../../_generated/server";
import type { Id } from "../../../_generated/dataModel";
import { internal } from "../../../_generated/api";
import {
	createPlan,
	updatePlan,
	type PlanItem,
	type PlanManager,
	type PlanStatus,
} from "../plan_manager";
import type { ToolDefinition } from "../tool_registry";

type TodoManagerAction = "create" | "update" | "complete" | "list";

type TodoManagerInput = {
	action: TodoManagerAction;
	items?: Array<{
		id?: string;
		content: string;
		activeForm: string;
		status?: PlanStatus;
	}>;
	itemId?: string;
};

const MAX_PLAN_ITEMS = 15;

export function createTodoManagerTool(
	ctx: ActionCtx,
	productId: Id<"products">,
	runId: Id<"agentRuns">,
): ToolDefinition {
	let plan: PlanManager | null = null;

	return {
		name: "todo_manager",
		description: "Create and update execution plan for the current task",
		execute: async (input) => {
			const parsed = parseTodoManagerInput(input);

			switch (parsed.action) {
				case "create": {
					const items = (parsed.items ?? []).map((item) => ({
						content: item.content,
						activeForm: item.activeForm,
					}));
					plan = createPlan(items);
					break;
				}
				case "update": {
					ensurePlan(plan);
					const normalizedItems = (parsed.items ?? []).map((item, index) => ({
						id: item.id ?? `step-${index + 1}`,
						content: item.content,
						activeForm: item.activeForm,
						status: item.status ?? "pending",
					}));
					plan = updatePlan(plan, normalizedItems);
					break;
				}
				case "complete": {
					ensurePlan(plan);
					if (!parsed.itemId) {
						throw new Error("itemId is required for complete action");
					}
					plan = updatePlan(
						plan,
						plan.items.map((item) =>
							item.id === parsed.itemId
								? { ...item, status: "completed" }
								: item,
						),
					);
					break;
				}
				case "list": {
					ensurePlan(plan);
					break;
				}
			}

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
		throw new Error("Invalid todo_manager input");
	}
	const raw = input as Partial<TodoManagerInput>;
	const action = raw.action;
	if (!action) {
		throw new Error("todo_manager action is required");
	}
	if (raw.items) {
		if (raw.items.length > MAX_PLAN_ITEMS) {
			throw new Error(
				`todo_manager: plan cannot exceed ${MAX_PLAN_ITEMS} items`,
			);
		}
		const inProgressCount = raw.items.filter(
			(item) => item.status === "in_progress",
		).length;
		if (inProgressCount > 1) {
			throw new Error("todo_manager: only one item can be in_progress");
		}
		for (const item of raw.items) {
			if (!item?.activeForm || item.activeForm.trim().length === 0) {
				throw new Error(
					"todo_manager: items require activeForm in present tense",
				);
			}
		}
	}
	return {
		action,
		items: raw.items,
		itemId: raw.itemId,
	};
}

function ensurePlan(plan: PlanManager | null): asserts plan is PlanManager {
	if (!plan) {
		throw new Error("Plan not created");
	}
}
