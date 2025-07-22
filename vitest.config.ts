import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "jsdom",
		exclude: [...configDefaults.exclude, "apps/**"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
		},
	},
});
