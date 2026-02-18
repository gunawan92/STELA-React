import { useQueryClient } from '@tanstack/react-query'
import jsQR from 'jsqr'
import { useEffect, useMemo, useRef, useState } from 'react'
import { postScanCheckin } from '../../services/scanApi'

function stopStream(stream) {
  if (!stream) return
  stream.getTracks().forEach((track) => track.stop())
}

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

function getCameraConstraint(quality) {
  if (quality === 'low') {
    return { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
  }
  if (quality === 'high') {
    return {
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      facingMode: 'user',
    }
  }
  return { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
}

function normalizeQrSerial(rawValue) {
  return String(rawValue || '')
    .trim()
    .replace(/\s+/g, '')
}

function ScanAttendancePanel({ student, cameraQuality = 'medium' }) {
  const queryClient = useQueryClient()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const isDetectingRef = useRef(false)
  const lastScanAtRef = useRef(0)
  const [cameraState, setCameraState] = useState('loading')
  const [cameraMessage, setCameraMessage] = useState('')
  const [imgError, setImgError] = useState(false)
  const [scanMessage, setScanMessage] = useState(
    'Arahkan QR ke area kotak scan.'
  )
  const [scanState, setScanState] = useState('idle')
  const [qrSupportState, setQrSupportState] = useState('loading')

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

  useEffect(() => {
    let mounted = true

    async function initQrDetector() {
      canvasRef.current = document.createElement('canvas')

      if (!('BarcodeDetector' in window)) {
        if (!mounted) return
        setQrSupportState('ready')
        setScanMessage('Scan QR fallback aktif.')
        return
      }

      try {
        if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
          const formats = await window.BarcodeDetector.getSupportedFormats()
          if (!formats.includes('qr_code')) {
            if (!mounted) return
            setQrSupportState('ready')
            setScanMessage('Scan QR fallback aktif.')
            return
          }
        }

        detectorRef.current = new window.BarcodeDetector({
          formats: ['qr_code'],
        })
        if (!mounted) return
        setQrSupportState('ready')
      } catch {
        if (!mounted) return
        setQrSupportState('ready')
        setScanMessage('Scan QR fallback aktif.')
      }
    }

    initQrDetector()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported')
        setCameraMessage('Browser ini belum mendukung akses kamera.')
        return
      }

      try {
        stopStream(streamRef.current)
        const stream = await navigator.mediaDevices.getUserMedia({
          video: getCameraConstraint(cameraQuality),
          audio: false,
        })

        if (!active) {
          stopStream(stream)
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }

        setCameraState('ready')
        setCameraMessage('')
      } catch (error) {
        setCameraState('error')
        setCameraMessage(
          error?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Mohon izinkan akses kamera.'
            : 'Kamera tidak dapat dijalankan. Periksa perangkat kamera.'
        )
      }
    }

    startCamera()

    return () => {
      active = false
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [cameraQuality])

  useEffect(() => {
    if (cameraState !== 'ready') return
    if (qrSupportState !== 'ready') return

    const intervalId = setInterval(async () => {
      const video = videoRef.current
      const detector = detectorRef.current
      if (!video) return
      if (video.readyState < 2) return
      if (isDetectingRef.current) return

      isDetectingRef.current = true

      try {
        let qrValue = null

        if (detector) {
          const barcodes = await detector.detect(video)
          qrValue =
            barcodes
              .map((item) => normalizeQrSerial(item.rawValue))
              .find(Boolean) || null
        } else {
          const canvas = canvasRef.current
          const width = video.videoWidth
          const height = video.videoHeight

          if (canvas && width > 0 && height > 0) {
            const context = canvas.getContext('2d', {
              willReadFrequently: true,
            })
            if (context) {
              canvas.width = width
              canvas.height = height
              context.drawImage(video, 0, 0, width, height)
              const imageData = context.getImageData(0, 0, width, height)
              const result = jsQR(imageData.data, width, height, {
                inversionAttempts: 'attemptBoth',
              })
              qrValue = normalizeQrSerial(result?.data)
            }
          }
        }

        if (!qrValue) return

        const now = Date.now()
        if (now - lastScanAtRef.current < 2500) return
        lastScanAtRef.current = now

        setScanState('processing')
        setScanMessage('QR terdeteksi, memproses...')

        const checkinResult = await postScanCheckin({
          serial: qrValue,
          device_id: 'DEV2026',
          tap_time: new Date().toISOString(),
          deskripsi: 'absen_perangkat',
        })

        queryClient.setQueryData(['scan-latest'], checkinResult)
        setScanState('success')
        setScanMessage(
          `Berhasil: ${checkinResult.user_name || checkinResult.serial || checkinResult.iduser}`
        )
      } catch (error) {
        const message = String(error?.message || '').trim()
        const lowerMessage = message.toLowerCase()

        if (lowerMessage.includes('tidak ditemukan')) {
          setScanState('error')
          setScanMessage('QR tidak cocok atau belum terdaftar.')
        } else if (
          lowerMessage.includes('failed to fetch') ||
          lowerMessage.includes('networkerror') ||
          lowerMessage.includes('cors')
        ) {
          setScanState('error')
          setScanMessage('Koneksi ke backend scan gagal. Cek API/CORS.')
        } else {
          setScanState('error')
          setScanMessage(message || 'Gagal memproses QR. Coba ulangi scan.')
        }
      } finally {
        isDetectingRef.current = false
      }
    }, 800)

    return () => {
      clearInterval(intervalId)
    }
  }, [cameraState, qrSupportState, queryClient])

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <article className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="relative mx-auto w-full max-w-[34rem] overflow-hidden rounded-lg border border-surface-border bg-black">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="aspect-square w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-[10%] rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.32)]" />
          {cameraState !== 'ready' ? (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-4 text-center">
              <p className="text-sm font-medium text-white">
                {cameraMessage || 'Mengaktifkan kamera...'}
              </p>
            </div>
          ) : null}
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
            {cameraState === 'ready'
              ? 'Kamera aktif'
              : cameraState === 'loading'
                ? 'Menyiapkan kamera'
                : 'Kamera bermasalah'}
          </div>
        </div>
      </article>
    </section>
  )
}

export default ScanAttendancePanel
