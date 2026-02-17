# STELA-React

Frontend dashboard absensi siswa berbasis React + WebSocket (local-first).

## Stack

- React + Vite
- Tailwind CSS
- SweetAlert2
- React Query (`@tanstack/react-query`)
- Socket.IO Client (`socket.io-client`)

## Fitur

- Monitoring respon tap kartu RFID realtime (6 panel)
- Statistik harian absensi
- Mode terang/gelap
- Pengumuman berjalan (marquee)
- Status internet + ping

## Menjalankan Project

1. Install dependency
   ```bash
   npm install
   ```
2. Jalankan dev server
   ```bash
   npm run dev
   ```
3. Build production
   ```bash
   npm run build
   ```

## Konfigurasi Environment

Salin `.env.example` menjadi `.env` lalu sesuaikan.

Contoh:

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_WS_URL=http://localhost:3000
VITE_PING_URL=http://localhost:3000/health
VITE_SCHOOL_NAME=SMK STELA INDONESIA
VITE_SCHOOL_LOGO_URL=
VITE_SCHOOL_ANNOUNCEMENTS=Selamat datang.|Jam masuk siswa pukul 07:00 WIB.|Tetap disiplin.
```

## Endpoint API

- `GET {VITE_API_BASE_URL}/students`
- `GET {VITE_API_BASE_URL}/attendance/statistics`

## Event Socket.IO

- `students:update`
- `attendance:update`
- `dashboard:update`
