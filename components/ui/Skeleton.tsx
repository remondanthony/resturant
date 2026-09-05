/**
 * Loading placeholders sized to the content they stand in for, so the page
 * does not jump when real data arrives. Static — the shimmer is a CSS
 * animation that `prefers-reduced-motion` already disables globally.
 */
export function SkeletonLine({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton h-4 rounded-xs ${className}`} />;
}

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`skeleton rounded-xs ${className}`} />;
}

/** Announces the wait to assistive technology while the skeleton shows. */
export function LoadingRegion({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
