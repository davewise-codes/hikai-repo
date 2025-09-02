import React, { useState } from 'react';
import { Button, Input, Label, Form, FormField } from '@hikai/ui';
import type { SignUpFormData } from '../hooks/use-auth';
import { useTranslation } from 'react-i18next';

interface SignUpFormProps {
   
  onSubmit: (_formData: SignUpFormData) => void;
  isLoading?: boolean;
  error?: string;
}

export function SignUpForm({ onSubmit, isLoading = false, error }: SignUpFormProps) {
  const [formData, setFormData] = useState<SignUpFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const { t } = useTranslation('auth');

  const [errors, setErrors] = useState<Partial<SignUpFormData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<SignUpFormData> = {};

    if (!formData.email) {
      newErrors.email = t('signup.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('signup.emailInvalid');
    }

    if (!formData.password) {
      newErrors.password = t('signup.passwordRequired');
    } else if (formData.password.length < 6) {
      newErrors.password = t('signup.passwordMinLength');
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.confirmPasswordRequired');
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('signup.passwordsDoNotMatch');
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

  const handleInputChange = (field: keyof SignUpFormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder={t('signup.emailPlaceholder')}
          value={formData.email}
          onChange={handleInputChange('email')}
          disabled={isLoading}
        />
      </FormField>

      <FormField error={errors.password}>
        <Label htmlFor="signup-password">Password</Label>
        <Input
          id="signup-password"
          type="password"
          placeholder={t('signup.passwordPlaceholder')}
          value={formData.password}
          onChange={handleInputChange('password')}
          disabled={isLoading}
        />
      </FormField>

      <FormField error={errors.confirmPassword}>
        <Label htmlFor="signup-confirm">Confirm Password</Label>
        <Input
          id="signup-confirm"
          type="password"
          placeholder={t('signup.confirmPasswordPlaceholder')}
          value={formData.confirmPassword}
          onChange={handleInputChange('confirmPassword')}
          disabled={isLoading}
        />
      </FormField>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t('signup.createButtonLoading') : t('signup.createButton')}
      </Button>
    </Form>
  );
}