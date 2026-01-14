import { describe, expect, it } from "vitest";
import {
	getBusinessDataModel,
	getRepoFolderTopology,
	getUiSitemap,
	getUserFlows,
	type ContextSourceInput,
} from "../contextTools";

const baseSource: ContextSourceInput = {
	sourceType: "github",
	sourceId: "org/repo",
	sourceLabel: "org/repo",
	structureSummary: {
		routePaths: [
			"apps/webapp/src/routes/app/$orgSlug/$productSlug/timeline.tsx",
			"apps/webapp/src/routes/login.tsx",
		],
		folderTree: [
			{
				name: "apps",
				children: [
					{
						name: "webapp",
						children: [
							{
								name: "src",
								children: [
									{ name: "billing", children: [{ name: "index.ts" }] },
								],
							},
						],
					},
				],
			},
		],
		fileSamples: [
			{
				path: "packages/convex/convex/schema.ts",
				excerpt: `export default defineSchema({\n  users: defineTable({\n    name: v.string(),\n    organizationId: v.id(\"organizations\"),\n  })\n});`,
			},
		],
		defaultBranch: "main",
	},
	surfaceSignals: [
		{ surface: "product_front", bucketId: "apps/webapp" },
		{ surface: "platform", bucketId: "packages/convex" },
	],
};

describe("getUiSitemap", () => {
	it("returns sitemap items from product_front routes", () => {
		const result = getUiSitemap("prod_1", [baseSource]);
		const paths = result.items.map((item) => item.path);
		expect(paths).toContain("/app/:orgSlug/:productSlug/timeline");
		expect(paths).toContain("/login");
		expect(result.warnings.length).toBe(0);
	});

	it("returns warnings when no routes are found", () => {
		const result = getUiSitemap("prod_1", [{
			...baseSource,
			structureSummary: {},
		}]);
		expect(result.items.length).toBe(0);
		expect(result.warnings[0]?.code).toBe("ui_sitemap_empty");
	});
});

describe("getUserFlows", () => {
	it("builds flows from sitemap routes", () => {
		const uiSitemap = getUiSitemap("prod_1", [baseSource]);
		const result = getUserFlows("prod_1", uiSitemap, [baseSource]);
		expect(result.flows.length).toBeGreaterThan(0);
		expect(result.warnings.length).toBe(0);
	});

	it("returns warnings when no flows exist", () => {
		const emptySitemap = getUiSitemap("prod_1", [{
			...baseSource,
			structureSummary: {},
		}]);
		const result = getUserFlows("prod_1", emptySitemap, [baseSource]);
		expect(result.flows.length).toBe(0);
		expect(result.warnings[0]?.code).toBe("user_flows_empty");
	});
});

describe("getBusinessDataModel", () => {
	it("extracts entities from platform schema samples", () => {
		const result = getBusinessDataModel("prod_1", [baseSource]);
		expect(result.entities.length).toBeGreaterThan(0);
		expect(result.entities[0]?.id).toBe("Users");
	});

	it("returns warnings when no schema samples exist", () => {
		const result = getBusinessDataModel("prod_1", [{
			...baseSource,
			structureSummary: { fileSamples: [] },
		}]);
		expect(result.entities.length).toBe(0);
		expect(result.warnings.map((warning) => warning.code)).toContain(
			"business_model_empty",
		);
	});
});

describe("getRepoFolderTopology", () => {
	it("returns topology for product_front and platform buckets", () => {
		const result = getRepoFolderTopology("prod_1", [baseSource]);
		expect(result.repos.length).toBe(1);
		expect(result.repos[0]?.surfaces.length).toBeGreaterThan(0);
	});

	it("returns warnings when no surfaces are available", () => {
		const result = getRepoFolderTopology("prod_1", [{
			...baseSource,
			surfaceSignals: [],
		}]);
		expect(result.warnings[0]?.code).toBe("repo_topology_no_surfaces");
	});
});
