import * as React from 'react';
import { MapPin, Pencil, Star, Trash2 } from 'lucide-react';
import type { AddressDto } from '@ptg/types';
import { Card } from '../primitives/card.js';
import { Badge } from '../primitives/badge.js';
import { Button } from '../primitives/button.js';
import { cn } from '../lib/cn.js';

export interface AddressCardProps {
  address: AddressDto;
  defaultLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  setDefaultLabel?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onSetDefault?: () => void;
  selectable?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  className?: string;
}

export function AddressCard({
  address,
  defaultLabel = 'Default',
  editLabel = 'Edit',
  deleteLabel = 'Delete',
  setDefaultLabel = 'Set as default',
  onEdit,
  onDelete,
  onSetDefault,
  selectable,
  selected,
  onSelect,
  className,
}: AddressCardProps) {
  return (
    <Card
      className={cn(
        'flex flex-col gap-2 p-3',
        selectable && 'cursor-pointer',
        selected && 'border-primary ring-1 ring-primary',
        className,
      )}
      onClick={selectable ? onSelect : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{address.recipientName}</span>
            <span className="text-2xs text-muted-foreground">{address.phone}</span>
          </div>
        </div>
        {address.isDefault ? <Badge variant="success">{defaultLabel}</Badge> : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {[address.street, address.district, address.city, address.region, address.country]
          .filter(Boolean)
          .join(', ')}
        {address.postalCode ? ` ${address.postalCode}` : ''}
      </p>
      {(onEdit || onDelete || onSetDefault) && (
        <div className="flex items-center gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
          {onEdit ? (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="size-3.5" />
              {editLabel}
            </Button>
          ) : null}
          {!address.isDefault && onSetDefault ? (
            <Button variant="outline" size="sm" onClick={onSetDefault}>
              <Star className="size-3.5" />
              {setDefaultLabel}
            </Button>
          ) : null}
          {onDelete ? (
            <Button variant="ghost" size="sm" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="size-3.5" />
              {deleteLabel}
            </Button>
          ) : null}
        </div>
      )}
    </Card>
  );
}
