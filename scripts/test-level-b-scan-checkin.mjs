import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { io } from 'socket.io-client'

function parseArgs(argv) {
  const options = {
    wsUrl: '',
    event: 'scan:checkin',
    schoolId: 'SCHOOL001',
    iduser: 'SELA19654',
    serial: 'SELA19654',
    userName: 'Gunawan Dummy',
    className: 'Kelas VII A',
    tapMode: 'pulang',
    tapLabel: 'Tap Pulang',
    status: 'out',
    rfidPort: 'COM3',
    timeoutMs: 7000,
    listenMs: 4000,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = argv[i + 1]
    if (!arg.startsWith('--')) continue

    if (arg === '--help') options.help = true
    if (arg === '--ws' && next) options.wsUrl = next
    if (arg === '--event' && next) options.event = next
    if (arg === '--school' && next) options.schoolId = next
    if (arg === '--iduser' && next) {
      options.iduser = next
      options.serial = next
    }
    if (arg === '--name' && next) options.userName = next
    if (arg === '--class' && next) options.className = next
    if (arg === '--tap-mode' && next) options.tapMode = next
    if (arg === '--tap-label' && next) options.tapLabel = next
    if (arg === '--status' && next) options.status = next
    if (arg === '--port' && next) options.rfidPort = next
    if (arg === '--timeout' && next) {
      options.timeoutMs = Number(next) || options.timeoutMs
    }
    if (arg === '--listen-ms' && next) {
      options.listenMs = Number(next) || options.listenMs
    }
  }

  return options
}

function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env')
  if (!fs.existsSync(envPath)) return {}

  const content = fs.readFileSync(envPath, 'utf8')
  const out = {}
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index < 1) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function getNowLocalDateTime() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = now.getFullYear()
  const mm = pad(now.getMonth() + 1)
  const dd = pad(now.getDate())
  const hh = pad(now.getHours())
  const min = pad(now.getMinutes())
  const ss = pad(now.getSeconds())
  return {
    time: `${hh}:${min}:${ss}`,
    tanggalWaktu: `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`,
  }
}

function buildPayload(options) {
  const { time, tanggalWaktu } = getNowLocalDateTime()
  const isPulang = String(options.tapMode).toLowerCase() === 'pulang'
  const modeStatus = isPulang ? 'out' : 'in'
  const status = options.status || modeStatus

  const hasIn = true
  const hasOut = status === 'out'

  return {
    success: true,
    data: {
      iduser: options.iduser,
      serial: options.serial,
      user_name: options.userName,
      class_name: options.className,
      idschool: options.schoolId,
      time,
      tanggal_waktu: tanggalWaktu,
      rfid_port: options.rfidPort,
      deskripsi: isPulang ? 'absen_perangkat_pulang' : 'absen_perangkat',
      tap_mode: options.tapMode,
      tap_label: options.tapLabel,
      status_in: hasIn,
      has_in: hasIn,
      in_exists: hasIn,
      status_out: hasOut,
      has_out: hasOut,
      out_exists: hasOut,
      status,
      log_status: status,
      aro_status: status,
      query_source: 'aro_log',
    },
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/test-level-b-scan-checkin.mjs [options]

Options:
  --ws <url>            Socket URL (default: VITE_WS_URL from .env)
  --event <name>        Event name (default: scan:checkin)
  --school <id>         School id in payload (default: SCHOOL001)
  --iduser <id>         User id/serial (default: SELA19654)
  --name <text>         User name (default: Gunawan Dummy)
  --class <text>        Class name (default: Kelas VII A)
  --tap-mode <mode>     masuk|pulang (default: pulang)
  --tap-label <label>   Label text (default: Tap Pulang)
  --status <in|out>     Status/log_status/aro_status (default from tap-mode)
  --port <COMx>         RFID port marker (default: COM3)
  --timeout <ms>        Connect timeout (default: 7000)
  --listen-ms <ms>      Wait for rebroadcast before exit (default: 4000)
  --help                Show this help
`)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  const envFile = loadEnvFile()
  const wsUrl = options.wsUrl || process.env.VITE_WS_URL || envFile.VITE_WS_URL

  if (!wsUrl) {
    console.error('VITE_WS_URL tidak ditemukan. Pakai --ws atau isi .env')
    process.exitCode = 1
    return
  }

  const payload = buildPayload(options)
  const dataPayload = payload.data
  const socket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    timeout: options.timeoutMs,
  })

  let hasConnected = false
  let receivedEcho = false

  socket.on('connect', () => {
    hasConnected = true
    console.log(`[connected] socket id: ${socket.id}`)
    console.log(`[emit] ${options.event}`)
    console.log(JSON.stringify(dataPayload, null, 2))
    socket.emit(options.event, dataPayload)
  })

  socket.on(options.event, (incoming) => {
    receivedEcho = true
    console.log(`[listen] received ${options.event}`)
    console.log(JSON.stringify(incoming, null, 2))
  })

  socket.on('connect_error', (error) => {
    console.error(`[connect_error] ${error?.message || 'unknown error'}`)
  })

  setTimeout(() => {
    if (!hasConnected) {
      console.error(
        `[timeout] gagal connect ke ${wsUrl}. cek VITE_WS_URL / backend socket`
      )
      socket.close()
      process.exitCode = 1
      return
    }

    if (!receivedEcho) {
      console.log(
        '[done] emit terkirim. server mungkin tidak me-rebroadcast event client (ini normal di beberapa backend).'
      )
    } else {
      console.log('[done] emit + receive echo sukses.')
    }
    socket.close()
  }, options.listenMs)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
