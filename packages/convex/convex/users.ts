import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

// Query para obtener el usuario actual autenticado
export const currentUser = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);

		if (!userId) {
			return null;
		}

		try {
			const user = await ctx.db.get(userId);
			return user;
		} catch (error) {
			console.error("Error getting user:", error);
			return null;
		}
	},
});
