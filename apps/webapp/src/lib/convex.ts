import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    "Missing VITE_CONVEX_URL environment variable.\n" +
    "Get your Convex URL from https://dashboard.convex.dev"
  );
}

export const convex = new ConvexReactClient(convexUrl);