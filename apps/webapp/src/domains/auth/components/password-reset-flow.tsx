import React, { useState } from "react";
import { Button, Input, Label, Form, FormField, Eye, EyeOff } from "@hikai/ui";
import type { PasswordResetRequestData } from "../hooks/use-auth";
import { useTranslation } from "react-i18next";
import { isValidVerificationCode, isValidPassword, formatVerificationCode, sanitizeCodeInput } from "../utils/validation";

type PasswordResetStep = "request" | "verify" | "reset";

interface PasswordResetFlowProps {
	onRequestReset: (data: PasswordResetRequestData) => Promise<{ success: boolean }>;
	onVerifyCode: (data: { email: string; code: string }) => Promise<{ success: boolean }>;
	onResetPassword: (data: { email: string; code: string; password: string }) => Promise<{ success: boolean }>;
	onCancel: () => void;
	onSuccess: () => void;
	isLoading?: boolean;
	error?: string;
}

export function PasswordResetFlow({
	onRequestReset,
	onVerifyCode,
	onResetPassword,
	onCancel,
	onSuccess,
	isLoading = false,
	error,
}: PasswordResetFlowProps) {
	const [step, setStep] = useState<PasswordResetStep>("request");
	const [email, setEmail] = useState("");
	const [verificationCode, setVerificationCode] = useState("");
	const [passwordData, setPasswordData] = useState({
		password: "",
		confirmPassword: "",
	});
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const { t } = useTranslation("auth");

	const handleRequestSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!email) {
			setErrors({ email: t("passwordReset.emailRequired") });
			return;
		}

		try {
			await onRequestReset({ email });
			setStep("verify");
			setErrors({});
		} catch (error) {
			// Error handling is done by parent component
		}
	};

	const handleVerifySubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!verificationCode) {
			setErrors({ code: t("passwordReset.codeRequired") });
			return;
		}

		if (!isValidVerificationCode(verificationCode)) {
			setErrors({ code: t("verification.codeInvalid") });
			return;
		}

		try {
			await onVerifyCode({ email, code: verificationCode });
			setStep("reset");
			setErrors({});
		} catch (error) {
			// Error handling is done by parent component
		}
	};

	const handleResetSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const newErrors: Record<string, string> = {};

		if (!passwordData.password) {
			newErrors.password = t("passwordReset.passwordRequired");
		} else if (!isValidPassword(passwordData.password)) {
			newErrors.password = t("passwordReset.passwordMinLength");
		}
		if (!passwordData.confirmPassword) {
			newErrors.confirmPassword = t("passwordReset.confirmPasswordRequired");
		} else if (passwordData.password !== passwordData.confirmPassword) {
			newErrors.confirmPassword = t("passwordReset.passwordsDoNotMatch");
		}

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		try {
			await onResetPassword({
				email,
				code: verificationCode,
				password: passwordData.password
			});
			onSuccess();
		} catch (error) {
			// Error handling is done by parent component
		}
	};

	const handlePasswordInputChange = (field: keyof typeof passwordData) => (e: React.ChangeEvent<HTMLInputElement>) => {
		setPasswordData(prev => ({ ...prev, [field]: e.target.value }));
		if (errors[field]) {
			setErrors(prev => ({ ...prev, [field]: "" }));
		}
	};

	const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = sanitizeCodeInput(e.target.value);
		setVerificationCode(value);
		if (errors.code) {
			setErrors(prev => ({ ...prev, code: "" }));
		}
	};

	// Step 1: Request reset code
	if (step === "request") {
		return (
			<div className="space-y-4">
				<div className="text-center mb-4">
					<h2 className="text-lg font-semibold">{t("passwordReset.title")}</h2>
					<p className="text-sm text-muted-foreground mt-1">
						{t("passwordReset.subtitle")}
					</p>
				</div>

				{error && (
					<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
						{error}
					</div>
				)}

				<Form onSubmit={handleRequestSubmit}>
					<FormField error={errors.email}>
						<Label htmlFor="reset-email">Email</Label>
						<Input
							id="reset-email"
							type="email"
							placeholder={t("passwordReset.emailPlaceholder")}
							value={email}
							onChange={(e) => {
								setEmail(e.target.value);
								if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
							}}
							disabled={isLoading}
						/>
					</FormField>

					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isLoading}
							className="flex-1"
						>
							{t("common.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={isLoading}
							className="flex-1"
						>
							{isLoading ? t("passwordReset.sendingCode") : t("passwordReset.sendCode")}
						</Button>
					</div>
				</Form>
			</div>
		);
	}

	// Step 2: Verify reset code
	if (step === "verify") {
		return (
			<div className="space-y-4">
				<div className="text-center mb-6">
					<h2 className="text-xl font-semibold mb-2">
						{t("passwordReset.verifyCodeTitle")}
					</h2>
					<p className="text-sm text-muted-foreground">
						{t("passwordReset.verifyCodeSubtitle")}
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						{email}
					</p>
				</div>

				{error && (
					<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
						{error}
					</div>
				)}

				<Form onSubmit={handleVerifySubmit}>
					<FormField error={errors.code}>
						<Label htmlFor="reset-verification-code">
							{t("verification.codeLabel")}
						</Label>
						<Input
							id="reset-verification-code"
							type="text"
							placeholder="0000 0000"
							value={formatVerificationCode(verificationCode)}
							onChange={handleCodeChange}
							disabled={isLoading}
							className="text-center text-lg tracking-widest font-mono"
							maxLength={9} // 8 digits + 1 space
						/>
					</FormField>

					<div className="space-y-3">
						<Button type="submit" className="w-full" disabled={isLoading}>
							{isLoading ? t("verification.verifyButtonLoading") : t("verification.verifyButton")}
						</Button>

						<div className="flex justify-between text-sm">
							<Button
								type="button"
								variant="ghost"
								onClick={() => setStep("request")}
								disabled={isLoading}
								className="text-muted-foreground hover:text-foreground"
							>
								{t("common.back")}
							</Button>

							<div className="flex gap-2">
								<Button
									type="button"
									variant="ghost"
									onClick={async () => {
										try {
											await onRequestReset({ email });
											setVerificationCode("");
											setErrors({});
										} catch (error) {
											// Error will be handled by parent
										}
									}}
									disabled={isLoading}
									className="text-muted-foreground hover:text-foreground"
								>
									{t("verification.resendCode")}
								</Button>

								<Button
									type="button"
									variant="ghost"
									onClick={onCancel}
									disabled={isLoading}
									className="text-muted-foreground hover:text-foreground"
								>
									{t("common.cancel")}
								</Button>
							</div>
						</div>
					</div>
				</Form>

				<div className="mt-4 text-xs text-center text-muted-foreground">
					{t("verification.codeExpiry")}
				</div>
			</div>
		);
	}

	// Step 3: Set new password
	return (
		<div className="space-y-4">
			<div className="text-center mb-4">
				<h2 className="text-lg font-semibold">{t("passwordReset.enterNewPassword")}</h2>
				<p className="text-sm text-muted-foreground mt-1">
					{t("passwordReset.setPasswordSubtitle")}
				</p>
			</div>

			{error && (
				<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
					{error}
				</div>
			)}

			<Form onSubmit={handleResetSubmit}>
				<FormField error={errors.password}>
					<Label htmlFor="reset-password">{t("passwordReset.newPassword")}</Label>
					<div className="relative">
						<Input
							id="reset-password"
							type={showPassword ? "text" : "password"}
							placeholder={t("passwordReset.passwordPlaceholder")}
							value={passwordData.password}
							onChange={handlePasswordInputChange("password")}
							disabled={isLoading}
							className="pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowPassword(!showPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							disabled={isLoading}
						>
							{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</button>
					</div>
				</FormField>

				<FormField error={errors.confirmPassword}>
					<Label htmlFor="reset-confirm">{t("passwordReset.confirmNewPassword")}</Label>
					<div className="relative">
						<Input
							id="reset-confirm"
							type={showConfirmPassword ? "text" : "password"}
							placeholder={t("passwordReset.confirmPasswordPlaceholder")}
							value={passwordData.confirmPassword}
							onChange={handlePasswordInputChange("confirmPassword")}
							disabled={isLoading}
							className="pr-10"
						/>
						<button
							type="button"
							onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
							disabled={isLoading}
						>
							{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
						</button>
					</div>
				</FormField>

				<div className="flex gap-2">
					<Button
						type="button"
						variant="outline"
						onClick={() => setStep("verify")}
						disabled={isLoading}
						className="flex-1"
					>
						{t("common.back")}
					</Button>
					<Button
						type="submit"
						disabled={isLoading}
						className="flex-1"
					>
						{isLoading ? t("passwordReset.resettingPassword") : t("passwordReset.resetPassword")}
					</Button>
				</div>
			</Form>
		</div>
	);
}