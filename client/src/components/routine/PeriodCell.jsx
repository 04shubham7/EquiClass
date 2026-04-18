function PeriodCell({ periodKey, block, onToggle, onSubjectChange, onClassroomChange, disabled }) {
  return (
    <div className={`rounded-lg border p-2 ${block.isFree ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{periodKey}</span>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
            block.isFree ? 'bg-emerald-600 text-white hover:bg-emerald-500' : 'bg-rose-600 text-white hover:bg-rose-500'
          } disabled:opacity-60`}
        >
          {block.isFree ? 'Free' : 'Busy'}
        </button>
      </div>

      {!block.isFree && (
        <div className="grid gap-2">
          <input
            value={block.subjectCode || ''}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder="Subject code (required)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            disabled={disabled}
            required
          />
          <input
            value={block.classroom || ''}
            onChange={(event) => onClassroomChange(event.target.value)}
            placeholder="Classroom (required)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-xs"
            disabled={disabled}
            required
          />
        </div>
      )}
    </div>
  );
}

export default PeriodCell;
