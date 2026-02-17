function AnnouncementTicker({ items = [] }) {
  const messages = items.filter(Boolean);

  if (!messages.length) {
    return null;
  }

  const combinedText = messages.join('   •   ');

  return (
    <section className="ticker-wrap rounded-xl border border-surface-border bg-surface-card px-3 py-2">
      <div className="ticker-track text-sm font-medium text-surface-text" aria-label="Pengumuman sekolah berjalan">
        <span className="ticker-text">{combinedText}</span>
        <span className="ticker-text" aria-hidden="true">{combinedText}</span>
      </div>
    </section>
  );
}

export default AnnouncementTicker;
