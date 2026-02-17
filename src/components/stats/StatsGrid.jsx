import StatsCard from './StatsCard';

function StatsGrid({ cards, columns = 3, variant = 'default' }) {
  const gridClass =
    columns === 1
      ? 'grid grid-cols-1 gap-2'
      : columns === 2
        ? 'grid grid-cols-1 gap-4 md:grid-cols-2'
        : 'grid grid-cols-1 gap-4 md:grid-cols-3';

  if (!cards.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card p-6 text-sm text-surface-soft">
        Data statistik belum tersedia.
      </div>
    );
  }

  return (
    <section className={gridClass}>
      {cards.map((card) => (
        <StatsCard key={card.label} variant={variant} {...card} />
      ))}
    </section>
  );
}

export default StatsGrid;
