import React, { useState } from 'react';
import { Button, Input, Label, Form, FormField } from '@hikai/ui';
import { useTranslation } from 'react-i18next';

export interface VerificationCodeFormData {
  code: string;
  email: string;
}

interface VerificationCodeFormProps {
  email: string;
  onSubmit: (data: VerificationCodeFormData) => void;
  onResendCode: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: string;
}

export function VerificationCodeForm({ 
  email,
  onSubmit, 
  onResendCode,
  onCancel,
  isLoading = false, 
  error 
}: VerificationCodeFormProps) {
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string>();
  
  const { t } = useTranslation('auth');

  const validateCode = (): boolean => {
    if (!code.trim()) {
      setCodeError(t('verification.codeRequired'));
      return false;
    }
    
    if (code.length !== 8) {
      setCodeError(t('verification.codeInvalid'));
      return false;
    }
    
    if (!/^\d{8}$/.test(code)) {
      setCodeError(t('verification.codeInvalid'));
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError(undefined);
    
    if (validateCode()) {
      onSubmit({ code: code.trim(), email });
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 8);
    setCode(value);
    if (codeError) {
      setCodeError(undefined);
    }
  };

  const formatCodeDisplay = (value: string) => {
    return value.replace(/(\d{4})(\d{4})/, '$1 $2');
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold mb-2">
          {t('verification.title')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('verification.description', { email })}
        </p>
      </div>

      <Form onSubmit={handleSubmit}>
        {error && (
          <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md mb-4">
            {error}
          </div>
        )}

        <FormField error={codeError}>
          <Label htmlFor="verification-code">
            {t('verification.codeLabel')}
          </Label>
          <Input
            id="verification-code"
            type="text"
            placeholder="0000 0000"
            value={formatCodeDisplay(code)}
            onChange={handleCodeChange}
            disabled={isLoading}
            className="text-center text-lg tracking-widest font-mono"
            maxLength={9} // 8 digits + 1 space
          />
        </FormField>

        <div className="space-y-3">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? t('verification.verifyButtonLoading') : t('verification.verifyButton')}
          </Button>
          
          <div className="flex justify-between text-sm">
            <Button
              type="button"
              variant="ghost"
              onClick={onResendCode}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('verification.resendCode')}
            </Button>
            
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground"
            >
              {t('verification.cancel')}
            </Button>
          </div>
        </div>
      </Form>

      <div className="mt-4 text-xs text-center text-muted-foreground">
        {t('verification.codeExpiry')}
      </div>
    </div>
  );
}