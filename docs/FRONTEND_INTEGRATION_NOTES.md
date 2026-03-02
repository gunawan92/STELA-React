# Frontend Integration Notes (RFID + Scanner)

Dokumen ini merangkum implementasi frontend terbaru untuk mode RFID dan mode Scanner, termasuk status pekerjaan, bagian yang belum selesai, dan ringkasan endpoint.

## 1. Ringkasan Cepat

- Mode absensi ada 2: `RFID` dan `Scan`.
- Mapping port RFID sekarang dari backend (`/device/ports`), bukan input manual frontend.
- Tampilan scanner tidak lagi menampilkan `RFID_1` dkk, tetapi `Scanner 1`, `Scanner 2`, dst.
- Status sukses scanner mengikuti respons backend `aro_log`:
  - `Berhasil - Tap Masuk`
  - `Berhasil - Tap Pulang`
- Khusus `Tap Pulang`, warna status utama di panel scanner memakai merah primary (`text-brand-primary`).

## 2. Struktur Modul Utama

- `src/App.jsx`
  - Orkestrasi mode, data sekolah, statistik, port RFID, settings drawer.
- `src/components/rfid/rfidAttendance6slot.jsx`
  - Tampilan modular 6 slot RFID.
- `src/components/scan/ScanAttendance2D.jsx`
  - Tampilan scanner 2 panel (A/B), proses scan, status tap masuk/pulang.
- `src/components/ui/SettingsDrawer.jsx`
  - Pengaturan frontend (mode, sekolah, late cutoff, mapping port, auto-assign port).

## 3. Perubahan yang Sudah Dikerjakan

### 3.1 Scanner label (hapus istilah RFID di tab Scanner)

Di `ScanAttendance2D.jsx`:
- Slot `RFID_1` kini ditampilkan sebagai `Scanner 1`.
- Status bawah berubah dari pola lama menjadi:
  - `Scanner aktif | Scanner 1`

### 3.2 Status Tap Masuk/Tap Pulang dari backend (`aro_log`)

Di `ScanAttendance2D.jsx`, fungsi `resolveTapLabel(payload)` sekarang prioritas baca field resmi backend:

1. `tap_label`
2. `tap_mode`
3. Flag/query fields: `status_in`, `has_in`, `in_exists`, `status_out`, `has_out`, `out_exists`, `status`, `log_status`, `aro_status`

Rule hasil label:
- Jika terdeteksi `pulang/out` -> `Tap Pulang`
- Jika terdeteksi `masuk/in` -> `Tap Masuk`
- Fallback -> `Tap Masuk`

### 3.3 Warna status utama untuk Tap Pulang

Di `ScanAttendance2D.jsx`:
- `Tap Pulang` -> merah primary (`text-brand-primary`)
- selain itu sukses normal -> hijau (`text-emerald-*`)

### 3.4 Mapping port RFID dari backend + Auto Assign

Di `App.jsx` + `SettingsDrawer.jsx`:
- `Refresh Port` mengambil state port dari backend.
- `Auto Atur Port` memanggil endpoint auto-assign backend.
- Mapping di settings bersifat read-only (frontend tidak edit COM manual).

### 3.5 Dynamic school label di settings

Di `SettingsDrawer.jsx`:
- Teks late cutoff sekarang menampilkan sekolah aktif:
  - `Berlaku untuk semua kelas dan hari di {selectedSchoolName}`

## 4. Bagian Stuck / Belum Dikerjakan

- Contract payload backend belum didokumentasikan resmi dalam file tipe/schema frontend.
  - Saat ini parsing dilakukan langsung dari object respons.
  - Rekomendasi: tambah schema validation ringan (mis. Zod) agar robust.

- Belum ada endpoint frontend khusus untuk query langsung tabel `aro_log`.
  - Frontend saat ini bergantung pada hasil akhir dari `POST /scan/checkin` dan event `scan:checkin`.
  - Kalau nanti perlu audit detail log harian, butuh endpoint baru (mis. `GET /scan/logs` atau `GET /aro-log`).

- Pengaturan resolusi kamera di settings masih dikomentari (hidden di UI).
  - Komponen scanner kamera lama masih ada (`ScanAttendancePanel.jsx`), tetapi saat ini mode Scan aktif memakai `ScanAttendance2D.jsx`.

- Belum ada halaman dokumentasi QA test case terpisah.
  - Saat ini skenario uji masih manual dari alur operasional.

## 5. Summary Endpoint

Asumsi base URL dari env: `VITE_API_BASE_URL`.

### 5.1 REST API

| Endpoint | Method | Dipakai di | Keterangan |
|---|---|---|---|
| `/api/students?schoolId=` | `GET` | `studentsApi.js` | Ambil daftar siswa per sekolah |
| `/api/attendance/statistics` | `GET` | `attendanceApi.js` | Statistik dashboard (ontime, terlambat, dll) |
| `/api/schools` | `GET` | `schoolApi.js` | Daftar sekolah mitra |
| `/api/schools/:id/logo` | `GET` | `schoolApi.js` | URL logo sekolah |
| `/api/device/ports` | `GET` | `devicePortsApi.js` | Mapping slot RFID ke COM + available ports |
| `/api/device/ports/auto-assign` | `POST` | `devicePortsApi.js` | Auto assign COM ke slot RFID |
| `/api/device/late-config?schoolId=` | `GET` | `lateConfigApi.js` | Ambil batas telat per sekolah |
| `/api/device/late-config` | `PUT` | `lateConfigApi.js` | Simpan batas telat |
| `/api/scan/checkin` | `POST` | `scanApi.js`, `ScanAttendance2D.jsx` | Proses scan + hasil status tap |

Catatan:
- Builder URL mendukung dua pola base:
  - jika `VITE_API_BASE_URL` sudah berakhiran `/api`, frontend tidak menambah `/api` lagi.
  - jika belum, frontend menambahkan `/api/...`.

### 5.2 Socket Events

Dipakai di `useRealtimeDashboard.js` dan `ScanAttendance2D.jsx`.

Event subscribe:
- `connect`
- `disconnect`
- `connect_error`
- `students:update`
- `attendance:update`
- `stats:update`
- `dashboard:update`
- `scan`
- `scan:raw`
- `scan:checkin`

Event paling penting untuk scan status:
- `scan:checkin` (membawa payload scan termasuk field baru dari `aro_log` seperti `tap_mode`, `tap_label`, `status_in`, `status_out`, dst.)

## 6. Summary Local Storage

Key yang aktif dipakai:
- `stela-active-mode`
- `stela-camera-quality`
- `stela-scan-device-id`
- `stela-school-id`

## 7. Payload Backend Acuan (Sudah Didukung Frontend)

Contoh field tambahan dari backend:

```json
{
  "tap_mode": "masuk | pulang",
  "tap_label": "Tap Masuk | Tap Pulang",
  "status_in": true,
  "has_in": true,
  "in_exists": true,
  "status_out": false,
  "has_out": false,
  "out_exists": false,
  "status": "in | out",
  "log_status": "in | out",
  "aro_status": "in | out",
  "query_source": "aro_log"
}
```

Frontend scanner (`ScanAttendance2D.jsx`) saat ini sudah membaca payload di atas untuk menentukan label status.
