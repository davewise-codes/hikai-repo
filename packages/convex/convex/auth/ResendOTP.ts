import { Email } from "@convex-dev/auth/providers/Email";
import { alphabet, generateRandomString } from "oslo/crypto";
import { renderVerificationEmailTemplate } from "./emailTemplate";

export const ResendOTP = Email({
  id: "resend-otp",
  apiKey: process.env.AUTH_RESEND_KEY!,
  maxAge: 60 * 20, // 20 minutes

  async generateVerificationToken() {
    return generateRandomString(8, alphabet("0-9"));
  },

  async sendVerificationRequest({
    identifier: email,
    provider,
    token,
    expires,
  }) {
    try {
      // Render email template
      const emailHtml = renderVerificationEmailTemplate({
        code: token,
        expires,
        appName: "Hikai",
      });

      // Use fetch to send via Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${provider.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.AUTH_EMAIL ?? "Hikai <hikai@hikai.pro>",
          to: [email],
          subject: `Verify your email for Hikai`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Resend API error:", errorText);
        throw new Error(`Failed to send verification email: ${errorText}`);
      }

      const result = await response.json();
      console.log("Verification email sent successfully:", result);

    } catch (error) {
      console.error("Error in ResendOTP.sendVerificationRequest:", error);
      throw new Error(error instanceof Error ? error.message : 'Failed to send verification email');
    }
  },
});