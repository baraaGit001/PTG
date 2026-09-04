import * as React from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { AddressCard, Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, FormField, Input, toast } from '@ptg/ui';
import type { AddressInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useAddresses, useCreateAddress, useDeleteAddress, useSetDefaultAddress, useUpdateAddress } from './api';

export default function AddressesPage() {
  const { t } = useTranslation();
  const addressesQuery = useAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const { register, handleSubmit, reset } = useForm<AddressInput>({
    defaultValues: { recipientName: '', phone: '', country: '', region: '', city: '', district: '', street: '', postalCode: '', isDefault: false },
  });

  const openCreate = () => {
    setEditingId(null);
    reset({ recipientName: '', phone: '', country: '', region: '', city: '', district: '', street: '', postalCode: '', isDefault: false });
    setDialogOpen(true);
  };

  const onSubmit = handleSubmit((values) => {
    const mutation = editingId ? updateAddress.mutateAsync({ id: editingId, ...values }) : createAddress.mutateAsync(values);
    mutation
      .then(() => {
        setDialogOpen(false);
        toast.success(t('common.save'));
      })
      .catch(() => toast.error(t('errors.generic')));
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t('nav.addresses')}</h1>
        <Button size="sm" onClick={openCreate}>
          Add address
        </Button>
      </div>

      <QueryState
        isLoading={addressesQuery.isLoading}
        isError={addressesQuery.isError}
        error={addressesQuery.error}
        onRetry={() => addressesQuery.refetch()}
        isEmpty={addressesQuery.data?.length === 0}
        emptyTitle="No addresses saved"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {addressesQuery.data?.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={() => {
                setEditingId(address.id);
                reset(address);
                setDialogOpen(true);
              }}
              onDelete={() => deleteAddress.mutate(address.id)}
              onSetDefault={() => setDefault.mutate(address.id)}
            />
          ))}
        </div>
      </QueryState>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? t('common.edit') : 'Add address'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Recipient name" required><Input {...register('recipientName', { required: true })} /></FormField>
            <FormField label="Phone" required><Input {...register('phone', { required: true })} /></FormField>
            <FormField label="Country" required><Input {...register('country', { required: true })} /></FormField>
            <FormField label="Region/State" required><Input {...register('region', { required: true })} /></FormField>
            <FormField label="City" required><Input {...register('city', { required: true })} /></FormField>
            <FormField label="District"><Input {...register('district')} /></FormField>
            <FormField label="Street" required className="sm:col-span-2"><Input {...register('street', { required: true })} /></FormField>
            <FormField label="Postal code"><Input {...register('postalCode')} /></FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" loading={createAddress.isPending || updateAddress.isPending}>{t('common.save')}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
