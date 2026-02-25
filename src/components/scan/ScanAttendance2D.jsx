import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { postScanCheckin } from '../../services/scanApi'
import { getSocketClient } from '../../services/socketClient'

function formatAttendanceDate(isoDate) {
  if (!isoDate) return '-'
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('id-ID')
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}

function normalizeScanSerial(payload) {
  if (!payload) return ''
  if (typeof payload === 'string') return payload.trim()
  if (typeof payload.serial === 'string') return payload.serial.trim()
  if (typeof payload.code === 'string') return payload.code.trim()
  return ''
}

function ScanAttendancePanel({ student, scanDeviceId = 'DEV2026' }) {
  const queryClient = useQueryClient()
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const lastScanAtRef = useRef(0)

  const [scanMessage, setScanMessage] = useState(
    'Siap menerima scan barcode...'
  )
  const [scanState, setScanState] = useState('idle')
  const [imgError, setImgError] = useState(false)

  const attendanceTime = student?.lastCheckIn || '-'
  const attendanceDate = formatAttendanceDate(student?.lastTapAt)
  const attendanceStatus = student ? 'Berhasil' : 'Menunggu Scan'
  const initials = useMemo(
    () => getInitials(student?.name || ''),
    [student?.name]
  )

  useEffect(() => {
    setImgError(false)
  }, [student?.photoUrl, student?.id])

  const processScan = useCallback(
    async (rawSerial) => {
      const serial = String(rawSerial || '').trim()
      if (!serial) return

      const now = Date.now()

      // Anti double scan 2.5 detik untuk semua sumber scan
      if (now - lastScanAtRef.current < 2500) {
        return
      }

      lastScanAtRef.current = now

      try {
        setScanState('processing')
        setScanMessage('Barcode terdeteksi, memproses...')

        const result = await postScanCheckin({
          serial,
          device_id: String(scanDeviceId).trim() || 'DEV2026',
          tap_time: new Date().toISOString(),
          deskripsi: 'absen_perangkat_usb',
        })

        queryClient.setQueryData(['scan-latest'], result)

        setScanState('success')
        setScanMessage(
          `Berhasil: ${result.user_name || result.serial || result.iduser}`
        )
      } catch (error) {
        const message = String(error?.message || '').toLowerCase()

        if (message.includes('tidak ditemukan')) {
          setScanState('error')
          setScanMessage('Barcode tidak terdaftar.')
        } else if (message.includes('network') || message.includes('cors')) {
          setScanState('error')
          setScanMessage('Koneksi ke backend gagal.')
        } else {
          setScanState('error')
          setScanMessage('Gagal memproses scan.')
        }
      }
    },
    [queryClient, scanDeviceId]
  )

  useEffect(() => {
    const handleKeyDown = async (e) => {
      const now = Date.now()

      // Reset buffer kalau jeda terlalu lama (manual typing)
      if (now - lastKeyTimeRef.current > 100) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const serial = bufferRef.current.trim()

        if (!serial) return
        bufferRef.current = ''
        await processScan(serial)

        return
      }

      // Tambahkan karakter ke buffer
      if (e.key.length === 1) {
        bufferRef.current += e.key
      }

      lastKeyTimeRef.current = now
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [processScan])

  useEffect(() => {
    const socket = getSocketClient()
    if (!socket) return

    const handleSocketScan = (payload) => {
      const serial = normalizeScanSerial(payload)
      if (!serial) return
      processScan(serial)
    }

    socket.on('scan', handleSocketScan)
    socket.on('scan:checkin', handleSocketScan)
    socket.connect()

    return () => {
      socket.off('scan', handleSocketScan)
      socket.off('scan:checkin', handleSocketScan)
    }
  }, [processScan])
  
  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <article className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="flex h-[420px] items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-muted">
          <div className="text-center">
            <p className="text-xl font-semibold text-surface-text">
              Siap menerima scan barcode
            </p>
            <p className="mt-2 text-sm text-surface-soft">Scanner USB aktif</p>
          </div>
        </div>

        <div className="mt-3 rounded-lg border border-surface-border bg-surface-muted/70 px-3 py-2">
          <p
            className={`text-sm font-medium ${
              scanState === 'success'
                ? 'text-emerald-700 dark:text-emerald-300'
                : scanState === 'error'
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-surface-soft'
            }`}
          >
            {scanMessage}
          </p>
        </div>
      </article>

      <article className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold text-brand-primary">Nama</p>
          <p className="text-3xl font-bold leading-tight text-surface-text">
            {student?.name || '-'}
          </p>
        </div>

        <div className="rounded-xl border border-surface-border bg-surface-card p-3 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[13rem_minmax(0,1fr)] sm:items-start">
            <div className="w-full min-w-52 overflow-hidden rounded-lg border border-surface-border bg-surface-muted">
              {!imgError && student?.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt={student.name}
                  onError={() => setImgError(true)}
                  className="aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center text-4xl font-bold text-surface-soft">
                  {initials || 'S'}
                </div>
              )}
            </div>

            <div className="min-w-0 space-y-4">
              <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-semibold text-brand-primary">
                  Kelas
                </p>
                <p className="text-4xl font-bold leading-tight text-surface-text">
                  {student?.classroom || '-'}
                </p>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-semibold text-brand-primary">Jam</p>
                <p className="text-4xl font-bold leading-tight text-surface-text">
                  {attendanceTime}
                </p>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-semibold text-brand-primary">
                  Tanggal
                </p>
                <p className="text-4xl font-bold leading-tight text-surface-text">
                  {attendanceDate}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <p
            className={`text-5xl font-bold leading-tight ${
              student
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-surface-soft'
            }`}
          >
            {attendanceStatus}
          </p>
          <div className="mt-2 text-xs font-medium text-surface-soft">
            {scanState === 'ready'
              ? 'Scanner aktif'
              : scanState === 'loading'
                ? 'Menyiapkan scanner'
                : 'Scanner bermasalah'}
          </div>
        </div>
      </article>
    </section>
  )
}

export default ScanAttendancePanel
