import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { postScanCheckin } from '../../services/scanApi'
import { getSocketClient } from '../../services/socketClient'

const MIN_SCAN_INTERVAL_MS = 2500

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

function normalizeComPort(value) {
  const raw = String(value || '')
    .trim()
    .toUpperCase()
  return raw || null
}

function sortSlotId(a, b) {
  const aMatch = String(a).match(/(\d+)/)
  const bMatch = String(b).match(/(\d+)/)
  if (aMatch && bMatch) return Number(aMatch[1]) - Number(bMatch[1])
  return String(a).localeCompare(String(b))
}

function getSlotNumber(slotId) {
  const match = String(slotId || '').match(/(\d+)/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

function formatScannerName(slotId) {
  const slotNumber = getSlotNumber(slotId)
  if (!slotNumber) return 'Scanner'
  return `Scanner ${slotNumber}`
}

function getPanelKeyBySlotId(slotId) {
  const slotNumber = getSlotNumber(slotId)
  if (!slotNumber) return 'A'
  return slotNumber % 2 === 0 ? 'A' : 'B'
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

function normalizeScanPayload(payload) {
  if (!payload) return null
  if (typeof payload === 'string') {
    const serial = payload.trim()
    return serial
      ? {
          serial,
          rfidPort: null,
        }
      : null
  }

  const serial = String(
    payload.serial || payload.iduser || payload.code || ''
  ).trim()
  if (!serial) return null

  return {
    serial,
    rfidPort: normalizeComPort(payload.rfid_port),
  }
}

function mapCheckinPayloadToStudent(payload) {
  if (!payload) return null

  return {
    id: payload.iduser || payload.serial || 'SCAN',
    name: payload.user_name || payload.serial || payload.iduser || 'Siswa',
    nis: payload.serial || payload.iduser || '-',
    classroom: payload.class_name || payload.idclass || '-',
    photoUrl: payload.photo_url || null,
    attendanceStatus: mapInfoToStatus(payload.info),
    attendanceLabel: payload.info || 'Hadir',
    lastCheckIn: payload.time || null,
    lastTapAt: normalizeScanDateTime(payload.tanggal_waktu),
  }
}

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
  return ['1', 'true', 'yes', 'y', 'in'].includes(normalized)
}

function resolveTapLabel(payload) {
  const tapLabel = String(payload?.tap_label || payload?.tapLabel || '')
    .trim()
    .toLowerCase()
  if (tapLabel.includes('pulang')) return 'Tap Pulang'
  if (tapLabel.includes('masuk')) return 'Tap Masuk'

  const tapMode = String(payload?.tap_mode || payload?.tapMode || '')
    .trim()
    .toLowerCase()
  if (tapMode === 'pulang' || tapMode === 'out') return 'Tap Pulang'
  if (tapMode === 'masuk' || tapMode === 'in') return 'Tap Masuk'

  const inFlags = [payload?.status_in, payload?.has_in, payload?.in_exists]

  const outFlags = [payload?.status_out, payload?.has_out, payload?.out_exists]

  const statusHints = [
    payload?.status,
    payload?.log_status,
    payload?.aro_status,
  ]
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean)

  const hasInFromQuery =
    inFlags.some((value) => isTruthyFlag(value)) ||
    statusHints.some((value) => value === 'in' || value.includes('status in'))
  const hasOutFromQuery =
    outFlags.some((value) => isTruthyFlag(value)) || statusHints.includes('out')

  // Rule bisnis dari query aro_log: jika ada jejak IN, labelkan Tap Pulang.
  if (hasInFromQuery) {
    return 'Tap Pulang'
  }

  if (hasOutFromQuery) {
    return 'Tap Pulang'
  }

  return 'Tap Masuk'
}

function createInitialPanelState(key) {
  return {
    key,
    student: null,
    scanState: 'idle',
    message: 'Menunggu scan...',
    tapLabel: null,
    lastSlotId: null,
    lastPort: null,
  }
}

function formatScannerList(slotIds) {
  if (!slotIds.length) return '-'
  return slotIds.map((slotId) => formatScannerName(slotId)).join(', ')
}

function ScanAttendancePanel({
  scanDeviceId = '',
  selectedSchoolId = '',
  rfidPorts = {},
}) {
  const queryClient = useQueryClient()
  const bufferRef = useRef('')
  const lastKeyTimeRef = useRef(0)
  const lastScanAtBySlotRef = useRef(new Map())

  const [panelState, setPanelState] = useState({
    A: createInitialPanelState('A'),
    B: createInitialPanelState('B'),
  })
  const [imgErrorByPanel, setImgErrorByPanel] = useState({
    A: false,
    B: false,
  })

  const activeSlots = useMemo(() => {
    return Object.entries(rfidPorts || {})
      .map(([slotId, port]) => ({
        slotId,
        port: normalizeComPort(port),
      }))
      .filter((item) => Boolean(item.slotId && item.port && item.port !== '-'))
      .sort((a, b) => sortSlotId(a.slotId, b.slotId))
  }, [rfidPorts])

  const portToSlotMap = useMemo(() => {
    const map = new Map()
    for (const slot of activeSlots) {
      map.set(slot.port, slot.slotId)
    }
    return map
  }, [activeSlots])

  const groupedSlots = useMemo(() => {
    const grouped = { A: [], B: [] }
    for (const slot of activeSlots) {
      const panelKey = getPanelKeyBySlotId(slot.slotId)
      grouped[panelKey].push(slot)
    }
    return grouped
  }, [activeSlots])

  const resolveSlotId = useCallback(
    (rfidPort) => {
      const normalizedPort = normalizeComPort(rfidPort)
      if (normalizedPort && portToSlotMap.has(normalizedPort)) {
        return portToSlotMap.get(normalizedPort)
      }
      return activeSlots[0]?.slotId || null
    },
    [activeSlots, portToSlotMap]
  )

  const updatePanel = useCallback((panelKey, updater) => {
    setPanelState((prev) => ({
      ...prev,
      [panelKey]: updater(prev[panelKey] || createInitialPanelState(panelKey)),
    }))
  }, [])

  const processScan = useCallback(
    async ({ serial: rawSerial, rfidPort }) => {
      const serial = String(rawSerial || '').trim()
      if (!serial) return

      const slotId = resolveSlotId(rfidPort)
      if (!slotId) return

      const panelKey = getPanelKeyBySlotId(slotId)
      const now = Date.now()
      const lastScanAt = lastScanAtBySlotRef.current.get(slotId) || 0
      if (now - lastScanAt < MIN_SCAN_INTERVAL_MS) return
      lastScanAtBySlotRef.current.set(slotId, now)

      const portValue =
        normalizeComPort(rfidPort) ||
        activeSlots.find((slot) => slot.slotId === slotId)?.port ||
        null
      const resolvedDeviceId = String(scanDeviceId || '').trim()

      updatePanel(panelKey, (current) => ({
        ...current,
        scanState: 'processing',
        message: `Memproses scan ${serial}...`,
        lastSlotId: slotId,
        lastPort: portValue,
      }))

      try {
        const result = await postScanCheckin({
          serial,
          device_id: resolvedDeviceId,
          operator: resolvedDeviceId,
          school_id: selectedSchoolId || undefined,
          idschool: selectedSchoolId || undefined,
          tap_time: new Date().toISOString(),
          rfid_port: portValue || undefined,
          deskripsi: 'absen_perangkat',
        })

        queryClient.setQueryData(['scan-latest'], result)

        updatePanel(panelKey, (current) => ({
          ...current,
          scanState: 'success',
          student: mapCheckinPayloadToStudent(result),
          tapLabel: resolveTapLabel(result),
          message: `Berhasil: ${result.user_name || result.serial || result.iduser}`,
          lastSlotId: slotId,
          lastPort: result.rfid_port || portValue,
        }))
      } catch (error) {
        const message = String(error?.message || '').toLowerCase()
        let readableMessage = 'Gagal memproses scan.'

        if (message.includes('tidak ditemukan')) {
          readableMessage = 'Barcode tidak terdaftar.'
        } else if (message.includes('network') || message.includes('cors')) {
          readableMessage = 'Koneksi ke backend gagal.'
        }

        updatePanel(panelKey, (current) => ({
          ...current,
          scanState: 'error',
          message: readableMessage,
          lastSlotId: slotId,
          lastPort: portValue,
        }))
      }
    },
    [
      activeSlots,
      queryClient,
      resolveSlotId,
      scanDeviceId,
      selectedSchoolId,
      updatePanel,
    ]
  )

  useEffect(() => {
    const handleKeyDown = async (e) => {
      const now = Date.now()
      if (now - lastKeyTimeRef.current > 100) {
        bufferRef.current = ''
      }

      if (e.key === 'Enter') {
        const serial = bufferRef.current.trim()
        if (!serial) return
        bufferRef.current = ''
        await processScan({ serial, rfidPort: null })
        return
      }

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

    const handleSocketRawScan = (payload) => {
      const normalized = normalizeScanPayload(payload)
      if (!normalized) return
      void processScan(normalized)
    }

    const handleSocketCheckin = (payload) => {
      if (!payload || typeof payload !== 'object') return
      if (
        selectedSchoolId &&
        payload.idschool &&
        String(payload.idschool) !== String(selectedSchoolId)
      ) {
        return
      }

      const slotId = resolveSlotId(payload.rfid_port)
      if (!slotId) return
      const panelKey = getPanelKeyBySlotId(slotId)

      updatePanel(panelKey, (current) => ({
        ...current,
        scanState: 'success',
        student: mapCheckinPayloadToStudent(payload),
        tapLabel: resolveTapLabel(payload),
        message: `Berhasil: ${payload.user_name || payload.serial || payload.iduser}`,
        lastSlotId: slotId,
        lastPort: payload.rfid_port || current.lastPort,
      }))
    }

    socket.on('scan', handleSocketRawScan)
    socket.on('scan:raw', handleSocketRawScan)
    socket.on('scan:checkin', handleSocketCheckin)
    socket.connect()

    return () => {
      socket.off('scan', handleSocketRawScan)
      socket.off('scan:raw', handleSocketRawScan)
      socket.off('scan:checkin', handleSocketCheckin)
    }
  }, [processScan, resolveSlotId, selectedSchoolId, updatePanel])

  const panelConfigs = [
    {
      key: 'A',
      title: 'Tampilan A',
      description: `Scanner: ${formatScannerList(groupedSlots.A.map((item) => item.slotId))}`,
      emptyText: 'Menunggu scan dari Scanner 2/4/6',
    },
    {
      key: 'B',
      title: 'Tampilan B',
      description: `Scanner: ${formatScannerList(groupedSlots.B.map((item) => item.slotId))}`,
      emptyText: 'Menunggu scan dari Scanner 1/3/5',
    },
  ]

  useEffect(() => {
    setImgErrorByPanel((prev) => ({
      ...prev,
      A: false,
    }))
  }, [panelState.A?.student?.id, panelState.A?.student?.photoUrl])

  useEffect(() => {
    setImgErrorByPanel((prev) => ({
      ...prev,
      B: false,
    }))
  }, [panelState.B?.student?.id, panelState.B?.student?.photoUrl])

  function setPanelImgError(panelKey, value) {
    setImgErrorByPanel((prev) => ({
      ...prev,
      [panelKey]: value,
    }))
  }

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {panelConfigs.map((config) => {
        const panel =
          panelState[config.key] || createInitialPanelState(config.key)
        const student = panel.student
        const attendanceTime = student?.lastCheckIn || '-'
        const attendanceDate = formatAttendanceDate(student?.lastTapAt)
        const attendanceStatus =
          panel.scanState === 'success' && student
            ? `Berhasil - ${panel.tapLabel || 'Tap Masuk'}`
            : 'Menunggu Scan'
        const initials = getInitials(student?.name || '')
        const imgError = Boolean(imgErrorByPanel[config.key])
        const scannerStatus =
          panel.scanState === 'error'
            ? 'Scanner bermasalah'
            : panel.scanState === 'processing'
              ? 'Menyiapkan scanner'
              : 'Scanner aktif'

        return (
          <section key={config.key} className="space-y-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-surface-text">
                  {config.title}
                </h3>
                <p className="text-xs font-medium text-surface-soft">
                  {config.description}
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  panel.scanState === 'success'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                    : panel.scanState === 'error'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300'
                      : panel.scanState === 'processing'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {panel.scanState === 'success'
                  ? 'Berhasil'
                  : panel.scanState === 'error'
                    ? 'Gagal'
                    : panel.scanState === 'processing'
                      ? 'Memproses'
                      : 'Menunggu'}
              </span>
            </div>

            <article className="space-y-4 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm">
              <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold text-brand-primary">Nama</p>
                <p className="text-5xl font-bold leading-tight text-surface-text">
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
                        onError={() => setPanelImgError(config.key, true)}
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
                      <p className="text-2xl font-bold leading-tight text-surface-text">
                        {student?.classroom || '-'}
                      </p>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                      <p className="text-xs font-semibold text-brand-primary">
                        Jam
                      </p>
                      <p className="text-2xl font-bold leading-tight text-surface-text">
                        {attendanceTime}
                      </p>
                    </div>

                    <div className="rounded-lg border border-surface-border bg-surface-muted px-3 py-2">
                      <p className="text-xs font-semibold text-brand-primary">
                        Tanggal
                      </p>
                      <p className="text-2xl font-bold leading-tight text-surface-text">
                        {attendanceDate}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p
                  className={`text-4xl font-bold leading-tight ${
                    panel.tapLabel === 'Tap Pulang'
                      ? 'text-brand-primary'
                      : student
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-surface-soft'
                  }`}
                >
                  {attendanceStatus}
                </p>
                <div className="mt-2 text-xs font-medium text-surface-soft">
                  {scannerStatus}
                  {panel.lastSlotId
                    ? ` | ${formatScannerName(panel.lastSlotId)}`
                    : ''}
                </div>
                <div className="mt-1 text-xs font-medium text-surface-soft">
                  {panel.message || config.emptyText}
                </div>
              </div>
            </article>
          </section>
        )
      })}
    </section>
  )
}

export default ScanAttendancePanel
