import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { InputField, SelectField } from '../../components/common/InputField';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { getFriendlyError } from '../../lib/errors';
import { listStaff, inviteStaff, updateStaffProfile } from '../../services/staff';

const inviteSchema = z.object({
  email: z.email(),
  jobTitle: z.string().optional(),
  scheduledStartTime: z.string().min(1),
  scheduledEndTime: z.string().min(1)
});

const editSchema = z.object({
  jobTitle: z.string().optional(),
  scheduledStartTime: z.string().min(1),
  scheduledEndTime: z.string().min(1),
  employmentStatus: z.enum(['ACTIVE', 'INACTIVE'])
});

export function StaffPage() {
  const queryClient = useQueryClient();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const staffQuery = useQuery({ queryKey: ['staff'], queryFn: listStaff });
  const inviteForm = useForm<z.infer<typeof inviteSchema>>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { scheduledStartTime: '08:00', scheduledEndTime: '17:00' }
  });
  const editForm = useForm<z.infer<typeof editSchema>>({ resolver: zodResolver(editSchema) });

  const inviteMutation = useMutation({
    mutationFn: (values: z.infer<typeof inviteSchema>) => inviteStaff(values),
    onSuccess: async (data) => {
      setInviteLink(data.invite_link);
      inviteForm.reset({ email: '', jobTitle: '', scheduledStartTime: '08:00', scheduledEndTime: '17:00' });
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (values: z.infer<typeof editSchema>) =>
      updateStaffProfile({
        staffUserId: editingUserId!,
        jobTitle: values.jobTitle,
        scheduledStartTime: values.scheduledStartTime,
        scheduledEndTime: values.scheduledEndTime,
        employmentStatus: values.employmentStatus
      }),
    onSuccess: async () => {
      setEditingUserId(null);
      await queryClient.invalidateQueries({ queryKey: ['staff'] });
    }
  });

  const filteredStaff = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (staffQuery.data ?? []).filter((staff) => {
      const matchesSearch = !term || [staff.full_name, staff.email, staff.job_title ?? ''].join(' ').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'ALL' || staff.employment_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, staffQuery.data, statusFilter]);

  if (staffQuery.isLoading) return <LoadingScreen />;

  return (
    <div className="stack-lg">
      <section className="grid two-columns">
        <Card>
          <h2>Invite staff</h2>
          <p className="muted">Creates a secure organization-scoped invitation with expiry protection.</p>
          <form className="stack" onSubmit={inviteForm.handleSubmit((values) => inviteMutation.mutate(values))}>
            <InputField label="Work email" type="email" error={inviteForm.formState.errors.email?.message} {...inviteForm.register('email')} />
            <InputField label="Job title" error={inviteForm.formState.errors.jobTitle?.message} {...inviteForm.register('jobTitle')} />
            <div className="grid two-columns">
              <InputField label="Scheduled start" type="time" error={inviteForm.formState.errors.scheduledStartTime?.message} {...inviteForm.register('scheduledStartTime')} />
              <InputField label="Scheduled end" type="time" error={inviteForm.formState.errors.scheduledEndTime?.message} {...inviteForm.register('scheduledEndTime')} />
            </div>
            {inviteMutation.error ? <div className="alert alert-danger">{getFriendlyError(inviteMutation.error)}</div> : null}
            {inviteLink ? <div className="alert alert-success break-all">Invitation created: {inviteLink}</div> : null}
            <Button type="submit" disabled={inviteMutation.isPending}>{inviteMutation.isPending ? 'Creating invite…' : 'Invite staff member'}</Button>
          </form>
        </Card>

        <Card>
          <h2>Staff directory</h2>
          <p className="muted">Edit schedules, job titles, and activation state.</p>
          <div className="stack-sm">
            <InputField label="Search staff" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or email" />
            <SelectField label="Status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
              <option value="ALL">All staff</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </SelectField>
          </div>
          {filteredStaff.length ? (
            <div className="stack">
              {filteredStaff.map((staff) => (
                <Card key={staff.user_id} className="stack-sm">
                  <div className="inline-card">
                    <div>
                      <strong>{staff.full_name}</strong>
                      <div className="muted">{staff.email}</div>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setEditingUserId(staff.user_id);
                        editForm.reset({
                          jobTitle: staff.job_title ?? '',
                          scheduledStartTime: staff.scheduled_start_time,
                          scheduledEndTime: staff.scheduled_end_time,
                          employmentStatus: staff.employment_status
                        });
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                  <div className="inline-details">
                    <span>{staff.job_title ?? 'Staff'}</span>
                    <span>{staff.scheduled_start_time} – {staff.scheduled_end_time}</span>
                    <span>{staff.employment_status}</span>
                  </div>
                  {editingUserId === staff.user_id ? (
                    <form className="stack" onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}>
                      <InputField label="Job title" {...editForm.register('jobTitle')} />
                      <div className="grid two-columns">
                        <InputField label="Scheduled start" type="time" {...editForm.register('scheduledStartTime')} />
                        <InputField label="Scheduled end" type="time" {...editForm.register('scheduledEndTime')} />
                      </div>
                      <SelectField label="Employment status" {...editForm.register('employmentStatus')}>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                      </SelectField>
                      {updateMutation.error ? <div className="alert alert-danger">{getFriendlyError(updateMutation.error)}</div> : null}
                      <div className="inline-actions">
                        <Button type="submit" disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Saving…' : 'Save changes'}</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditingUserId(null)}>Cancel</Button>
                      </div>
                    </form>
                  ) : null}
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState title="No matching staff" description="Try another search or filter to see more staff members." />
          )}
        </Card>
      </section>
    </div>
  );
}
