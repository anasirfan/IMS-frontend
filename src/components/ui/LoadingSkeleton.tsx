'use client';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center py-1">
          <div className="skeleton h-3.5 w-32" />
          <div className="skeleton h-3.5 w-48" />
          <div className="skeleton h-3.5 w-24" />
          <div className="skeleton h-3.5 w-20" />
          <div className="skeleton h-3.5 w-16" />
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-5 space-y-3">
      <div className="skeleton h-3 w-24" />
      <div className="skeleton h-7 w-16" />
    </div>
  );
}

export function MetricsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="w-72 flex-shrink-0">
          <div className="skeleton h-8 w-full mb-3 rounded-lg" />
          {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
            <div key={j} className="skeleton h-24 w-full mb-2 rounded-xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
