// import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

// Query para obtener el usuario actual autenticado
export const userList = query({
	args: {},
	handler: async (ctx) => {
		const users = await ctx.db.query("users");

		return users;
	},
});
