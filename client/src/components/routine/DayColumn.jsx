import PeriodCell from './PeriodCell';

function DayColumn({
  dayLabel,
  dayKey,
  periodKeys,
  dayData,
  onTogglePeriod,
  onSubjectChange,
  onClassroomChange,
  onSetDay,
  isSaving,
}) {
  return (
    <div className="landing-card rounded-[1.5rem] p-3 shadow-none">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-[var(--eq-text)]">{dayLabel}</h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSetDay(dayKey, true)}
            disabled={isSaving}
            className="app-button-secondary px-3 py-1.5 text-[10px]"
          >
            All Free
          </button>
          <button
            type="button"
            onClick={() => onSetDay(dayKey, false)}
            disabled={isSaving}
            className="app-button-secondary px-3 py-1.5 text-[10px]"
          >
            All Busy
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        {periodKeys.map((periodKey) => (
          <PeriodCell
            key={`${dayKey}_${periodKey}`}
            periodKey={periodKey}
            block={dayData[periodKey] || { isFree: true, subjectCode: null, classroom: null }}
            onToggle={() => onTogglePeriod(dayKey, periodKey)}
            onSubjectChange={(value) => onSubjectChange(dayKey, periodKey, value)}
            onClassroomChange={(value) => onClassroomChange(dayKey, periodKey, value)}
            disabled={isSaving}
          />
        ))}
      </div>
    </div>
  );
}

export default DayColumn;
