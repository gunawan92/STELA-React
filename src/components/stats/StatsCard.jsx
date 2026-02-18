const toneStyle = {
  primary: {
    borderColor: '#0f766e',
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    color: '#0f766e',
  },
  secondary: {
    borderColor: '#f59e0b',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    color: '#f59e0b',
  },
  danger: {
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.12)',
    color: '#dc2626',
  },
}

const solidToneClass = {
  primary: 'bg-teal-700',
  secondary: 'bg-amber-500',
  danger: 'bg-rose-600',
}

function getSolidValueClass(value) {
  const digitCount = String(value).replace(/\D/g, '').length

  if (digitCount >= 6) return 'text-2xl sm:text-3xl'
  if (digitCount === 5) return 'text-3xl sm:text-4xl'
  if (digitCount === 4) return 'text-4xl sm:text-5xl'
  if (digitCount === 3) return 'text-5xl sm:text-6xl'
  return 'text-6xl sm:text-7xl'
}

function StatsCard({ label, value, tone = 'primary', variant = 'default' }) {
  if (variant === 'solid') {
    const toneClass = solidToneClass[tone] || solidToneClass.primary
    const valueClass = getSolidValueClass(value)

    return (
      <article
        className={`flex min-h-[7.75rem] flex-col justify-between rounded-2xl p-4 shadow-lg ${toneClass}`}
      >
        <p className="text-xs font-bold uppercase tracking-wide text-white/85">
          {label}
        </p>
        <p
          className={`tabular-nums ${valueClass} max-w-full overflow-hidden text-ellipsis font-black leading-none tracking-tight text-white`}
        >
          {value}
        </p>
      </article>
    )
  }

  const style = toneStyle[tone] || toneStyle.primary

  return (
    <article className="rounded-xl border p-4" style={style}>
      <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </article>
  )
}

export default StatsCard
