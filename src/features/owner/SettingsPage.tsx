import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { InputField, SelectField } from '../../components/common/InputField';
import { useAuth } from '../../auth/AuthProvider';
import { updateOrganizationSettings } from '../../services/organization';
import { getFriendlyError } from '../../lib/errors';

const schema = z.object({
  timezone: z.string().min(2),
  businessType: z.string().optional(),
  absenceGraceMinutes: z.enum(['30', '60', '90', '120'])
});

type FormValues = z.infer<typeof schema>;

export function SettingsPage() {
  const { organization, refreshContext } = useAuth();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      timezone: organization?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone,
      businessType: organization?.business_type ?? '',
      absenceGraceMinutes: String(organization?.absence_grace_minutes ?? 60) as FormValues['absenceGraceMinutes']
    }
  });
  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      updateOrganizationSettings({
        organizationId: organization!.id,
        timezone: values.timezone,
        businessType: values.businessType,
        absenceGraceMinutes: Number(values.absenceGraceMinutes)
      }),
    onSuccess: async () => {
      await refreshContext();
    }
  });

  return (
    <Card className="settings-card">
      <h2>Organization settings</h2>
      <form className="stack" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <InputField label="Timezone" hint="Used for punctuality and attendance calculations." error={form.formState.errors.timezone?.message} {...form.register('timezone')} />
        <InputField label="Business type" error={form.formState.errors.businessType?.message} {...form.register('businessType')} />
        <SelectField label="Absent after" error={form.formState.errors.absenceGraceMinutes?.message} {...form.register('absenceGraceMinutes')}>
          <option value="30">30 minutes after start time</option>
          <option value="60">60 minutes after start time</option>
          <option value="90">90 minutes after start time</option>
          <option value="120">120 minutes after start time</option>
        </SelectField>
        {mutation.error ? <div className="alert alert-danger">{getFriendlyError(mutation.error)}</div> : null}
        {mutation.isSuccess ? <div className="alert alert-success">Organization settings updated.</div> : null}
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save settings'}</Button>
      </form>
    </Card>
  );
}
