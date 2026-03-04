# Frontend Integration Note (A-Z Summary)

Dokumen ini adalah ringkasan status frontend dari awal proyek sampai update terbaru, termasuk:
- mana yang sudah dikerjakan,
- mana yang belum,
- dan ringkasan endpoint yang dipakai.

Tanggal ringkasan: 2026-03-02.

## 1) Executive Summary

- Frontend saat ini **sudah stabil untuk operasional utama**: mode RFID, mode Scan, statistik, sekolah, dan pengaturan dasar.
- Integrasi scanner sudah mengikuti payload backend terbaru (`tap_mode`, `tap_label`, flags `in/out` dari `aro_log`).
- Yang masih tertinggal ada di hardening (schema contract, QA doc, endpoint audit log detail).

## 2) A-Z Status (Sudah / Belum)

| Kode | Area | Status | Catatan Singkat |
|---|---|---|---|
| A | Arsitektur halaman RFID modular | Done | `rfidAttendance6slot.jsx` sudah dipakai dari `App.jsx`. |
| B | Binding mode (RFID/Scan) + persist localStorage | Done | `stela-active-mode` aktif. |
| C | Camera scan flow (komponen lama) | Partial | `ScanAttendancePanel.jsx` ada, tapi mode Scan aktif sekarang pakai `ScanAttendance2D.jsx`. |
| D | Device ports RFID (backend autodetect) | Done | `GET /device/ports` + `POST /device/ports/auto-assign` aktif. |
| E | Error feedback UI scan | Done | Status error/sukses sudah dibedakan warna. |
| F | Format label scanner | Done | Di tab scanner, `RFID_1` diganti jadi `Scanner 1` dkk. |
| G | Global late cutoff per sekolah | Done | `GET/PUT /device/late-config` aktif dari settings. |
| H | Header sekolah + logo mitra | Done | Sekolah & logo dari API schools. |
| I | Integrasi socket realtime | Done | `students:update`, `attendance/update`, `scan:checkin`, dll. |
| J | Jalur fallback mock saat API kosong | Done | students/stats masih punya mock fallback. |
| K | Kontrak payload typed/validated | Belum | Belum ada validator schema (mis. Zod). |
| L | Label tap masuk/pulang dari backend | Done | Prioritas: `tap_label` -> `tap_mode` -> flags/status `aro_log`. |
| M | Mapping port manual frontend | Selesai dihapus | Sekarang read-only dari backend. |
| N | Naming UI non-RFID di tab scanner | Done | Sudah netral pakai istilah Scanner. |
| O | Observability/debug panel khusus scan | Belum | Belum ada panel debug detail payload/event di UI. |
| P | Pewarnaan tap pulang | Done | `Tap Pulang` pakai merah primary. |
| Q | QA test case terdokumentasi | Belum | Belum ada file test scenario formal. |
| R | Responsive stats card | Done | Sudah ada perbaikan di commit sebelumnya. |
| S | School selection di settings + dynamic text | Done | Sudah tampil nama sekolah terpilih. |
| T | Timeline/history dokumentasi perubahan | Done | Ditambahkan di dokumen ini. |
| U | Uniform endpoint summary | Done | Sudah dirangkum di bagian endpoint. |
| V | Validasi input settings (jam telat) | Done | Format `HH:mm` sudah dicek. |
| W | Websocket connection status handling | Done | connect/disconnect/error sudah ditangani. |
| X | eXtra endpoint untuk audit `aro_log` detail | Belum | Frontend belum punya endpoint khusus list log. |
| Y | Yield/performance tuning polling port | Partial | Polling 15 detik aktif; belum ada adaptive backoff. |
| Z | Zero-regression guard (test otomatis) | Belum | Belum ada unit/integration test frontend. |

## 3) Riwayat Pengerjaan (Yang Lalu + Terbaru)

### 3.1 Yang lalu (berdasarkan git history)

- 2026-02-17
  - `9b7d221` Initial commit.
  - `7ea7ac8` Initial STELA React attendance dashboard.
- 2026-02-18
  - `094327a` Mode scan ditambah dan disimpan di localStorage.
- 2026-02-19
  - `e09f4b8` Penambahan mode scan + setup UI/theme/env.
  - `3a731d7` Penambahan list sekolah dan logo sekolah.
  - `7a8ab27` Perbaikan responsif statistik + swal.
- 2026-02-25
  - `9bbf056` Percobaan scanner stream/camera.

### 3.2 Terbaru hari ini (2026-03-02)

- `3677860` `update segelondongan` pada area utama:
  - `App.jsx`
  - `ScanAttendance2D.jsx`
  - `SettingsDrawer.jsx`
  - `rfidAttendance6slot.jsx`
  - `README.md`
  - dokumen ini

Detail update terbaru:
- RFID 6 slot sudah modular.
- Port mapping scanner/RFID di settings read-only dari backend + tombol auto-assign.
- Teks scanner tidak lagi pakai istilah `RFID_#`.
- Status scan sukses sudah tampil `Berhasil - Tap Masuk/Pulang` berdasar payload backend.
- `Tap Pulang` pakai warna merah primary.

## 4) Ringkasan Endpoint

Asumsi base dari `.env`: `VITE_API_BASE_URL`.

### 4.1 REST

| Endpoint | Method | Fungsi |
|---|---|---|
| `/api/students?schoolId=` | GET | Ambil daftar siswa per sekolah |
| `/api/attendance/statistics` | GET | Ambil statistik harian |
| `/api/schools` | GET | Ambil daftar sekolah mitra |
| `/api/schools/:id/logo` | GET | Ambil/logo URL sekolah |
| `/api/device/ports` | GET | Ambil mapping slot RFID dan COM tersedia |
| `/api/device/ports/auto-assign` | POST | Auto-assign COM ke slot RFID |
| `/api/device/late-config?schoolId=` | GET | Ambil batas jam ontime per sekolah |
| `/api/device/late-config` | PUT | Simpan batas jam ontime |
| `/api/scan/checkin` | POST | Proses scan checkin/checkout + payload status tap |

### 4.2 Socket Event

| Event | Kegunaan |
|---|---|
| `students:update` | Update data siswa realtime |
| `attendance:update` | Update statistik realtime |
| `stats:update` | Update statistik alternatif |
| `dashboard:update` | Paket update dashboard (students + stats) |
| `scan` / `scan:raw` | Trigger scan mentah dari device |
| `scan:checkin` | Hasil scan final dari backend (termasuk status tap) |

## 5) Payload Backend yang Sudah Dipakai Frontend

Frontend scanner sudah membaca field berikut dari respons `POST /api/scan/checkin` dan event `scan:checkin`:

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

## 6) Backlog Prioritas (Belum)

1. Tambah schema validation payload API/socket (mis. Zod) agar aman dari perubahan kontrak backend.
2. Tambah endpoint/view audit log detail (`aro_log`) jika dibutuhkan untuk tracing user harian.
3. Buat dokumentasi QA test case formal (happy path + failure path).
4. Tambah test otomatis frontend (minimal smoke test komponen inti scan).

## 7) Point 2 - Payload Minimal untuk Uji Dummy `scan:checkin` (Level B)

Tujuan: frontend bisa dites tanpa menunggu hardware RFID penuh.

### 7.1 Field Minimal (wajib ada)

Payload dummy minimal yang cukup untuk men-trigger UI scanner:

```json
{
  "iduser": "SELA19654",
  "idschool": "SCHOOL001",
  "user_name": "Gunawan Dummy",
  "class_name": "Kelas VII A",
  "time": "14:34:02",
  "tanggal_waktu": "2026-03-04 14:34:02",

  "tap_mode": "pulang",
  "tap_label": "Tap Pulang",

  "status_in": true,
  "has_in": true,
  "in_exists": true,

  "status_out": true,
  "has_out": true,
  "out_exists": true,

  "status": "out",
  "log_status": "out",
  "aro_status": "out",
  "query_source": "aro_log"
}
```

### 7.2 Kenapa field ini minimal

- `iduser`, `user_name`, `class_name`, `time`, `tanggal_waktu`:
  - untuk render data siswa di panel scanner.
- `idschool`:
  - agar lolos filter sekolah aktif di frontend realtime.
- `tap_mode`/`tap_label` + flags/status `in/out`:
  - menentukan label `Berhasil - Tap Masuk/Pulang` secara konsisten.

### 7.3 Checklist hasil yang diharapkan di UI

- Event `scan:checkin` diterima tanpa refresh page.
- Nama siswa muncul di panel scanner.
- Status utama jadi:
  - `Berhasil - Tap Masuk` atau
  - `Berhasil - Tap Pulang`.
- Jika `Tap Pulang`, warna status utama harus merah primary.

## 8) Point 3 - Audit Log Perlu Tampilan atau Tidak?

### 8.1 Keputusan

- Untuk operasional sekolah harian: **Perlu tampilan (FE) + endpoint (BE)**.
- Untuk debug developer internal: endpoint/log backend saja masih bisa, tapi terbatas.

### 8.2 Rekomendasi Scope Minimal Audit Log (MVP)

#### Backend (wajib)

Sediakan endpoint list audit log harian, misalnya:

- `GET /api/scan/audit-logs`

Filter query minimal:
- `schoolId`
- `dateFrom`, `dateTo`
- `iduser` (opsional)
- `className` (opsional)
- `tapMode` (`masuk`/`pulang`, opsional)
- `page`, `limit`

Response item minimal:
- `timestamp`
- `iduser`
- `user_name`
- `class_name`
- `tap_mode`
- `tap_label`
- `status_in`, `status_out`
- `status`, `log_status`, `aro_status`
- `query_source`
- `rfid_port` / `device_id` (jika ada)

#### Frontend (wajib)

Buat view tabel audit log dengan:
- filter tanggal
- filter sekolah
- cari `iduser` / nama
- filter `tap_mode`
- pagination

Kolom tabel minimal:
- Waktu
- ID User
- Nama
- Kelas
- Tap Label
- Status (`status/log_status/aro_status`)
- Port/Device
- Source (`query_source`)

### 8.3 Kenapa penting untuk sekolah

- Memudahkan tracing komplain “saya sudah tap tapi tidak tercatat”.
- Memudahkan validasi kasus dobel tap / tap pulang.
- Admin/TU tidak perlu akses database langsung.
- Mempermudah rekap insiden operasional harian.
