import { useEffect, useMemo, useRef, useState } from 'react'
import DashboardHeader from './components/layout/DashboardHeader'
import PageContainer from './components/layout/PageContainer'
import ScanAttendancePanel from './components/scan/ScanAttendance2D'
import StatsGrid from './components/stats/StatsGrid'
import StudentCard from './components/students/StudentCard'
import StudentSkeleton from './components/students/StudentSkeleton'
import SettingsDrawer from './components/ui/SettingsDrawer'
import { useAttendanceStats } from './hooks/useAttendanceStats'
import { useInternetStatus } from './hooks/useInternetStatus'
import { useRealtimeDashboard } from './hooks/useRealtimeDashboard'
import { useScanLatest } from './hooks/useScanLatest'
import { useSchools } from './hooks/useSchools'
import { useStudents } from './hooks/useStudents'
import { useTheme } from './hooks/useTheme'
import { showErrorAlert } from './lib/alerts'
import { buildSchoolLogoUrl } from './services/schoolApi'

const RFID_SLOTS = Array.from({ length: 6 }, (_, index) => ({
  id: `RFID_${index + 1}`,
  label: `RFID ${index + 1}`,
}))
const ACTIVE_MODE_STORAGE_KEY = 'stela-active-mode'
const VALID_MODES = new Set(['rfid', 'scan'])
const CAMERA_QUALITY_STORAGE_KEY = 'stela-camera-quality'
const VALID_CAMERA_QUALITY = new Set(['low', 'medium', 'high'])
const RFID_PORTS_STORAGE_KEY = 'stela-rfid-ports'
const SCAN_DEVICE_ID_STORAGE_KEY = 'stela-scan-device-id'
const SCHOOL_ID_STORAGE_KEY = 'stela-school-id'

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

function getStoredCameraQuality() {
  try {
    const saved = window.localStorage.getItem(CAMERA_QUALITY_STORAGE_KEY)
    return VALID_CAMERA_QUALITY.has(saved) ? saved : 'medium'
  } catch {
    return 'medium'
  }
}

function setStoredCameraQuality(quality) {
  try {
    window.localStorage.setItem(CAMERA_QUALITY_STORAGE_KEY, quality)
  } catch {
    // ignore storage errors
  }
}

function getDefaultRfidPorts() {
  return RFID_SLOTS.reduce((accumulator, slot, index) => {
    accumulator[slot.id] = `COM${index + 1}`
    return accumulator
  }, {})
}

function getStoredRfidPorts() {
  try {
    const saved = window.localStorage.getItem(RFID_PORTS_STORAGE_KEY)
    if (!saved) return getDefaultRfidPorts()

    const parsed = JSON.parse(saved)
    const defaults = getDefaultRfidPorts()

    return RFID_SLOTS.reduce((accumulator, slot) => {
      const value = parsed?.[slot.id]
      accumulator[slot.id] =
        typeof value === 'string' && value.trim()
          ? value.trim()
          : defaults[slot.id]
      return accumulator
    }, {})
  } catch {
    return getDefaultRfidPorts()
  }
}

function setStoredRfidPorts(ports) {
  try {
    window.localStorage.setItem(RFID_PORTS_STORAGE_KEY, JSON.stringify(ports))
  } catch {
    // ignore storage errors
  }
}

function getStoredScanDeviceId() {
  try {
    const saved = window.localStorage.getItem(SCAN_DEVICE_ID_STORAGE_KEY)
    return saved?.trim() ? saved.trim() : 'DEV2026'
  } catch {
    return 'DEV2026'
  }
}

function setStoredScanDeviceId(deviceId) {
  try {
    window.localStorage.setItem(SCAN_DEVICE_ID_STORAGE_KEY, deviceId)
  } catch {
    // ignore storage errors
  }
}

function getStoredSchoolId() {
  try {
    return window.localStorage.getItem(SCHOOL_ID_STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

function setStoredSchoolId(schoolId) {
  try {
    window.localStorage.setItem(SCHOOL_ID_STORAGE_KEY, schoolId)
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

function mapInfoToStatus(info) {
  const normalized = String(info || '').toLowerCase()
  if (normalized === 'terlambat') return 'TERLAMBAT'
  if (normalized === 'hadir') return 'DATANG'
  return 'DATANG'
}

function normalizeScanDateTime(value) {
  if (!value) return null
  if (typeof value === 'string' && value.includes('T')) return value
  if (typeof value === 'string' && value.includes(' ')) {
    return value.replace(' ', 'T')
  }
  return null
}

function mapScanPayloadToStudent(payload) {
  if (!payload) return null

  return {
    id: payload.iduser || payload.serial || 'SCAN',
    name: payload.user_name || payload.serial || payload.iduser || 'Siswa',
    nis: payload.serial || payload.iduser || '-',
    classroom: payload.class_name || payload.idclass || '-',
    photoUrl: payload.photo_url || null,
    rfidGate: null,
    attendanceStatus: mapInfoToStatus(payload.info),
    attendanceLabel: payload.info || 'Hadir',
    lastCheckIn: payload.time || null,
    lastTapAt: normalizeScanDateTime(payload.tanggal_waktu),
  }
}

function App() {
  const [activeMode, setActiveMode] = useState(getStoredActiveMode)
  const [cameraQuality, setCameraQuality] = useState(getStoredCameraQuality)
  const [rfidPorts, setRfidPorts] = useState(getStoredRfidPorts)
  const [scanDeviceId, setScanDeviceId] = useState(getStoredScanDeviceId)
  const [selectedSchoolId, setSelectedSchoolId] = useState(getStoredSchoolId)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const studentsQuery = useStudents()
  const statsQuery = useAttendanceStats()
  const scanLatestQuery = useScanLatest()
  const schoolsQuery = useSchools()
  const { isOnline, pingMs, statusLabel } = useInternetStatus()
  useRealtimeDashboard()
  const { theme, toggleTheme } = useTheme()

  const lastErrorRef = useRef('')

  const isLoading = studentsQuery.isLoading || statsQuery.isLoading
  const students = studentsQuery.data ?? []
  const stats = statsQuery.data
  const schools = schoolsQuery.data ?? []

  const selectedSchool = useMemo(() => {
    if (!schools.length) return null
    if (selectedSchoolId) {
      const matched = schools.find((school) => school.id === selectedSchoolId)
      if (matched) return matched
    }
    return schools[0]
  }, [schools, selectedSchoolId])

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
          configuredPort: rfidPorts[slot.id] || '-',
        }
      }),
    [students, rfidPorts]
  )
  const latestScannedStudent = useMemo(
    () =>
      students
        .filter((student) => student.attendanceStatus !== 'BELUM_TAP')
        .sort((a, b) => getTapOrderValue(b) - getTapOrderValue(a))[0] || null,
    [students]
  )
  const liveScannedStudent = useMemo(
    () => mapScanPayloadToStudent(scanLatestQuery.data),
    [scanLatestQuery.data]
  )
  const displayedScannedStudent = liveScannedStudent
  const resolvedSchoolName =
    selectedSchool?.name || import.meta.env.VITE_SCHOOL_NAME || 'SMK STELA INDONESIA'
  const localSchoolLogoUrl = selectedSchool?.id
    ? buildSchoolLogoUrl(selectedSchool.id)
    : import.meta.env.VITE_SCHOOL_LOGO_URL || ''
  const remoteAssetBaseUrl =
    (import.meta.env.VITE_MITRA_ASSET_BASE_URL || 'https://mitra.stela.id').replace(
      /\/+$/,
      ''
    )
  const remoteSchoolLogoUrl = selectedSchool?.pathFile
    ? `${remoteAssetBaseUrl}/${String(selectedSchool.pathFile).replace(/^\/+/, '')}`
    : ''
  const resolvedSchoolLogoUrl = localSchoolLogoUrl

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      { label: 'Datang', value: stats.arrivedCount, tone: 'primary' },
      { label: 'Terlambat', value: stats.lateCount, tone: 'secondary' },
      { label: 'Tidak Absen', value: stats.notTapCount, tone: 'danger' },
    ]
  }, [stats])

  useEffect(() => {
    const error = studentsQuery.error || statsQuery.error || schoolsQuery.error
    if (!error) return

    const message = error.message || 'Gagal memuat data dashboard.'
    if (lastErrorRef.current === message) return

    lastErrorRef.current = message
    showErrorAlert(message)
  }, [studentsQuery.error, statsQuery.error, schoolsQuery.error])

  useEffect(() => {
    setStoredActiveMode(activeMode)
  }, [activeMode])

  useEffect(() => {
    setStoredCameraQuality(cameraQuality)
  }, [cameraQuality])

  useEffect(() => {
    setStoredRfidPorts(rfidPorts)
  }, [rfidPorts])

  useEffect(() => {
    setStoredScanDeviceId(scanDeviceId)
  }, [scanDeviceId])

  useEffect(() => {
    if (!schools.length) return
    if (!selectedSchoolId) {
      setSelectedSchoolId(schools[0].id)
      return
    }
    const exists = schools.some((school) => school.id === selectedSchoolId)
    if (!exists) {
      setSelectedSchoolId(schools[0].id)
    }
  }, [schools, selectedSchoolId])

  useEffect(() => {
    if (!selectedSchoolId) return
    setStoredSchoolId(selectedSchoolId)
  }, [selectedSchoolId])

  function handleChangeRfidPort(slotId, value) {
    setRfidPorts((previous) => ({
      ...previous,
      [slotId]: value,
    }))
  }

  useEffect(() => {
    if (!isSettingsOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSettingsOpen])

  return (
    <PageContainer>
      <DashboardHeader
        activeMode={activeMode}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        schoolName={resolvedSchoolName}
        schoolLogoUrl={resolvedSchoolLogoUrl}
        schoolLogoFallbackUrl={remoteSchoolLogoUrl}
      />

      <section className="grid items-start gap-4 lg:grid-cols-[minmax(0,3.65fr)_minmax(13.5rem,0.62fr)]">
        <div className="space-y-4">
          {/* <div className="inline-flex w-fit rounded-lg border border-surface-border bg-surface-card p-1">
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
          </div> */}
          <div>
            <p className="text-sm text-surface-soft">
              {activeMode === 'rfid'
                ? 'Siswa tap kartu, respon muncul realtime di panel RFID masing-masing. Mapping port per RFID dapat dilihat di panel dan di Settings.'
                : 'Scan QR Kartu dari kamera, nama siswa akan tampil setelah absen.'}
            </p>
          </div>

          {isLoading ? (
            <StudentSkeleton count={6} columns={3} />
          ) : activeMode === 'scan' ? (
            <ScanAttendancePanel
              student={displayedScannedStudent}
              cameraQuality={cameraQuality}
              scanDeviceId={scanDeviceId}
            />
          ) : (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {latestStudentBySlot.map((slot) => (
                <article
                  key={slot.id}
                  className="min-h-[18rem] rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-bold text-surface-text">
                        {slot.label}
                      </h3>
                      <p className="text-xs font-medium text-surface-soft">
                        Port: {slot.configuredPort}
                      </p>
                    </div>
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

        <aside className="space-y-3 rounded-2xl border border-surface-border bg-surface-muted/40 p-4 mt-6 lg:mt-0">
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

      {/* <AnnouncementTicker items={SCHOOL_ANNOUNCEMENTS} /> */}

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        cameraQuality={cameraQuality}
        onChangeCameraQuality={setCameraQuality}
        rfidPorts={rfidPorts}
        onChangeRfidPort={handleChangeRfidPort}
        scanDeviceId={scanDeviceId}
        onChangeScanDeviceId={setScanDeviceId}
        schools={schools}
        selectedSchoolId={selectedSchool?.id || ''}
        onChangeSelectedSchoolId={setSelectedSchoolId}
      />

      <footer className="flex flex-col gap-2 rounded-xl border border-surface-border bg-surface-card px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs tracking-wide">
          <span className="font-medium text-surface-soft">Powered by </span>
          <span className="font-bold text-brand-primary">STELA Indonesia</span>
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
