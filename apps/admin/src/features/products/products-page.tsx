import * as React from 'react';
import { useForm } from 'react-hook-form';
import {
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
import type { ProductInput } from '@ptg/types';
import { formatMoney } from '@/lib/format';
import { useAdminCategoriesFlat, useAdminProducts, useCreateProduct, useUpdateProduct } from './api';

export default function ProductsPage() {
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const productsQuery = useAdminProducts({ search: search || undefined, page, pageSize: 20 });
  const categoriesQuery = useAdminCategoriesFlat();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  const { register, handleSubmit, reset } = useForm<ProductInput>({
    defaultValues: { slug: '', name: '', sku: '', currency: 'USD', basePriceMinor: 0, status: 'DRAFT' },
  });

  const onSubmit = handleSubmit((values) => {
    createProduct.mutate(
      { ...values, basePriceMinor: Number(values.basePriceMinor) },
      { onSuccess: () => { setDialogOpen(false); reset(); toast.success('Product created'); }, onError: () => toast.error('Could not create product') },
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-semibold text-foreground">Products</h1>
        <div className="flex gap-2">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} className="sm:w-64" />
          <Button onClick={() => setDialogOpen(true)}>New product</Button>
        </div>
      </div>

      <DataTable
        loading={productsQuery.isLoading}
        rows={productsQuery.data?.items ?? []}
        getRowKey={(row) => row.id}
        emptyTitle="No products found"
        columns={[
          { key: 'name', header: 'Product', render: (row) => (
            <div className="flex items-center gap-2">
              {row.primaryImageUrl ? <img src={row.primaryImageUrl} alt="" className="size-8 rounded object-cover" /> : null}
              <span className="font-medium text-foreground">{row.name}</span>
            </div>
          ) },
          { key: 'category', header: 'Category', render: (row) => row.category?.name ?? '—' },
          { key: 'price', header: 'Price', className: 'num', render: (row) => formatMoney(row.price) },
          { key: 'stock', header: 'Stock', render: (row) => <StatusBadge status={row.stockStatus} /> },
          { key: 'status', header: 'Status', render: (row) => (
            <Select value={row.status} onValueChange={(status) => updateProduct.mutate({ id: row.id, status: status as never }, { onSuccess: () => toast.success('Updated') })}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {['DRAFT', 'PUBLISHED', 'ARCHIVED'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          ) },
        ]}
      />
      {productsQuery.data?.pagination ? <Pagination meta={productsQuery.data.pagination} onPageChange={setPage} /> : null}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New product</DialogTitle></DialogHeader>
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <FormField label="Name" required><Input {...register('name', { required: true })} /></FormField>
            <FormField label="Slug" required><Input {...register('slug', { required: true })} /></FormField>
            <FormField label="SKU" required><Input {...register('sku', { required: true })} /></FormField>
            <FormField label="Price (minor units)" required><Input type="number" {...register('basePriceMinor', { required: true, valueAsNumber: true })} /></FormField>
            <FormField label="Currency" required><Input {...register('currency', { required: true })} /></FormField>
            <FormField label="Category">
              <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" {...register('categoryId')}>
                <option value="">None</option>
                {categoriesQuery.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createProduct.isPending}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
