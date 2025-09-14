import { Password } from "@convex-dev/auth/providers/Password";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { ResendOTP } from "./auth/ResendOTP";
import { ResendOTPReset } from "./auth/ResendOTPReset";

export const { auth, signIn, signOut, store } = convexAuth({
	providers: [
		GitHub,
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
});
