import * as React from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, FormField, Input, toast } from '@ptg/ui';
import { Trash2 } from 'lucide-react';
import type { CategoryInput } from '@ptg/types';
import { QueryState } from '@/components/query-state';
import { useAdminCategories, useCreateCategory, useDeleteCategory } from './api';

export default function CategoriesPage() {
  const categoriesQuery = useAdminCategories();
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const { register, handleSubmit, reset } = useForm<CategoryInput>({ defaultValues: { slug: '', name: '' } });

  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Categories</h1>

      <Card className="p-4">
        <form
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
          onSubmit={handleSubmit((values) => createCategory.mutate(values, { onSuccess: () => { reset(); toast.success('Category created'); }, onError: () => toast.error('Could not create category') }))}
        >
          <FormField label="Name" required><Input {...register('name', { required: true })} /></FormField>
          <FormField label="Slug" required><Input {...register('slug', { required: true })} /></FormField>
          <div className="flex items-end">
            <Button type="submit" loading={createCategory.isPending}>Add</Button>
          </div>
        </form>
      </Card>

      <QueryState isLoading={categoriesQuery.isLoading} isError={categoriesQuery.isError} error={categoriesQuery.error} onRetry={() => categoriesQuery.refetch()} isEmpty={categoriesQuery.data?.length === 0} emptyTitle="No categories yet">
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {categoriesQuery.data?.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <span className="font-medium text-foreground">{category.name}</span>
                <span className="ml-2 text-2xs text-muted-foreground">{category.productCount} products</span>
              </div>
              <button
                className="text-muted-foreground hover:text-destructive"
                onClick={() => deleteCategory.mutate(category.id, { onError: () => toast.error('Remove products/children first') })}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </QueryState>
    </div>
  );
}
