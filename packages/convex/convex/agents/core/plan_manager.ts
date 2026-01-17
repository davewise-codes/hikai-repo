export type PlanStatus = "pending" | "in_progress" | "completed" | "blocked";

export type PlanItem = {
	id: string;
	content: string;
	activeForm: string;
	status: PlanStatus;
	evidence?: string[];
	checkpoint?: unknown;
};

export type PlanItemInput = {
	id?: string;
	content: string;
	activeForm: string;
	status?: PlanStatus;
	evidence?: string[];
	checkpoint?: unknown;
};

export type PlanManager = {
	items: PlanItem[];
	maxItems: number;
	currentItem: PlanItem | null;
};

const MAX_ITEMS = 15;

export const PLAN_MAX_ITEMS = MAX_ITEMS;

export function createPlan(
	items: Array<{ content: string; activeForm: string }>,
): PlanManager {
	const trimmedItems: PlanItem[] = items.slice(0, MAX_ITEMS).map((item, index) => {
		const status: PlanStatus = index === 0 ? "in_progress" : "pending";
		return {
			id: `step-${index + 1}`,
			content: item.content,
			activeForm: item.activeForm,
			status,
		};
	});

	return {
		items: trimmedItems,
		maxItems: MAX_ITEMS,
		currentItem: trimmedItems.find((item) => item.status === "in_progress") ?? null,
	};
}

export function createPlanFromItems(items: PlanItemInput[]): PlanManager {
	const trimmedItems = items.slice(0, MAX_ITEMS).map((item, index) => ({
		id: item.id ?? `step-${index + 1}`,
		content: item.content,
		activeForm: item.activeForm,
		status: item.status ?? "pending",
		evidence: item.evidence,
		checkpoint: item.checkpoint,
	}));
	const normalized = normalizePlan(trimmedItems);

	return {
		items: normalized,
		maxItems: MAX_ITEMS,
		currentItem: normalized.find((item) => item.status === "in_progress") ?? null,
	};
}

export function updatePlan(
	plan: PlanManager,
	items: PlanItem[],
): PlanManager {
	const normalized = normalizePlan(items.slice(0, plan.maxItems));
	return {
		...plan,
		items: normalized,
		currentItem: normalized.find((item) => item.status === "in_progress") ?? null,
	};
}

export function renderPlan(plan: PlanManager): string {
	return plan.items
		.map((item) => {
			const icon =
				item.status === "completed"
					? "[x]"
					: item.status === "in_progress"
						? "[>]"
						: item.status === "blocked"
							? "[!]"
							: "[ ]";
			const suffix =
				item.status === "in_progress" ? ` <- ${item.activeForm}` : "";
			return `${icon} ${item.content}${suffix}`;
		})
		.join("\n");
}

function normalizePlan(items: PlanItem[]): PlanItem[] {
	const normalized = items.map((item) => ({
		...item,
		status: item.status ?? "pending",
	}));
	const inProgress = normalized.filter((item) => item.status === "in_progress");
	if (inProgress.length <= 1) return normalized;

	let found = false;
	return normalized.map((item) => {
		if (item.status !== "in_progress") return item;
		if (!found) {
			found = true;
			return item;
		}
		return { ...item, status: "pending" };
	});
}
