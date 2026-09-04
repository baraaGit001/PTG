import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
  Badge,
  Button,
  DataTable,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  Pagination,
  SearchBar,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  toast,
} from '@ptg/ui';
import { ROLES, type CreateUserRequest, type RoleName } from '@ptg/types';
import { formatDate } from '@/lib/format';
import { useAdminUsers, useCreateUser, useUpdateUser } from './api';

export default function UsersPage() {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const usersQuery = useAdminUsers({ search: search || undefined, page, pageSize: 20 });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const { register, handleSubmit, watch, setValue, reset } = useForm<CreateUserRequest>({
    defaultValues: { memberId: '', fullName: '', email: '', password: '', roles: ['CUSTOMER'] },
  });

  const onSubmit = handleSubmit((values) => {
    createUser.mutate(values, {
      onSuccess: () => {
        setDialogOpen(false);
        reset();
        toast.success('User created');
      },
      onError: () => toast.error('Could not create user'),
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">Users</h1>
        <div className="flex gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:w-64" />
          <Button onClick={() => setDialogOpen(true)}>New user</Button>
        </div>
      </div>

      <DataTable
        loading={usersQuery.isLoading}
        rows={usersQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No users found"
        columns={[
          { key: 'name', header: 'Name', render: (row) => (
            <div className="flex flex-col">
              <span className="font-medium text-foreground">{row.fullName}</span>
              <span className="num text-2xs text-muted-foreground">{row.memberId}</span>
            </div>
          ) },
          { key: 'roles', header: 'Roles', render: (row) => (
            <div className="flex flex-wrap gap-1">{row.roles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)}</div>
          ) },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'lastLogin', header: 'Last login', render: (row) => (row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never') },
          { key: 'actions', header: '', render: (row) => (
            <Select value={row.status} onValueChange={(status) => updateUser.mutate({ id: row.id, status: status as never }, { onSuccess: () => toast.success('Updated') })}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['ACTIVE', 'SUSPENDED', 'PENDING', 'CLOSED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          ) },
        ]}
      />
      {usersQuery.data?.pagination ? <Pagination meta={usersQuery.data.pagination} onPageChange={setPage} /> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New user</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Member ID" required><Input {...register('memberId', { required: true })} /></FormField>
            <FormField label="Full name" required><Input {...register('fullName', { required: true })} /></FormField>
            <FormField label="Email"><Input type="email" {...register('email')} /></FormField>
            <FormField label="Password" required><Input type="password" {...register('password', { required: true })} /></FormField>
            <FormField label="Roles" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-1 rounded-full border border-border px-2 py-1 text-2xs">
                    <input
                      type="checkbox"
                      checked={watch('roles')?.includes(role)}
                      onChange={(e) => {
                        const current = watch('roles') ?? [];
                        setValue('roles', e.target.checked ? [...current, role] : current.filter((r: RoleName) => r !== role));
                      }}
                    />
                    {role}
                  </label>
                ))}
              </div>
            </FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createUser.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
