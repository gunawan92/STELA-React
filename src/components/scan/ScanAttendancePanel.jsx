import { useEffect, useMemo, useRef, useState } from 'react'

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

function ScanAttendancePanel({ student }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraState, setCameraState] = useState('loading')
  const [cameraMessage, setCameraMessage] = useState('')
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

  useEffect(() => {
    let active = true

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unsupported')
        setCameraMessage('Browser ini belum mendukung akses kamera.')
        return
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
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
  }, [])

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
      </article>

      <article className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
        <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 shadow-sm">
          <p className="text-xs font-medium text-surface-soft">Nama</p>
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
                <p className="text-xs font-medium text-surface-soft">Kelas</p>
                <p className="text-4xl font-bold leading-tight text-surface-text">
                  {student?.classroom || '-'}
                </p>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-medium text-surface-soft">Jam</p>
                <p className="text-4xl font-bold leading-tight text-surface-text">
                  {attendanceTime}
                </p>
              </div>

              <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                <p className="text-xs font-medium text-surface-soft">Tanggal</p>
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
