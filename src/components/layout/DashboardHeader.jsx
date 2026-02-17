import ReloadButton from '../ui/ReloadButton'
import ThemeToggle from '../ui/ThemeToggle'

const connectionMap = {
  connected: {
    label: 'Realtime Aktif',
    className:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  connecting: {
    label: 'Menghubungkan...',
    className:
      'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  disconnected: {
    label: 'Realtime Putus',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  error: {
    label: 'Error Realtime',
    className:
      'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  mock: {
    label: 'Mode Mock Lokal',
    className:
      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  },
}

function DashboardHeader({
  connectionStatus,
  onRefresh,
  isRefreshing,
  theme,
  onToggleTheme,
}) {
  const connection = connectionMap[connectionStatus] || connectionMap.mock
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
        </div>
        <h1 className="mt-2 text-2xl font-bold text-surface-text sm:text-3xl">
          Selamat Datang di
        </h1>{' '}
        <p className="text-5xl font-semibold text-brand-primary">
          {schoolName}
        </p>
        <p className="mt-1 text-sm text-surface-soft">
          Semangat pagi password K23F
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${connection.className}`}
        >
          {connection.label}
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <ReloadButton isLoading={isRefreshing} onRefresh={onRefresh} />
      </div>
    </header>
  )
}

export default DashboardHeader
