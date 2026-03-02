import { useEffect } from 'react'

function SettingsDrawer({
  isOpen,
  onClose,
  activeMode,
  onChangeMode,
  cameraQuality,
  onChangeCameraQuality,
  rfidPorts,
  availableRfidPorts,
  onRefreshRfidPorts,
  onAutoAssignRfidPorts,
  isAutoAssigningRfidPorts,
  scanDeviceId,
  onChangeScanDeviceId,
  schools,
  selectedSchoolId,
  onChangeSelectedSchoolId,
  lateCutoffTime,
  onChangeLateCutoffTime,
  onSaveLateCutoff,
  isSavingLateCutoff,
}) {
  const schoolOptions = Array.isArray(schools) ? schools : []
  const selectedSchoolName =
    schoolOptions.find((school) => school.id === selectedSchoolId)?.name ||
    'terpilih'

  useEffect(() => {
    if (!isOpen) return

    function handleKeydown(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Tutup pengaturan"
        className="absolute inset-0 bg-black/35"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-surface-border bg-surface-card p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-text">Pengaturan</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-surface-border text-surface-soft hover:bg-surface-muted"
          >
            X
          </button>
        </div>

        <section className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            Batas Jam Ontime
          </p>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="time"
              value={lateCutoffTime}
              onChange={(event) => onChangeLateCutoffTime(event.target.value)}
              className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text outline-none transition focus:border-brand-primary"
            />
            <button
              type="button"
              onClick={onSaveLateCutoff}
              disabled={isSavingLateCutoff || !selectedSchoolId}
              className="rounded-lg border border-brand-primary bg-brand-primary px-3 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingLateCutoff ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          <p className="text-xs text-surface-soft">
            Berlaku untuk semua kelas dan hari di {selectedSchoolName}.
          </p>
        </section>

        <section className="space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            Mode Absensi
          </p>
          <div className="inline-flex w-full rounded-lg border border-surface-border bg-surface-card p-1">
            <button
              type="button"
              onClick={() => onChangeMode('rfid')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeMode === 'rfid'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              RFID
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('scan')}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                activeMode === 'scan'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              Scan
            </button>
          </div>
          <p className="text-xs text-surface-soft">
            Mode yang dipilih akan tetap tersimpan.
          </p>
        </section>

        <section className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            RFID Port Mapping
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRefreshRfidPorts}
              className="rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-xs font-semibold text-surface-text hover:bg-surface-muted"
            >
              Refresh Port
            </button>
            <button
              type="button"
              onClick={onAutoAssignRfidPorts}
              disabled={isAutoAssigningRfidPorts}
              className="rounded-lg border border-brand-primary bg-brand-primary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isAutoAssigningRfidPorts ? 'Auto Mengatur...' : 'Auto Atur Port'}
            </button>
          </div>
          <div className="space-y-2">
            {Object.entries(rfidPorts).map(([slotId, port]) => {
              const label = slotId.replace('_', ' ')
              return (
                <div
                  key={slotId}
                  className="grid grid-cols-[6rem_minmax(0,1fr)] items-center gap-2"
                >
                  <p className="text-xs font-semibold text-surface-soft">
                    {label}
                  </p>
                  <input
                    type="text"
                    value={port}
                    readOnly
                    placeholder="-"
                    className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 text-sm font-medium text-surface-text outline-none"
                  />
                </div>
              )
            })}
          </div>
          <p className="text-xs text-surface-soft">
            Port terdeteksi:{' '}
            {Array.isArray(availableRfidPorts) && availableRfidPorts.length
              ? availableRfidPorts.join(', ')
              : 'Tidak ada'}
          </p>
          <p className="text-xs text-surface-soft">
            Mapping ditentukan auto setelah klik Auto Atur, akan diisi dari COM
            yang tersedia.
          </p>
        </section>

        <section className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            Sekolah Mitra
          </p>
          <select
            value={selectedSchoolId}
            onChange={(event) => onChangeSelectedSchoolId(event.target.value)}
            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text outline-none transition focus:border-brand-primary"
          >
            {schoolOptions.length ? null : (
              <option value="">Belum ada data sekolah</option>
            )}
            {schoolOptions.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name} ({school.id})
              </option>
            ))}
          </select>
          <p className="text-xs text-surface-soft">
            Pilih sekolah mitra untuk menampilkan nama dan logo tanpa upload
            ulang.
          </p>
        </section>

        <section className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            Scan Device ID
          </p>
          <input
            type="text"
            value={scanDeviceId}
            onChange={(event) => onChangeScanDeviceId(event.target.value)}
            placeholder="Contoh: DEV2026"
            className="w-full rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-surface-text outline-none transition focus:border-brand-primary"
          />
          <p className="text-xs text-surface-soft">
            Device ID ini dikirim ke Server saat scan QR untuk menandai sumber
            perangkat.
          </p>
        </section>

        {/* <section className="mt-3 space-y-2 rounded-xl border border-surface-border bg-surface-muted/40 p-3">
          <p className="text-sm font-semibold text-surface-text">
            Resolusi Streaming Kamera
          </p>
          <div className="inline-flex w-full rounded-lg border border-surface-border bg-surface-card p-1">
            <button
              type="button"
              onClick={() => onChangeCameraQuality('low')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                cameraQuality === 'low'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              Low
            </button>
            <button
              type="button"
              onClick={() => onChangeCameraQuality('medium')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                cameraQuality === 'medium'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              Medium
            </button>
            <button
              type="button"
              onClick={() => onChangeCameraQuality('high')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition ${
                cameraQuality === 'high'
                  ? 'bg-brand-primary text-white'
                  : 'text-surface-soft hover:bg-surface-muted'
              }`}
            >
              High
            </button>
          </div>
          <p className="text-xs text-surface-soft">
            Ubah kualitas video agar menyesuaikan performa perangkat.
          </p>
        </section> */}
      </aside>
    </div>
  )
}

export default SettingsDrawer
