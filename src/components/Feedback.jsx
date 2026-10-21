export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-red-100 ${className}`} aria-hidden="true" />;
}

export function ListSkeleton({ count = 3, cols = 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3', h = 'h-40' }) {
  return (
    <div className={`grid gap-4 ${cols}`} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={h} />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="space-y-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10" />
      ))}
    </div>
  );
}

export function EmptyState({ title = 'Nothing here yet', message, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center animate-fade-in">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="56" fill="#FFE0E3" />
        <path d="M60 22C60 22 36 52 36 70a24 24 0 0 0 48 0C84 52 60 22 60 22z" fill="#FFC2C8" stroke="#D62839" strokeWidth="3" />
        <path d="M44 74q16-18 32 0" stroke="#D62839" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="88" cy="32" r="5" fill="#FF97A1" />
        <circle cx="30" cy="40" r="3" fill="#F26471" />
      </svg>
      <h3 className="mt-3 text-lg font-bold text-red-900">{title}</h3>
      {message && <p className="muted mt-1 max-w-sm text-sm">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
