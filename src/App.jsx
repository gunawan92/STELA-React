import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardHeader from './components/layout/DashboardHeader'
import PageContainer from './components/layout/PageContainer'
import ScanAttendancePanel from './components/scan/ScanAttendancePanel'
import StatsGrid from './components/stats/StatsGrid'
import StudentCard from './components/students/StudentCard'
import StudentSkeleton from './components/students/StudentSkeleton'
import AnnouncementTicker from './components/ui/AnnouncementTicker'
import { useAttendanceStats } from './hooks/useAttendanceStats'
import { useInternetStatus } from './hooks/useInternetStatus'
import { useRealtimeDashboard } from './hooks/useRealtimeDashboard'
import { useStudents } from './hooks/useStudents'
import { useTheme } from './hooks/useTheme'
import { showErrorAlert } from './lib/alerts'

const RFID_SLOTS = Array.from({ length: 6 }, (_, index) => ({
  id: `RFID_${index + 1}`,
  label: `RFID ${index + 1}`,
}))
const ACTIVE_MODE_STORAGE_KEY = 'stela-active-mode'
const VALID_MODES = new Set(['rfid', 'scan'])

function getStoredActiveMode() {
  try {
    const savedMode = window.localStorage.getItem(ACTIVE_MODE_STORAGE_KEY)
    return VALID_MODES.has(savedMode) ? savedMode : 'rfid'
  } catch {
    return 'rfid'
  }
}

function setStoredActiveMode(mode) {
  try {
    window.localStorage.setItem(ACTIVE_MODE_STORAGE_KEY, mode)
  } catch {
    // ignore storage errors
  }
}

const SCHOOL_ANNOUNCEMENTS = (
  import.meta.env.VITE_SCHOOL_ANNOUNCEMENTS ||
  'Selamat datang di sistem monitoring absen sekolah. | Jam masuk siswa pukul 07:00 WIB. | Tetap disiplin, tetap semangat belajar.'
)
  .split('|')
  .map((item) => item.trim())
  .filter(Boolean)

function getTapOrderValue(student) {
  if (student.lastTapAt) {
    const timestamp = Date.parse(student.lastTapAt)
    if (!Number.isNaN(timestamp)) return timestamp
  }

  if (student.lastCheckIn) {
    const [hours, minutes] = String(student.lastCheckIn)
      .split(':')
      .map((value) => Number(value))
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      return hours * 60 + minutes
    }
  }

  return -1
}

function App() {
  const [activeMode, setActiveMode] = useState(getStoredActiveMode)
  const studentsQuery = useStudents()
  const statsQuery = useAttendanceStats()
  const { isOnline, pingMs, statusLabel } = useInternetStatus()
  const { connectionStatus } = useRealtimeDashboard()
  const { theme, toggleTheme } = useTheme()

  const lastErrorRef = useRef('')

  const isLoading = studentsQuery.isLoading || statsQuery.isLoading
  const isFetching = studentsQuery.isFetching || statsQuery.isFetching
  const students = studentsQuery.data ?? []
  const stats = statsQuery.data

  const latestStudentBySlot = useMemo(
    () =>
      RFID_SLOTS.map((slot) => {
        const latestStudent =
          students
            .filter(
              (student) =>
                student.rfidGate === slot.id &&
                student.attendanceStatus !== 'BELUM_TAP'
            )
            .sort((a, b) => getTapOrderValue(b) - getTapOrderValue(a))[0] ||
          null

        return {
          ...slot,
          student: latestStudent,
        }
      }),
    [students]
  )
  const latestScannedStudent = useMemo(
    () =>
      students
        .filter((student) => student.attendanceStatus !== 'BELUM_TAP')
        .sort((a, b) => getTapOrderValue(b) - getTapOrderValue(a))[0] || null,
    [students]
  )

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      { label: 'Jumlah Datang', value: stats.arrivedCount, tone: 'primary' },
      { label: 'Jumlah Terlambat', value: stats.lateCount, tone: 'secondary' },
      { label: 'Jumlah Tidak Tap', value: stats.notTapCount, tone: 'danger' },
    ]
  }, [stats])

  useEffect(() => {
    const error = studentsQuery.error || statsQuery.error
    if (!error) return

    const message = error.message || 'Gagal memuat data dashboard.'
    if (lastErrorRef.current === message) return

    lastErrorRef.current = message
    showErrorAlert(message)
  }, [studentsQuery.error, statsQuery.error])

  useEffect(() => {
    setStoredActiveMode(activeMode)
  }, [activeMode])

  async function handleRefresh() {
    const [studentsResult, statsResult] = await Promise.all([
      studentsQuery.refetch(),
      statsQuery.refetch(),
    ])

    return {
      error: studentsResult.error || statsResult.error || null,
    }
  }

  return (
    <PageContainer>
      <DashboardHeader
        connectionStatus={connectionStatus}
        isRefreshing={isFetching}
        onRefresh={handleRefresh}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,3.65fr)_minmax(13.5rem,0.62fr)]">
        <div className="space-y-4">
          <div className="inline-flex w-fit rounded-lg border border-surface-border bg-surface-card p-1">
            <button
              type="button"
              onClick={() => setActiveMode('rfid')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeMode === 'rfid'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              Mode RFID
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('scan')}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeMode === 'scan'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              Mode Scan
            </button>
          </div>
          <div>
            <p className="text-sm text-surface-soft">
              {activeMode === 'rfid'
                ? 'Siswa tap kartu, respon muncul realtime di panel RFID masing-masing.'
                : 'Scan QR Kartu dari kamera, nama siswa akan tampil setelah absen.'}
            </p>
          </div>

          {isLoading ? (
            <StudentSkeleton count={6} columns={3} />
          ) : activeMode === 'scan' ? (
            <ScanAttendancePanel student={latestScannedStudent} />
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestStudentBySlot.map((slot) => (
                <article
                  key={slot.id}
                  className="min-h-[18rem] rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-surface-text">
                      {slot.label}
                    </h3>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-semibold ${
                        slot.student
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      }`}
                    >
                      {slot.student ? 'Selesai Tap' : 'Menunggu Tap'}
                    </span>
                  </div>

                  {slot.student ? (
                    <div className="h-[13.25rem] overflow-hidden rounded-lg">
                      <StudentCard student={slot.student} embedded />
                    </div>
                  ) : (
                    <div className="flex h-[13.25rem] items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-muted/60 text-center">
                      <div>
                        <p className="text-base font-semibold text-surface-text">
                          Belum ada tap kartu
                        </p>
                        <p className="mt-1 text-sm text-surface-soft">
                          Silakan siswa tap di {slot.label}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </section>
          )}
        </div>

        <aside className="space-y-3 rounded-2xl border border-surface-border bg-surface-muted/40 p-4 mt-14">
          <div>
            <h2 className="text-xl font-bold text-surface-text">
              Statistik Harian
            </h2>
            <p className="text-sm text-surface-soft">
              Menggunakan data realtime.
            </p>
          </div>

          <StatsGrid cards={statCards} columns={1} variant="solid" />

          {stats?.updatedAt ? (
            <p className="text-xs text-surface-soft">
              Update terakhir:{' '}
              {new Date(stats.updatedAt).toLocaleString('id-ID')}
            </p>
          ) : null}
        </aside>
      </section>

      <AnnouncementTicker items={SCHOOL_ANNOUNCEMENTS} />

      <footer className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold tracking-wide text-surface-soft">
          Powered by STELA Indonesia
        </p>
        <p className="inline-flex items-center gap-2 text-[11px] font-medium text-surface-soft">
          <span
            className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500'}`}
          />
          Internet: {statusLabel}
          {isOnline ? ` (${pingMs ?? '-'} ms)` : ''}
        </p>
      </footer>
    </PageContainer>
  )
}

export default App
