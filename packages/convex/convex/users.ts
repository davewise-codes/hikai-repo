import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

// Query para obtener el usuario actual autenticado
export const currentUser = query({
	args: {},
	handler: async (ctx) => {
		const userId = await getAuthUserId(ctx);

		// Validar que userId sea válido antes de intentar obtener el usuario
		if (!userId || userId === null) {
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

// Query para listar todos los usuarios (debug/admin)
export const userList = query({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users");

		return users;
	},
});
