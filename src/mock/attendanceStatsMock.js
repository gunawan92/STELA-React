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
      lateCount: 0,
      arrivedCount: 0,
      notTapCount: 0,
    },
  );

  return {
    ...stats,
    updatedAt: new Date().toISOString(),
  };
}
