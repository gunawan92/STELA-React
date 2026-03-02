import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DashboardHeader from './components/layout/DashboardHeader'
import PageContainer from './components/layout/PageContainer'
import RfidAttendance6Slot from './components/rfid/rfidAttendance6slot'
import ScanAttendancePanel from './components/scan/ScanAttendance2D'
import StatsGrid from './components/stats/StatsGrid'
import StudentSkeleton from './components/students/StudentSkeleton'
import SettingsDrawer from './components/ui/SettingsDrawer'
import { useAttendanceStats } from './hooks/useAttendanceStats'
import { useInternetStatus } from './hooks/useInternetStatus'
import { useRealtimeDashboard } from './hooks/useRealtimeDashboard'
import { useSchools } from './hooks/useSchools'
import { useStudents } from './hooks/useStudents'
import { useTheme } from './hooks/useTheme'
import { showErrorAlert, showSuccessAlert } from './lib/alerts'
import {
  autoAssignRfidPorts,
  fetchRfidPortState,
} from './services/devicePortsApi'
import { fetchLateConfig, updateLateConfig } from './services/lateConfigApi'
import { buildSchoolLogoUrl } from './services/schoolApi'

const RFID_SLOTS = Array.from({ length: 6 }, (_, index) => ({
  id: `RFID_${index + 1}`,
  label: `RFID ${index + 1}`,
}))
const ACTIVE_MODE_STORAGE_KEY = 'stela-active-mode'
const VALID_MODES = new Set(['rfid', 'scan'])
const CAMERA_QUALITY_STORAGE_KEY = 'stela-camera-quality'
const VALID_CAMERA_QUALITY = new Set(['low', 'medium', 'high'])
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

function normalizeRfidSlot(value) {
  const normalized = String(value || '')
    .trim()
    .toUpperCase()
  if (!normalized) return null

  const withUnderscore = normalized.replace(/\s+/g, '_')
  const slotMatch = withUnderscore.match(/^RFID_(\d+)$/)
  if (slotMatch) return `RFID_${slotMatch[1]}`

  if (/^\d+$/.test(withUnderscore)) return `RFID_${withUnderscore}`
  return null
}

function getStudentRfidSlot(student) {
  const slotCandidates = [
    student?.rfidGate,
    student?.rfid_gate,
    student?.rfidSlot,
    student?.rfid_slot,
    student?.gate,
    student?.gateId,
    student?.gate_id,
  ]

  for (const candidate of slotCandidates) {
    const slot = normalizeRfidSlot(candidate)
    if (slot) return slot
  }

  return null
}

function App() {
  const [activeMode, setActiveMode] = useState(getStoredActiveMode)
  const [cameraQuality, setCameraQuality] = useState(getStoredCameraQuality)
  const [scanDeviceId, setScanDeviceId] = useState(getStoredScanDeviceId)
  const [selectedSchoolId, setSelectedSchoolId] = useState(getStoredSchoolId)
  const [lateCutoffTime, setLateCutoffTime] = useState('07:00')
  const [isSavingLateCutoff, setIsSavingLateCutoff] = useState(false)
  const [isAutoAssigningPorts, setIsAutoAssigningPorts] = useState(false)
  const [rfidPortState, setRfidPortState] = useState({
    slots: RFID_SLOTS.map((slot, index) => ({
      slot: slot.id,
      set: index + 1,
      com: null,
    })),
    availablePorts: [],
    updatedAt: null,
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const studentsQuery = useStudents(selectedSchoolId)
  const statsQuery = useAttendanceStats()
  const schoolsQuery = useSchools()
  const { isOnline, pingMs, statusLabel } = useInternetStatus()
  useRealtimeDashboard(selectedSchoolId)
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

  const mappedRfidPorts = useMemo(() => {
    const bySlot = {}
    for (const slot of rfidPortState?.slots || []) {
      const normalizedSlot = normalizeRfidSlot(slot?.slot)
      if (!normalizedSlot) continue
      bySlot[normalizedSlot] = String(slot?.com || '').trim() || '-'
    }
    for (const slot of RFID_SLOTS) {
      if (!bySlot[slot.id]) bySlot[slot.id] = '-'
    }
    return bySlot
  }, [rfidPortState?.slots])

  const latestStudentBySlot = useMemo(
    () =>
      RFID_SLOTS.map((slot) => {
        const latestStudent =
          students
            .filter(
              (student) =>
                getStudentRfidSlot(student) === slot.id &&
                student.attendanceStatus !== 'BELUM_TAP'
            )
            .sort((a, b) => getTapOrderValue(b) - getTapOrderValue(a))[0] ||
          null

        return {
          ...slot,
          student: latestStudent,
          configuredPort: mappedRfidPorts[slot.id] || '-',
        }
      }),
    [mappedRfidPorts, students]
  )
  const resolvedSchoolName =
    selectedSchool?.name ||
    import.meta.env.VITE_SCHOOL_NAME ||
    'SMK STELA INDONESIA'
  const localSchoolLogoUrl = selectedSchool?.id
    ? buildSchoolLogoUrl(selectedSchool.id)
    : import.meta.env.VITE_SCHOOL_LOGO_URL || ''
  const remoteAssetBaseUrl = (
    import.meta.env.VITE_MITRA_ASSET_BASE_URL || 'https://mitra.stela.id'
  ).replace(/\/+$/, '')
  const remoteSchoolLogoUrl = selectedSchool?.pathFile
    ? `${remoteAssetBaseUrl}/${String(selectedSchool.pathFile).replace(/^\/+/, '')}`
    : ''
  const resolvedSchoolLogoUrl = localSchoolLogoUrl

  const statCards = useMemo(() => {
    if (!stats) return []

    return [
      { label: 'Murid Ontime', value: stats.ontimeCount, tone: 'primary' },
      { label: 'Murid Terlambat', value: stats.lateCount, tone: 'secondary' },
      { label: 'Sudah Taping', value: stats.totalTapCount, tone: 'info' },
      { label: 'Belum Taping', value: stats.notTapCount, tone: 'danger' },
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

  const refreshRfidPorts = useCallback(async () => {
    try {
      const nextState = await fetchRfidPortState()
      setRfidPortState({
        slots: Array.isArray(nextState?.slots) ? nextState.slots : [],
        availablePorts: Array.isArray(nextState?.availablePorts)
          ? nextState.availablePorts
          : [],
        updatedAt: nextState?.updatedAt || new Date().toISOString(),
      })
    } catch (error) {
      showErrorAlert(
        error?.message || 'Gagal membaca mapping port RFID backend.'
      )
    }
  }, [])

  useEffect(() => {
    void refreshRfidPorts()
  }, [refreshRfidPorts])

  useEffect(() => {
    const intervalId = setInterval(() => {
      void refreshRfidPorts()
    }, 15000)

    return () => clearInterval(intervalId)
  }, [refreshRfidPorts])

  useEffect(() => {
    let isActive = true

    async function loadLateCutoff() {
      if (!selectedSchoolId) {
        if (isActive) setLateCutoffTime('07:00')
        return
      }

      try {
        const result = await fetchLateConfig(selectedSchoolId)
        const rawTime = String(result?.late_cutoff_time || '07:00:00')
        const uiTime = rawTime.slice(0, 5)
        if (isActive) setLateCutoffTime(uiTime)
      } catch {
        if (isActive) setLateCutoffTime('07:00')
      }
    }

    void loadLateCutoff()

    return () => {
      isActive = false
    }
  }, [selectedSchoolId])

  async function handleSaveLateCutoff() {
    if (!selectedSchoolId) {
      showErrorAlert('Pilih sekolah terlebih dahulu.')
      return
    }

    const normalized = String(lateCutoffTime || '').trim()
    if (!/^\d{2}:\d{2}$/.test(normalized)) {
      showErrorAlert('Format jam batas telat harus HH:mm.')
      return
    }

    setIsSavingLateCutoff(true)
    try {
      const result = await updateLateConfig({
        schoolId: selectedSchoolId,
        lateCutoffTime: `${normalized}:00`,
      })
      const uiTime = String(
        result?.late_cutoff_time || `${normalized}:00`
      ).slice(0, 5)
      setLateCutoffTime(uiTime)
      showSuccessAlert('Batas telat global berhasil disimpan.')
    } catch (error) {
      showErrorAlert(error?.message || 'Gagal menyimpan batas telat.')
    } finally {
      setIsSavingLateCutoff(false)
    }
  }

  async function handleAutoAssignPorts() {
    setIsAutoAssigningPorts(true)
    try {
      const nextState = await autoAssignRfidPorts()
      setRfidPortState({
        slots: Array.isArray(nextState?.slots) ? nextState.slots : [],
        availablePorts: Array.isArray(nextState?.availablePorts)
          ? nextState.availablePorts
          : [],
        updatedAt: nextState?.updatedAt || new Date().toISOString(),
      })
      showSuccessAlert('Auto assign port COM berhasil.')
    } catch (error) {
      showErrorAlert(error?.message || 'Gagal auto assign port RFID.')
    } finally {
      setIsAutoAssigningPorts(false)
    }
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
          <div>
            {/* <p className="text-sm text-surface-soft">
              {activeMode === 'rfid'
                ? 'Siswa tap kartu, respon muncul realtime di panel RFID masing-masing. Mapping port per RFID dapat dilihat di panel dan di Settings.'
                : 'Scan QR Kartu dari kamera, nama siswa akan tampil setelah absen.'}
            </p> */}
          </div>

          {isLoading ? (
            <StudentSkeleton count={6} columns={3} />
          ) : activeMode === 'scan' ? (
            <ScanAttendancePanel
              scanDeviceId={scanDeviceId}
              selectedSchoolId={selectedSchoolId}
              rfidPorts={mappedRfidPorts}
            />
          ) : (
            <RfidAttendance6Slot latestStudentBySlot={latestStudentBySlot} />
          )}
        </div>

        <aside className="space-y-3 rounded-2xl border border-surface-border bg-surface-muted/40 p-4 mt-6 lg:mt-4">
          <div>
            <h2 className="text-xl font-bold text-surface-text">
              Statistik Harian
            </h2>
            {/* <p className="text-sm text-surface-soft">
              Menggunakan data realtime.
            </p> */}
          </div>

          <StatsGrid cards={statCards} columns={1} variant="solid" />
        </aside>
      </section>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
        cameraQuality={cameraQuality}
        onChangeCameraQuality={setCameraQuality}
        rfidPorts={mappedRfidPorts}
        availableRfidPorts={rfidPortState.availablePorts}
        onRefreshRfidPorts={refreshRfidPorts}
        onAutoAssignRfidPorts={handleAutoAssignPorts}
        isAutoAssigningRfidPorts={isAutoAssigningPorts}
        scanDeviceId={scanDeviceId}
        onChangeScanDeviceId={setScanDeviceId}
        schools={schools}
        selectedSchoolId={selectedSchool?.id || ''}
        onChangeSelectedSchoolId={setSelectedSchoolId}
        lateCutoffTime={lateCutoffTime}
        onChangeLateCutoffTime={setLateCutoffTime}
        onSaveLateCutoff={handleSaveLateCutoff}
        isSavingLateCutoff={isSavingLateCutoff}
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
