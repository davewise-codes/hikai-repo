const FRAMEWORK_PATTERNS: Record<string, string[]> = {
	React: ["react", "react-dom"],
	"Next.js": ["next"],
	Vite: ["vite"],
	Convex: ["convex", "@convex-dev/agent"],
	TailwindCSS: ["tailwindcss"],
	TypeScript: ["typescript"],
	"Node.js": ["@types/node"],
	Express: ["express"],
	Fastify: ["fastify"],
	Vue: ["vue"],
	Angular: ["@angular/core"],
	Svelte: ["svelte"],
	Prisma: ["prisma", "@prisma/client"],
	Drizzle: ["drizzle-orm"],
	tRPC: ["@trpc/server"],
	GraphQL: ["graphql", "@apollo/client"],
	Zustand: ["zustand"],
	Redux: ["@reduxjs/toolkit", "redux"],
	"TanStack Query": ["@tanstack/react-query"],
	"TanStack Router": ["@tanstack/react-router"],
};

type PackageJson = {
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
};

export function detectStackFromPackageJson(pkg: PackageJson): string[] {
	const deps = { ...pkg.dependencies, ...pkg.devDependencies };
	const detected: string[] = [];

	for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
		if (patterns.some((pattern) => Boolean(deps[pattern]))) {
			detected.push(framework);
		}
	}

	return detected;
}
