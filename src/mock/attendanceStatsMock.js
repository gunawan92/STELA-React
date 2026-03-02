import { getMockStudents } from './studentsMock';

export function getMockAttendanceStats() {
  const students = getMockStudents();

  const stats = students.reduce(
    (accumulator, student) => {
      if (student.attendanceStatus === 'DATANG') accumulator.arrivedCount += 1;
      if (student.attendanceStatus === 'TERLAMBAT') accumulator.lateCount += 1;
      if (student.attendanceStatus === 'BELUM_TAP') accumulator.notTapCount += 1;
      return accumulator;
    },
    {
      ontimeCount: 0,
      lateCount: 0,
      arrivedCount: 0,
      totalTapCount: 0,
      notTapCount: 0,
    },
  );

  stats.ontimeCount = Math.max(0, stats.arrivedCount - stats.lateCount);
  stats.totalTapCount = stats.arrivedCount;

  return {
    ...stats,
    updatedAt: new Date().toISOString(),
  };
}
