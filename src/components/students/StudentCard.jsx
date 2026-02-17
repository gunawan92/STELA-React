import { useState } from 'react';

const statusStyle = {
  DATANG: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  TERLAMBAT: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  BELUM_TAP: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function StudentCard({ student, embedded = false }) {
  const [imgError, setImgError] = useState(false);
  const initials = getInitials(student.name);
  const statusClass = statusStyle[student.attendanceStatus] || statusStyle.BELUM_TAP;
  const photoClass = embedded
    ? 'aspect-[3/4] w-24 rounded-md border border-surface-border object-cover'
    : 'aspect-[3/4] w-32 rounded-md border border-surface-border object-cover';

  return (
    <article
      className={
        embedded
          ? 'h-full rounded-lg bg-surface-card p-1.5'
          : 'min-h-48 rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm'
      }
    >
      <div className="flex h-full items-start gap-5">
        {!imgError && student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={student.name}
            onError={() => setImgError(true)}
            className={photoClass}
          />
        ) : (
          <div className={`flex items-center justify-center bg-brand-primary text-base font-bold text-white ${photoClass}`}>
            {initials || 'S'}
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <h2
              className={`font-bold leading-tight text-surface-text ${
                embedded ? 'truncate text-[1.75rem]' : 'truncate text-[1.9rem]'
              }`}
            >
              {student.name}
            </h2>
            <h3
              className={`font-semibold text-surface-text ${
                embedded ? 'mt-2 text-[1.2rem]' : 'mt-2 text-[1.3rem]'
              }`}
            >
              Kelas: {student.classroom}
            </h3>
            <p
              className={`text-surface-soft ${
                embedded ? 'mt-1.5 text-sm font-medium' : 'mt-2 text-base font-medium'
              }`}
            >
              NIS: {student.nis}
            </p>
            <p
              className={`font-medium text-surface-text ${
                embedded ? 'mt-2 text-base' : 'mt-2.5 text-base'
              }`}
            >
              Jam Kedatangan: {student.lastCheckIn || 'Belum tap'}
            </p>
          </div>

          <span
            className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${
              embedded ? 'mt-3' : 'mt-4'
            } ${statusClass}`}
          >
            {student.attendanceLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

export default StudentCard;
