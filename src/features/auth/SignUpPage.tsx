import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField } from '../../components/common/InputField';
import { signUp } from '../../services/auth';
import { getFriendlyError } from '../../lib/errors';
import { useAuth } from '../../auth/AuthProvider';
import { acceptInvitation } from '../../services/staff';

const schema = z
  .object({
    fullName: z.string().min(2),
    email: z.email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof schema>;

export function SignUpPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const { refreshContext } = useAuth();
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      await signUp(values.email, values.password, values.fullName);
      if (inviteToken) {
        await acceptInvitation(inviteToken);
      }
    },
    onSuccess: async () => {
      await refreshContext();
      navigate(inviteToken ? '/staff' : '/onboarding/create-organization', { replace: true });
    }
  });

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <h1>Create account</h1>
        <p className="muted">{inviteToken ? 'Finish setup to join your organization.' : 'Create your owner account to start onboarding.'}</p>
        <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <InputField label="Full name" autoComplete="name" error={form.formState.errors.fullName?.message} {...form.register('fullName')} />
          <InputField label="Email" type="email" autoComplete="email" error={form.formState.errors.email?.message} {...form.register('email')} />
          <InputField label="Password" type="password" autoComplete="new-password" error={form.formState.errors.password?.message} {...form.register('password')} />
          <InputField label="Confirm password" type="password" autoComplete="new-password" error={form.formState.errors.confirmPassword?.message} {...form.register('confirmPassword')} />
          {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
        <div className="auth-links">
          <Link to="/auth/sign-in">Already have an account</Link>
        </div>
      </Card>
    </div>
  );
}
