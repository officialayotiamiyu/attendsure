import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { signIn } from '../../services/auth';
import { getFriendlyError } from '../../lib/errors';
import { useAuth } from '../../auth/AuthProvider';

const schema = z.object({
  email: z.email(),
  password: z.string().min(8)
});

type FormValues = z.infer<typeof schema>;

export function SignInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshContext } = useAuth();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: (values: FormValues) => signIn(values.email, values.password),
    onSuccess: async () => {
      await refreshContext();
      const destination = (location.state as { from?: { pathname?: string } })?.from?.pathname ?? '/';
      navigate(destination, { replace: true });
    }
  });

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <h1>Sign in</h1>
        <p className="muted">Secure attendance for modern businesses.</p>
        <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <InputField label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          <InputField label="Password" type="password" autoComplete="current-password" error={form.formState.errors.password?.message} {...form.register('password')} />
          {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <div className="auth-links">
          <Link to="/auth/sign-up">Create account</Link>
          <Link to="/auth/reset-password">Reset password</Link>
        </div>
      </Card>
    </div>
  );
}
