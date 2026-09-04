import * as React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../primitives/input.js';
import { Button } from '../primitives/button.js';
import { Badge } from '../primitives/badge.js';
import { cn } from '../lib/cn.js';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  onSubmit?: () => void;
}

export function SearchBar({ value, onChange, placeholder = 'Search…', className, onSubmit }: SearchBarProps) {
  return (
    <form
      role="search"
      className={cn('relative flex-1', className)}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8"
        type="search"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </form>
  );
}

export interface FilterChip {
  key: string;
  label: string;
}

export interface FilterBarProps {
  children: React.ReactNode;
  activeChips?: FilterChip[];
  onRemoveChip?: (key: string) => void;
  onClearAll?: () => void;
  clearLabel?: string;
  className?: string;
}

/** Row of filter controls plus removable chips summarising the active filters. */
export function FilterBar({ children, activeChips = [], onRemoveChip, onClearAll, clearLabel = 'Clear all', className }: FilterBarProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
        {children}
      </div>
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1">
              {chip.label}
              {onRemoveChip ? (
                <button type="button" onClick={() => onRemoveChip(chip.key)} aria-label={`Remove ${chip.label}`}>
                  <X className="size-3" />
                </button>
              ) : null}
            </Badge>
          ))}
          {onClearAll ? (
            <Button variant="ghost" size="sm" className="h-6 px-2 text-2xs" onClick={onClearAll}>
              {clearLabel}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
