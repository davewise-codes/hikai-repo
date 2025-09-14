export interface PasswordResetEmailProps {
  code: string;
  expires: Date;
  appName?: string;
  userName?: string;
}

export function renderPasswordResetEmailTemplate(props: PasswordResetEmailProps): string {
  const { code, expires, appName = 'Hikai', userName } = props;
  const hoursUntilExpiry = Math.floor((+expires - Date.now()) / (60 * 60 * 1000));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your password for ${appName}</title>
</head>
<body style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #ffffff;">
    <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 24px; color: #111827; text-align: center;">
      Reset your password for ${appName}
    </h1>

    ${userName ? `<p style="font-size: 16px; color: #374151; margin-bottom: 16px;">Hi ${userName},</p>` : ''}

    <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
      You requested to reset your password for ${appName}. Please use the following verification code to create a new password.
    </p>

    <div style="text-align: center; background-color: #f9fafb; padding: 32px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 24px 0;">
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 12px; font-weight: 500;">
        Your password reset code
      </p>
      <div style="font-family: ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, monospace; font-size: 36px; font-weight: bold; color: #111827; letter-spacing: 0.3em; margin-bottom: 12px; padding: 16px; background-color: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; display: inline-block;">
        ${code}
      </div>
      <p style="font-size: 12px; color: #6b7280;">
        This code expires in ${hoursUntilExpiry} hours
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 16px;">
      If you didn't request a password reset, you can safely ignore this email. Your password won't be changed.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-bottom: 24px;">
      Having trouble? Reply to this email and we'll help you out.
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">

    <p style="font-size: 12px; color: #6b7280; text-align: center; margin-bottom: 8px;">
      This is an automated message from ${appName}. Please do not reply to this email address.
    </p>

    <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
      © 2025 ${appName}. All rights reserved.
    </p>
  </div>
</body>
</html>`;
}