import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField, SelectField } from '../../components/common/InputField';
import { createOrganization } from '../../services/organization';
import { useAuth } from '../../auth/AuthProvider';
import { getFriendlyError } from '../../lib/errors';

const schema = z.object({
  name: z.string().min(2),
  businessType: z.string().optional(),
  timezone: z.string().min(2),
  absenceGraceMinutes: z.enum(['30', '60', '90', '120'])
});

type FormValues = z.infer<typeof schema>;

export function CreateOrganizationPage() {
  const navigate = useNavigate();
  const { refreshContext } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      absenceGraceMinutes: '60'
    }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createOrganization({
        name: values.name,
        businessType: values.businessType,
        timezone: values.timezone,
        absenceGraceMinutes: Number(values.absenceGraceMinutes)
      }),
    onSuccess: async () => {
      await refreshContext();
      navigate('/admin', { replace: true });
    }
  });

  return (
    <div className="auth-layout">
      <Card className="auth-card auth-wide">
        <h1>Create your organization</h1>
        <p className="muted">This sets up a secure tenant with OWNER access for your account.</p>
        <div className="alert alert-success">You will become the organization owner and can invite staff immediately after setup.</div>
        <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
          <InputField label="Organization name" error={form.formState.errors.name?.message} {...form.register('name')} />
          <InputField label="Business type" error={form.formState.errors.businessType?.message} {...form.register('businessType')} />
          <InputField label="Timezone" hint="Example: Africa/Lagos or Europe/London" error={form.formState.errors.timezone?.message} {...form.register('timezone')} />
          <SelectField label="Absent after" error={form.formState.errors.absenceGraceMinutes?.message} {...form.register('absenceGraceMinutes')}>
            <option value="30">30 minutes after start time</option>
            <option value="60">60 minutes after start time</option>
            <option value="90">90 minutes after start time</option>
            <option value="120">120 minutes after start time</option>
          </SelectField>
          {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
          <Button type="submit" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Creating organization…' : 'Create organization'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
