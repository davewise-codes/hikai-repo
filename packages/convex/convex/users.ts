import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

// Mutation para actualizar el perfil del usuario
export const updateUserProfile = mutation({
	args: {
		name: v.string(),
	},
	handler: async (ctx, { name }) => {
		const userId = await getAuthUserId(ctx);

		if (!userId) {
			throw new Error("Not authenticated");
		}

		const trimmedName = name.trim();
		if (!trimmedName) {
			throw new Error("Name cannot be empty");
		}

		await ctx.db.patch(userId, { name: trimmedName });

		return { success: true };
	},
});
