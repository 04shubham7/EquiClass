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
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-800">{dayLabel}</h4>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onSetDay(dayKey, true)}
            disabled={isSaving}
            className="rounded border border-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            All Free
          </button>
          <button
            type="button"
            onClick={() => onSetDay(dayKey, false)}
            disabled={isSaving}
            className="rounded border border-rose-300 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
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
