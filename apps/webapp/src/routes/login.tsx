import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { AuthForm } from '@/domains/auth/components/auth-form';
import { useAuth } from '@/domains/auth/hooks';
import type { SignInFormData, SignUpFormData } from '@/domains/auth/hooks/use-auth';

function LoginPage() {
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string>('');

  // Redirigir si ya está autenticado usando navegación del router
  useEffect(() => {
    console.log('LoginPage - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);
    
    if (isAuthenticated && !isLoading) {
      console.log('Redirecting to home page...');
      // Pequeño delay para asegurar que el token se propague completamente
      setTimeout(() => {
        navigate({ to: '/' });
      }, 100);
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleSignIn = async (data: SignInFormData) => {
    try {
      setError('');
      await signIn(data);
      // La redirección se maneja en el useEffect de arriba
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Sign in failed');
    }
  };

  const handleSignUp = async (data: SignUpFormData) => {
    try {
      setError('');
      await signUp(data);
      // La redirección se maneja en el useEffect de arriba
    } catch (error) {
      console.error('Full signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setError(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        {/* DEBUG INFO - ALWAYS SHOW */}
        <div className="mb-4 p-3 bg-blue-100 rounded text-sm">
          <div>🔍 Debug Info:</div>
          <div>User: Token-based auth (no user object)</div>
          <div>Authenticated: {isAuthenticated ? '✅ YES' : '❌ NO'}</div>
          <div>Loading: {isLoading ? '⏳ YES' : '✅ NO'}</div>
        </div>
        
        {isAuthenticated ? (
          <div className="p-6 bg-green-100 rounded">
            <h2 className="text-xl font-semibold text-green-800">🎉 Successfully Authenticated!</h2>
            <p className="mt-2 text-green-700">Welcome! Authentication successful.</p>
            <p className="mt-2 text-sm text-green-600">
              Redirecting to home page...
            </p>
          </div>
        ) : (
          <AuthForm
            onSignIn={handleSignIn}
            onSignUp={handleSignUp}
            isLoading={isLoading}
            error={error}
          />
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/login')({
  component: LoginPage,
});