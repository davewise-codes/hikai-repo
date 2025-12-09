import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import { routeTree } from "./routeTree.gen";
import { hybridStorage } from "./lib/hybrid-storage";
import "./styles/globals.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
	throw new Error("Missing VITE_CONVEX_URL environment variable");
}

const convex = new ConvexReactClient(convexUrl);

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {

	interface Register {
		router: typeof router;
	}
}

ReactDOM.createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ConvexAuthProvider client={convex} storage={hybridStorage}>
			<RouterProvider router={router} />
		</ConvexAuthProvider>
	</StrictMode>,
);
