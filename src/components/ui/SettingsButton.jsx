import { IconSettings } from '@tabler/icons-react'

function SettingsButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Pengaturan frontend"
      title="Pengaturan frontend"
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border bg-surface-card text-surface-text transition hover:bg-surface-muted"
    >
      <IconSettings size={20} stroke={1.9} />
    </button>
  )
}

export default SettingsButton
