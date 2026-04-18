import DayColumn from './DayColumn';

function WeeklyRoutineGrid({
  days,
  periodKeys,
  weekData,
  onTogglePeriod,
  onSubjectChange,
  onClassroomChange,
  onSetDay,
  isSaving,
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {days.map((day) => (
        <DayColumn
          key={day.key}
          dayLabel={day.label}
          dayKey={day.key}
          periodKeys={periodKeys}
          dayData={weekData[day.key]}
          onTogglePeriod={onTogglePeriod}
          onSubjectChange={onSubjectChange}
          onClassroomChange={onClassroomChange}
          onSetDay={onSetDay}
          isSaving={isSaving}
        />
      ))}
    </div>
  );
}

export default WeeklyRoutineGrid;
