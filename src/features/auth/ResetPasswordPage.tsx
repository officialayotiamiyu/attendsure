import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { resetPassword } from '../../services/auth';
import { getFriendlyError } from '../../lib/errors';

const schema = z.object({
  email: z.email()
});

export function ResetPasswordPage() {
  const form = useForm<{ email: string }>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values: { email: string }) => resetPassword(values.email)
  });

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <h1>Reset password</h1>
        <p className="muted">We will email you a secure password reset link.</p>
        <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <InputField label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
          {mutation.isSuccess ? <div className="alert alert-success">Password reset email sent.</div> : null}
          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
