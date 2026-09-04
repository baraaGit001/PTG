import { Toaster as SonnerToaster, toast } from 'sonner';

/** Mount once at the app root. Styled to match the card/border design tokens. */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        classNames: {
          toast: 'rounded-lg border border-border bg-card text-card-foreground shadow-raised text-sm',
          description: 'text-muted-foreground text-xs',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-secondary text-secondary-foreground',
        },
      }}
    />
  );
}

export { toast };
