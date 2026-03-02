import StudentCard from '../students/StudentCard'

function RfidAttendance6Slot({ latestStudentBySlot = [] }) {
  return (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {latestStudentBySlot.map((slot) => (
        <article
          key={slot.id}
          className="min-h-[18rem] rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-surface-text">
                {slot.label}
              </h3>
              <p className="text-xs font-medium text-surface-soft">
                Port: {slot.configuredPort}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${
                slot.student
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
              }`}
            >
              {slot.student ? 'Selesai Tap' : 'Menunggu Tap'}
            </span>
          </div>

          {slot.student ? (
            <div className="h-[13.25rem] overflow-hidden rounded-lg">
              <StudentCard student={slot.student} embedded />
            </div>
          ) : (
            <div className="flex h-[13.25rem] items-center justify-center rounded-lg border border-dashed border-surface-border bg-surface-muted/60 text-center">
              <div>
                <p className="text-base font-semibold text-surface-text">
                  Belum ada tap kartu
                </p>
                <p className="mt-1 text-sm text-surface-soft">
                  Silakan siswa tap di {slot.label}
                </p>
              </div>
            </div>
          )}
        </article>
      ))}
    </section>
  )
}

export default RfidAttendance6Slot
