export type SurfaceSignalSurface =
	| "management"
	| "design"
	| "product_front"
	| "platform"
	| "marketing"
	| "admin"
	| "docs";

export type ContextSourceInput = {
	sourceType: string;
	sourceId: string;
	sourceLabel: string;
	structureSummary: unknown;
	surfaceSignals: Array<{
		surface: SurfaceSignalSurface;
		bucketId: string;
		evidence?: string[];
	}>;
};

export type SurfaceHint =
	| "product_front"
	| "platform"
	| "backend"
	| "admin"
	| "marketing"
	| "unknown";

export type ToolWarning = {
	code: string;
	message: string;
	source?: string;
};

export type UISitemapItem = {
	id: string;
	path: string;
	title: string;
	navGroup: "primary" | "secondary" | "none";
	requiresAuth: boolean;
	surfaceHint: SurfaceHint;
	source: { type: "router" | "nav" | "title_registry"; ref: string };
	flags?: string[];
};

export type UISitemap = {
	schema: "ui_sitemap_v1";
	productId: string;
	generatedAt: string;
	items: UISitemapItem[];
	warnings: ToolWarning[];
	cursor?: string;
};

export type UserFlowStep = {
	action: string;
	uiPageId?: string;
	source?: string;
};

export type UserFlow = {
	id: string;
	name: string;
	steps: UserFlowStep[];
	source: { type: "route_tree"; ref: string };
};

export type UserFlows = {
	schema: "user_flows_v1";
	productId: string;
	generatedAt: string;
	flows: UserFlow[];
	warnings: ToolWarning[];
};

export type BusinessAttribute = {
	name: string;
	type: "string" | "number" | "boolean" | "date" | "enum" | "ref" | "unknown";
	refEntityId?: string;
};

export type BusinessEntity = {
	id: string;
	displayName: string;
	description?: string;
	attributes: BusinessAttribute[];
	source: { type: "convex" | "orm" | "sql"; ref: string };
};

export type BusinessRelationship = {
	from: string;
	to: string;
	type: "1:1" | "1:N" | "N:N";
	via?: string;
	source: { type: "convex" | "orm" | "sql"; ref: string };
};

export type BusinessDataModel = {
	schema: "business_data_model_v1";
	productId: string;
	generatedAt: string;
	entities: BusinessEntity[];
	relationships: BusinessRelationship[];
	warnings: ToolWarning[];
};

export type RepoTreeNode = {
	path: string;
	type: "dir" | "file";
	depth: number;
	childrenCount: number;
};

export type SemanticFolder = {
	name: string;
	paths: string[];
	reason: string[];
	score: number;
};

export type RepoSurfaceTopology = {
	surface: SurfaceHint;
	rootPaths: string[];
	tree: RepoTreeNode[];
	semanticFolders: SemanticFolder[];
};

export type RepoTopology = {
	repoId: string;
	defaultBranch: string;
	surfaces: RepoSurfaceTopology[];
};

export type RepoFolderTopology = {
	schema: "repo_folder_topology_v1";
	productId: string;
	generatedAt: string;
	repos: RepoTopology[];
	warnings: ToolWarning[];
};

const ROUTE_IGNORE_PARTS = new Set([
	"__root",
	"_layout",
	"layout",
	"_",
]);

const UI_ROUTE_IGNORE_TOKENS = [
	"health",
	"debug",
	"internal",
	"storybook",
];

const AUTH_ROUTE_TOKENS = ["login", "signin", "signup", "oauth", "auth"];

const SEMANTIC_FOLDER_DENYLIST = new Set([
	"utils",
	"common",
	"shared",
	"lib",
	"types",
	"assets",
	"styles",
	"hooks",
	"components",
	"ui",
	"test",
	"tests",
	"__tests__",
	"fixtures",
	"scripts",
	"build",
	"dist",
	"node_modules",
	"coverage",
	"migrations",
]);

const SEMANTIC_FOLDER_PREFERRED_ROOTS = [
	"src/features",
	"src/modules",
	"src/domain",
	"packages",
];

const TECH_ENTITY_DENYLIST = new Set([
	"sessions",
	"session",
	"migrations",
	"migration",
	"audit",
	"logs",
	"log",
	"telemetry",
	"events",
	"aiusage",
	"_jobs",
]);

export function getUiSitemap(
	productId: string,
	sources: ContextSourceInput[],
	generatedAt = new Date().toISOString(),
): UISitemap {
	const warnings: ToolWarning[] = [];
	const items: UISitemap["items"] = [];
	const seenPaths = new Set<string>();

	for (const source of sources) {
		const structure = source.structureSummary as {
			routePaths?: string[];
			flowHints?: Array<{ path: string; kind: string; label: string }>;
		};
		const productFrontBuckets = source.surfaceSignals
			.filter((item) => item.surface === "product_front")
			.map((item) => item.bucketId);

		if (!structure?.routePaths?.length) continue;
		const filteredRoutes = filterPathsByBuckets(
			structure.routePaths,
			productFrontBuckets,
		);

		for (const routePath of filteredRoutes) {
			const uiPath = normalizeRoutePath(routePath);
			if (!uiPath) continue;
			if (seenPaths.has(uiPath)) continue;
			if (isIgnoredUiPath(uiPath)) continue;
			seenPaths.add(uiPath);

			const title = titleFromRoutePath(uiPath);
			items.push({
				id: buildUiId(uiPath),
				path: uiPath,
				title,
				navGroup: guessNavGroup(uiPath),
				requiresAuth: !isAuthRoute(uiPath),
				surfaceHint: "product_front",
				source: {
					type: "router",
					ref: routePath,
				},
				flags: isInternalRoute(uiPath) ? ["internal"] : undefined,
			});
		}
	}

	if (!items.length) {
		warnings.push({
			code: "ui_sitemap_empty",
			message: "No UI routes found in product_front buckets.",
		});
	}

	const limitedItems = items.slice(0, 200);
	const output: UISitemap = {
		schema: "ui_sitemap_v1",
		productId,
		generatedAt,
		items: limitedItems,
		warnings,
		cursor: items.length > limitedItems.length ? "truncated" : undefined,
	};

	return validateUiSitemap(output);
}

export function getUserFlows(
	productId: string,
	uiSitemap: UISitemap,
	_sources: ContextSourceInput[],
	generatedAt = new Date().toISOString(),
): UserFlows {
	const warnings: ToolWarning[] = [];
	const routes = uiSitemap.items.map((item) => item.path);
	const routeTree = buildRouteTree(routes);
	const flows: UserFlows["flows"] = [];
	const entryPoints = pickEntryRoutes(routes);

	for (const entry of entryPoints) {
		const steps = buildFlowSteps(entry, routeTree, uiSitemap);
		if (!steps.length) continue;
		flows.push({
			id: `flow_${sanitizeId(entry)}`,
			name: titleFromRoutePath(entry),
			steps: steps.slice(0, 20),
			source: { type: "route_tree", ref: entry },
		});
	}

	if (!flows.length) {
		warnings.push({
			code: "user_flows_empty",
			message: "No deterministic user flows found from route tree.",
		});
	}

	const output: UserFlows = {
		schema: "user_flows_v1",
		productId,
		generatedAt,
		flows: flows.slice(0, 20),
		warnings,
	};

	return validateUserFlows(output);
}

export function getBusinessDataModel(
	productId: string,
	sources: ContextSourceInput[],
	generatedAt = new Date().toISOString(),
): BusinessDataModel {
	const warnings: ToolWarning[] = [];
	const entities: BusinessDataModel["entities"] = [];
	const relationships: BusinessDataModel["relationships"] = [];
	const seenEntities = new Set<string>();

	for (const source of sources) {
		const platformBuckets = source.surfaceSignals
			.filter((item) => item.surface === "platform")
			.map((item) => item.bucketId);
		const structure = source.structureSummary as {
			fileSamples?: Array<{ path: string; excerpt: string }>;
		};
		if (!platformBuckets.length) {
			warnings.push({
				code: "business_model_no_platform_buckets",
				message: "No platform buckets available for business model extraction.",
				source: source.sourceId,
			});
			continue;
		}
		const samples = (structure?.fileSamples ?? []).filter((sample) =>
			platformBuckets.some((bucket) => sample.path.startsWith(bucket)),
		);

		if (!samples.length) {
			warnings.push({
				code: "business_model_missing_samples",
				message: "No schema samples found in platform buckets.",
				source: source.sourceId,
			});
			continue;
		}

		const convexEntities = extractConvexEntities(samples);
		const prismaEntities = extractPrismaEntities(samples);
		const sqlEntities = extractSqlEntities(samples);
		const drizzleEntities = extractDrizzleEntities(samples);
		const merged = [
			...convexEntities,
			...prismaEntities,
			...drizzleEntities,
			...sqlEntities,
		];

		for (const entity of merged) {
			if (entities.length >= 50) break;
			if (seenEntities.has(entity.id)) continue;
			if (isDeniedEntity(entity.id)) continue;
			seenEntities.add(entity.id);
			entities.push(entity);
		}
	}

	const entityMap = new Map(entities.map((entity) => [entity.id, entity]));
	for (const entity of entities) {
		for (const attribute of entity.attributes) {
			if (!attribute.refEntityId) continue;
			if (!entityMap.has(attribute.refEntityId)) continue;
			relationships.push({
				from: entity.id,
				to: attribute.refEntityId,
				type: "1:N",
				via: attribute.name,
				source: entity.source,
			});
		}
	}

	if (!entities.length) {
		warnings.push({
			code: "business_model_empty",
			message: "No business entities detected in platform buckets.",
		});
	}

	const output: BusinessDataModel = {
		schema: "business_data_model_v1",
		productId,
		generatedAt,
		entities,
		relationships,
		warnings,
	};

	return validateBusinessDataModel(output);
}

export function getRepoFolderTopology(
	productId: string,
	sources: ContextSourceInput[],
	generatedAt = new Date().toISOString(),
): RepoFolderTopology {
	const warnings: ToolWarning[] = [];
	const repos: RepoFolderTopology["repos"] = [];

	for (const source of sources) {
		const structure = source.structureSummary as {
			folderTree?: Array<{ name: string; children?: Array<any> }>;
			defaultBranch?: string;
		};
		const folderTree = structure?.folderTree ?? [];
		const baseTree = buildTreeIndex(folderTree);

		const surfaces = collectTopologySurfaces(source);
		if (!surfaces.length) {
			warnings.push({
				code: "repo_topology_no_surfaces",
				message: "No product_front or platform buckets available.",
				source: source.sourceId,
			});
		}

		repos.push({
			repoId: source.sourceId,
			defaultBranch: structure?.defaultBranch ?? "unknown",
			surfaces: surfaces.map((surface) => {
				const tree = buildSurfaceTree(surface.rootPaths, baseTree, 4);
				const semanticFolders = buildSemanticFolders(
					surface.rootPaths,
					baseTree,
				);
				return {
					surface: surface.surface,
					rootPaths: surface.rootPaths,
					tree,
					semanticFolders,
				};
			}),
		});
	}

	const output: RepoFolderTopology = {
		schema: "repo_folder_topology_v1",
		productId,
		generatedAt,
		repos,
		warnings,
	};

	return validateRepoFolderTopology(output);
}

export function buildProductContextInputs(
	productId: string,
	sources: ContextSourceInput[],
	generatedAt = new Date().toISOString(),
): {
	uiSitemap: UISitemap;
	userFlows: UserFlows;
	businessDataModel: BusinessDataModel;
	repoFolderTopology: RepoFolderTopology;
} {
	const uiSitemap = getUiSitemap(productId, sources, generatedAt);
	const userFlows = getUserFlows(productId, uiSitemap, sources, generatedAt);
	const businessDataModel = getBusinessDataModel(productId, sources, generatedAt);
	const repoFolderTopology = getRepoFolderTopology(productId, sources, generatedAt);

	return { uiSitemap, userFlows, businessDataModel, repoFolderTopology };
}

export const build_product_context_inputs = buildProductContextInputs;

function validateUiSitemap(output: UISitemap): UISitemap {
	if (
		output.schema !== "ui_sitemap_v1" ||
		!isNonEmptyString(output.productId) ||
		!Array.isArray(output.items) ||
		!Array.isArray(output.warnings)
	) {
		return {
			schema: "ui_sitemap_v1",
			productId: output.productId ?? "unknown",
			generatedAt: output.generatedAt ?? new Date().toISOString(),
			items: [],
			warnings: [
				...(output.warnings ?? []),
				{ code: "schema_validation_failed", message: "Invalid ui_sitemap_v1 output." },
			],
		};
	}
	return output;
}

function validateUserFlows(output: UserFlows): UserFlows {
	if (
		output.schema !== "user_flows_v1" ||
		!isNonEmptyString(output.productId) ||
		!Array.isArray(output.flows) ||
		!Array.isArray(output.warnings)
	) {
		return {
			schema: "user_flows_v1",
			productId: output.productId ?? "unknown",
			generatedAt: output.generatedAt ?? new Date().toISOString(),
			flows: [],
			warnings: [
				...(output.warnings ?? []),
				{ code: "schema_validation_failed", message: "Invalid user_flows_v1 output." },
			],
		};
	}
	return output;
}

function validateBusinessDataModel(output: BusinessDataModel): BusinessDataModel {
	if (
		output.schema !== "business_data_model_v1" ||
		!isNonEmptyString(output.productId) ||
		!Array.isArray(output.entities) ||
		!Array.isArray(output.relationships) ||
		!Array.isArray(output.warnings)
	) {
		return {
			schema: "business_data_model_v1",
			productId: output.productId ?? "unknown",
			generatedAt: output.generatedAt ?? new Date().toISOString(),
			entities: [],
			relationships: [],
			warnings: [
				...(output.warnings ?? []),
				{
					code: "schema_validation_failed",
					message: "Invalid business_data_model_v1 output.",
				},
			],
		};
	}
	return output;
}

function validateRepoFolderTopology(output: RepoFolderTopology): RepoFolderTopology {
	if (
		output.schema !== "repo_folder_topology_v1" ||
		!isNonEmptyString(output.productId) ||
		!Array.isArray(output.repos) ||
		!Array.isArray(output.warnings)
	) {
		return {
			schema: "repo_folder_topology_v1",
			productId: output.productId ?? "unknown",
			generatedAt: output.generatedAt ?? new Date().toISOString(),
			repos: [],
			warnings: [
				...(output.warnings ?? []),
				{
					code: "schema_validation_failed",
					message: "Invalid repo_folder_topology_v1 output.",
				},
			],
		};
	}
	return output;
}

function isNonEmptyString(value: string | undefined): boolean {
	return typeof value === "string" && value.trim().length > 0;
}

function filterPathsByBuckets(paths: string[], buckets: string[]): string[] {
	if (!paths?.length) return [];
	if (!buckets?.length) return [];
	return paths.filter((path) => buckets.some((bucket) => path.startsWith(bucket)));
}

function normalizeRoutePath(filePath: string): string | null {
	const normalized = filePath.replace(/\\/g, "/");
	const routeIndex = normalized.indexOf("/routes/");
	if (routeIndex === -1) return null;
	const relative = normalized.slice(routeIndex + "/routes/".length);
	const parts = relative.split("/").filter(Boolean);
	const segments: string[] = [];

	for (const part of parts) {
		const withoutExt = part.replace(/\.(ts|tsx|js|jsx)$/i, "");
		if (!withoutExt || ROUTE_IGNORE_PARTS.has(withoutExt)) continue;
		if (withoutExt === "index") continue;
		if (withoutExt.startsWith("$")) {
			segments.push(`:${withoutExt.slice(1)}`);
			continue;
		}
		segments.push(withoutExt);
	}

	return `/${segments.join("/")}`.replace(/\/+/g, "/");
}

function titleFromRoutePath(path: string): string {
	if (path === "/") return "Home";
	const last = path.split("/").filter(Boolean).slice(-1)[0] ?? "";
	const cleaned = last.replace(/[:_]/g, " ");
	return cleaned
		.split(/[-\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function buildUiId(path: string): string {
	return `ui_${sanitizeId(path)}`;
}

function sanitizeId(value: string): string {
	return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function guessNavGroup(path: string): "primary" | "secondary" | "none" {
	if (path.startsWith("/settings")) return "secondary";
	if (path === "/" || path.startsWith("/app") || path.startsWith("/products")) {
		return "primary";
	}
	return "none";
}

function isAuthRoute(path: string): boolean {
	return AUTH_ROUTE_TOKENS.some((token) => path.includes(token));
}

function isInternalRoute(path: string): boolean {
	return UI_ROUTE_IGNORE_TOKENS.some((token) => path.includes(token));
}

function isIgnoredUiPath(path: string): boolean {
	if (!path || path === "/") return false;
	return UI_ROUTE_IGNORE_TOKENS.some((token) => path.includes(token));
}

function buildRouteTree(paths: string[]): Map<string, Set<string>> {
	const tree = new Map<string, Set<string>>();
	for (const path of paths) {
		const segments = path.split("/").filter(Boolean);
		let current = "";
		for (const segment of segments) {
			const parent = current || "/";
			current = `${current}/${segment}`.replace(/\/+/g, "/");
			if (!tree.has(parent)) {
				tree.set(parent, new Set());
			}
			tree.get(parent)?.add(current);
		}
	}
	return tree;
}

function pickEntryRoutes(paths: string[]): string[] {
	const entries = paths.filter((path) => {
		const segments = path.split("/").filter(Boolean);
		return segments.length <= 3;
	});
	const sorted = entries.sort((a, b) => a.localeCompare(b));
	return sorted.slice(0, 12);
}

function buildFlowSteps(
	entry: string,
	routeTree: Map<string, Set<string>>,
	sitemap: UISitemap,
): Array<{ action: string; uiPageId?: string; source?: string }> {
	const steps: Array<{ action: string; uiPageId?: string; source?: string }> = [];
	const lookup = new Map(sitemap.items.map((item) => [item.path, item]));
	const addStep = (path: string) => {
		const item = lookup.get(path);
		steps.push({
			action: item?.title ?? titleFromRoutePath(path),
			uiPageId: item?.id,
			source: path,
		});
	};

	addStep(entry);
	const children = Array.from(routeTree.get(entry) ?? []);
	children.sort();
	for (const child of children.slice(0, 4)) {
		addStep(child);
	}
	return steps;
}

function extractConvexEntities(samples: Array<{ path: string; excerpt: string }>) {
	const entities: BusinessDataModel["entities"] = [];
	for (const sample of samples) {
		if (!sample.path.endsWith("schema.ts")) continue;
		const matches = sample.excerpt.matchAll(/(\w+)\s*:\s*defineTable\(/g);
		for (const match of matches) {
			const name = match[1];
			const id = toPascalCase(name);
			entities.push({
				id,
				displayName: id,
				attributes: extractConvexAttributes(sample.excerpt),
				source: { type: "convex", ref: sample.path },
			});
		}
	}
	return entities;
}

function extractConvexAttributes(excerpt: string) {
	const attributes: BusinessDataModel["entities"][number]["attributes"] = [];
	const matches = excerpt.matchAll(/(\w+)\s*:\s*v\.(string|number|boolean|id|array|object|optional)/g);
	for (const match of matches) {
		const name = match[1];
		const typeToken = match[2];
		const type = mapFieldType(typeToken);
		const refEntityId = name.endsWith("Id") ? toPascalCase(name.slice(0, -2)) : undefined;
		attributes.push({ name, type, refEntityId });
		if (attributes.length >= 12) break;
	}
	return attributes;
}

function extractPrismaEntities(samples: Array<{ path: string; excerpt: string }>) {
	const entities: BusinessDataModel["entities"] = [];
	for (const sample of samples) {
		if (!sample.path.endsWith("schema.prisma")) continue;
		const matches = sample.excerpt.matchAll(/model\s+(\w+)\s+\{([\s\S]*?)\}/g);
		for (const match of matches) {
			const name = match[1];
			const fields = match[2] ?? "";
			entities.push({
				id: name,
				displayName: name,
				attributes: extractPrismaAttributes(fields),
				source: { type: "orm", ref: sample.path },
			});
		}
	}
	return entities;
}

function extractPrismaAttributes(fields: string) {
	const attributes: BusinessDataModel["entities"][number]["attributes"] = [];
	const lines = fields.split("\n");
	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("@@")) continue;
		const [name, typeToken] = trimmed.split(/\s+/);
		if (!name || !typeToken) continue;
		const type = mapFieldType(typeToken);
		const refEntityId = typeToken.endsWith("Id") ? toPascalCase(typeToken.slice(0, -2)) : undefined;
		attributes.push({ name, type, refEntityId });
		if (attributes.length >= 12) break;
	}
	return attributes;
}

function extractSqlEntities(samples: Array<{ path: string; excerpt: string }>) {
	const entities: BusinessDataModel["entities"] = [];
	for (const sample of samples) {
		if (!sample.path.endsWith(".sql")) continue;
		const matches = sample.excerpt.matchAll(/create table\s+(\w+)/gi);
		for (const match of matches) {
			const name = match[1];
			const id = toPascalCase(name);
			entities.push({
				id,
				displayName: id,
				attributes: [],
				source: { type: "sql", ref: sample.path },
			});
		}
	}
	return entities;
}

function extractDrizzleEntities(samples: Array<{ path: string; excerpt: string }>) {
	const entities: BusinessDataModel["entities"] = [];
	for (const sample of samples) {
		if (!sample.path.endsWith(".ts") && !sample.path.endsWith(".tsx")) continue;
		const matches = sample.excerpt.matchAll(/(pgTable|mysqlTable|sqliteTable)\(\s*"(\w+)"/g);
		for (const match of matches) {
			const name = match[2];
			const id = toPascalCase(name);
			entities.push({
				id,
				displayName: id,
				attributes: [],
				source: { type: "orm", ref: sample.path },
			});
		}
	}
	return entities;
}

function mapFieldType(token: string): "string" | "number" | "boolean" | "date" | "enum" | "ref" | "unknown" {
	const normalized = token.toLowerCase();
	if (normalized.includes("string")) return "string";
	if (normalized.includes("number") || normalized.includes("int") || normalized.includes("float")) return "number";
	if (normalized.includes("bool")) return "boolean";
	if (normalized.includes("date") || normalized.includes("time")) return "date";
	if (normalized.includes("enum")) return "enum";
	if (normalized.includes("id")) return "ref";
	return "unknown";
}

function toPascalCase(value: string): string {
	return value
		.replace(/[_-]+/g, " ")
		.split(" ")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join("");
}

function isDeniedEntity(name: string): boolean {
	return TECH_ENTITY_DENYLIST.has(name.toLowerCase());
}

function collectTopologySurfaces(source: ContextSourceInput) {
	const surfaces = source.surfaceSignals.filter((item) =>
		["product_front", "platform"].includes(item.surface),
	);
	const grouped = new Map<SurfaceHint, Set<string>>();
	for (const item of surfaces) {
		const surface = item.surface === "platform" ? "platform" : "product_front";
		if (!grouped.has(surface)) grouped.set(surface, new Set());
		grouped.get(surface)?.add(item.bucketId);
	}
	return Array.from(grouped.entries()).map(([surface, bucketIds]) => ({
		surface,
		rootPaths: Array.from(bucketIds).sort(),
	}));
}

function buildTreeIndex(folderTree: Array<{ name: string; children?: Array<any> }>) {
	const index = new Map<string, { depth: number; children: string[]; hasIndex: boolean }>();
	const walk = (nodes: Array<{ name: string; children?: Array<any> }>, parent: string, depth: number) => {
		for (const node of nodes) {
			const path = parent ? `${parent}/${node.name}` : node.name;
			const children = (node.children ?? []).map((child: any) => child.name as string);
			const hasIndex = (node.children ?? []).some((child: any) =>
				/^(index|exports)\.(ts|tsx|js|jsx)$/.test(child.name),
			);
			index.set(path, { depth, children, hasIndex });
			if (node.children?.length) {
				walk(node.children, path, depth + 1);
			}
		}
	};
	walk(folderTree, "", 1);
	return index;
}

function buildSurfaceTree(
	rootPaths: string[],
	index: Map<string, { depth: number; children: string[]; hasIndex: boolean }>,
	maxDepth: number,
) {
	const nodes: Array<{ path: string; type: "dir" | "file"; depth: number; childrenCount: number }> = [];
	for (const root of rootPaths) {
		for (const [path, info] of index.entries()) {
			if (!path.startsWith(root)) continue;
			const relativeDepth = info.depth - root.split("/").length + 1;
			if (relativeDepth < 0 || relativeDepth > maxDepth) continue;
			nodes.push({
				path,
				type: isFilePath(path) ? "file" : "dir",
				depth: relativeDepth,
				childrenCount: info.children.length,
			});
		}
	}
	return nodes.sort((a, b) => a.path.localeCompare(b.path)).slice(0, 200);
}

function buildSemanticFolders(
	rootPaths: string[],
	index: Map<string, { depth: number; children: string[]; hasIndex: boolean }>,
) {
	const folders: Array<{ name: string; paths: string[]; reason: string[]; score: number }> = [];
	for (const [path, info] of index.entries()) {
		if (!rootPaths.some((root) => path.startsWith(root))) continue;
		const name = path.split("/").slice(-1)[0] ?? "";
		if (isFilePath(name)) continue;
		if (!name || SEMANTIC_FOLDER_DENYLIST.has(name)) continue;
		if (!/^[a-z0-9_-]{3,24}$/i.test(name)) continue;
		const reason: string[] = [];
		let score = 0;
		if (SEMANTIC_FOLDER_PREFERRED_ROOTS.some((root) => path.includes(root))) {
			score += 0.4;
			reason.push("under_preferred_root");
		}
		score += 0.3;
		reason.push("not_in_denylist");
		if (info.depth >= 2 && info.depth <= 5) {
			score += 0.2;
			reason.push("depth_2_5");
		}
		if (info.hasIndex) {
			score += 0.1;
			reason.push("has_index");
		}
		folders.push({
			name,
			paths: [path],
			reason,
			score: Math.min(1, Number(score.toFixed(2))),
		});
	}
	return folders.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, 30);
}

function isFilePath(path: string): boolean {
	return /\.[a-z0-9]{1,6}$/i.test(path);
}
