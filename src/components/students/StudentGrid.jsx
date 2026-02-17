import StudentCard from './StudentCard';

function StudentGrid({ students, emptyTitle, emptyDescription, columns = 2 }) {
  const gridClass =
    columns === 2 ? 'grid grid-cols-1 gap-4 md:grid-cols-2' : 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';

  if (!students.length) {
    return (
      <div className="rounded-xl border border-dashed border-surface-border bg-surface-card p-8 text-center">
        <p className="text-lg font-semibold text-surface-text">{emptyTitle || 'Belum ada data siswa.'}</p>
        {emptyDescription ? <p className="mt-2 text-sm text-surface-soft">{emptyDescription}</p> : null}
      </div>
    );
  }

  return (
    <section className={gridClass}>
      {students.map((student) => (
        <StudentCard key={student.id} student={student} />
      ))}
    </section>
  );
}

export default StudentGrid;
