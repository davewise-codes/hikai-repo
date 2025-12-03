import React, { useState } from "react";
import { Button, Input, Label, Form, FormField, Eye, EyeOff } from "@hikai/ui";
import type { SignInFormData } from "../hooks/use-auth";
import { useTranslation } from "react-i18next";
import { isValidEmail } from "../utils/validation";

interface SignInFormProps {
	onSubmit: (_formData: SignInFormData) => void;
	onForgotPassword?: () => void;
	isLoading?: boolean;
	error?: string;
}

export function SignInForm({
	onSubmit,
	onForgotPassword,
	isLoading = false,
	error,
}: SignInFormProps) {
	const [formData, setFormData] = useState<SignInFormData>({
		email: "",
		password: "",
	});

	const { t } = useTranslation("auth");

	const [errors, setErrors] = useState<Partial<SignInFormData>>({});
	const [showPassword, setShowPassword] = useState(false);

	const validateForm = (): boolean => {
		const newErrors: Partial<SignInFormData> = {};

		if (!formData.email) {
			newErrors.email = t("signin.emailRequired");
		} else if (!isValidEmail(formData.email)) {
			newErrors.email = t("signin.emailInvalid");
		}

		if (!formData.password) {
			newErrors.password = t("signin.passwordRequired");
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (validateForm()) {
			onSubmit(formData);
		}
	};

	const handleInputChange =
		(field: keyof SignInFormData) =>
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFormData((prev) => ({ ...prev, [field]: e.target.value }));
			// Clear error when user starts typing
			if (errors[field]) {
				setErrors((prev) => ({ ...prev, [field]: undefined }));
			}
		};

	return (
		<Form onSubmit={handleSubmit}>
			{error && (
				<div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
					{error}
				</div>
			)}

			<FormField error={errors.email}>
				<Label htmlFor="signin-email">Email</Label>
				<Input
					id="signin-email"
					type="email"
					placeholder={t("signin.emailPlaceholder")}
					value={formData.email}
					onChange={handleInputChange("email")}
					disabled={isLoading}
				/>
			</FormField>

			<FormField error={errors.password}>
				<Label htmlFor="signin-password">Password</Label>
				<div className="relative">
					<Input
						id="signin-password"
						type={showPassword ? "text" : "password"}
						placeholder={t("signin.passwordPlaceholder")}
						value={formData.password}
						onChange={handleInputChange("password")}
						disabled={isLoading}
						className="pr-10"
					/>
					<button
						type="button"
						onClick={() => setShowPassword(!showPassword)}
						className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
						disabled={isLoading}
					>
						{showPassword ? (
							<EyeOff className="h-4 w-4" />
						) : (
							<Eye className="h-4 w-4" />
						)}
					</button>
				</div>
				{onForgotPassword && (
					<div className="mt-2">
						<Button
							variant="link"
							onClick={onForgotPassword}
							// className="text-sm text-primary hover:text-primary/80 transition-colors"
							className="p-0"
							disabled={isLoading}
						>
							{t("passwordReset.forgotPassword")}
						</Button>
					</div>
				)}
			</FormField>

			<Button type="submit" className="w-full" disabled={isLoading}>
				{isLoading ? t("signin.loginButtonLoading") : t("signin.loginButton")}
			</Button>
		</Form>
	);
}
