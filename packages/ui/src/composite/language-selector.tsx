import * as React from 'react';
import { Check, Languages } from 'lucide-react';
import { LOCALE_LIST, type Locale } from '@ptg/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../primitives/dropdown-menu.js';
import { Button } from '../primitives/button.js';
import { cn } from '../lib/cn.js';

export interface LanguageSelectorProps {
  value: Locale;
  onChange: (locale: Locale) => void;
  /** Compact icon-only trigger (top header) vs full list (settings page). */
  variant?: 'trigger' | 'list';
  className?: string;
}

export function LanguageSelector({ value, onChange, variant = 'trigger', className }: LanguageSelectorProps) {
  if (variant === 'list') {
    return (
      <div className={cn('flex flex-col divide-y divide-border rounded-lg border border-border', className)}>
        {LOCALE_LIST.map((locale) => (
          <button
            key={locale.code}
            type="button"
            onClick={() => onChange(locale.code)}
            className="flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50"
          >
            <span className="flex flex-col">
              <span className="text-sm font-medium text-foreground">{locale.nativeName}</span>
              <span className="text-2xs text-muted-foreground">{locale.englishName}</span>
            </span>
            {value === locale.code ? <Check className="size-4 text-primary" /> : null}
          </button>
        ))}
      </div>
    );
  }

  const current = LOCALE_LIST.find((l) => l.code === value);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('gap-1.5', className)}>
          <Languages className="size-4" />
          <span className="hidden sm:inline">{current?.nativeName ?? value}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALE_LIST.map((locale) => (
          <DropdownMenuItem key={locale.code} onSelect={() => onChange(locale.code)} className="justify-between">
            <span className="flex flex-col">
              <span>{locale.nativeName}</span>
              <span className="text-2xs text-muted-foreground">{locale.englishName}</span>
            </span>
            {value === locale.code ? <Check className="size-4 text-primary" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
