function ThemeToggle({ theme, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-semibold text-surface-text transition hover:opacity-90"
    >
      {theme === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
    </button>
  );
}

export default ThemeToggle;
