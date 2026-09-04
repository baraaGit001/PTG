export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <span className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-label="Loading" />
    </div>
  );
}
