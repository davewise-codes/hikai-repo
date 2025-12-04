import { Password } from "@convex-dev/auth/providers/Password";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./auth/ResendOTP";
import { ResendOTPReset } from "./auth/ResendOTPReset";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const { auth, signIn, signOut, store } = convexAuth({
	providers: [
		GitHub({
			clientId: process.env.AUTH_GITHUB_ID,
			clientSecret: process.env.AUTH_GITHUB_SECRET,
		}),
		Google({
			clientId: process.env.AUTH_GOOGLE_ID,
			clientSecret: process.env.AUTH_GOOGLE_SECRET,
			authorization: {
				params: {
					scope: "openid email profile",
				},
			},
		}),
		Password({
			verify: ResendOTP,
			reset: ResendOTPReset,
		}),
	],
	callbacks: {
		async afterUserCreatedOrUpdated(ctx, args) {
			// Solo para usuarios nuevos (existingUserId es null)
			if (args.existingUserId) {
				return;
			}

			// Llamar a la internal mutation para crear org personal
			await ctx.runMutation(internal.organizations.organizations.createPersonalOrg, {
				userId: args.userId as Id<"users">,
			});
		},
	},
});
