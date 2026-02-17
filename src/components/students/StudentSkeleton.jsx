function StudentSkeleton({ count = 6, columns = 4 }) {
  const gridClass =
    columns === 2
      ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
      : columns === 3
        ? 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'
        : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  return (
    <section className={gridClass}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={`student-skeleton-${idx}`}
          className="h-72 animate-pulse rounded-xl border border-surface-border bg-surface-muted"
        />
      ))}
    </section>
  );
}

export default StudentSkeleton;
