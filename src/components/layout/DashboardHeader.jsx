import SettingsButton from '../ui/SettingsButton'
import ThemeToggle from '../ui/ThemeToggle'

const modeMap = {
  rfid: {
    label: 'RFID',
    className:
      'bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900',
  },
  scan: {
    label: 'Scan',
    className:
      'bg-amber-100 text-amber-800 dark:bg-amber-400/25 dark:text-amber-200',
  },
}

function DashboardHeader({ activeMode, theme, onToggleTheme, onOpenSettings }) {
  const modeBadge = modeMap[activeMode] || modeMap.rfid
  const schoolName = import.meta.env.VITE_SCHOOL_NAME || 'SMK STELA INDONESIA'
  const schoolLogoUrl = import.meta.env.VITE_SCHOOL_LOGO_URL || ''

  return (
    <header className="flex flex-col gap-4 rounded-xl border border-surface-border bg-surface-muted p-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          {schoolLogoUrl ? (
            <img
              src={schoolLogoUrl}
              alt="Logo Sekolah"
              className="h-11 w-11 rounded-lg border border-surface-border object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-brand-primary text-xs font-bold text-white">
              LOGO
            </div>
          )}
          <div className="hidden text-sm text-surface-soft sm:block">
            <h1 className="mt-2 text-2xl font-medium text-surface-text sm:text-3xl">
              Selamat Datang di
            </h1>{' '}
            <p className="text-5xl font-bold text-brand-primary">
              {schoolName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${modeBadge.className}`}
        >
          {modeBadge.label}
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <SettingsButton onClick={onOpenSettings} />
      </div>
    </header>
  )
}

export default DashboardHeader
