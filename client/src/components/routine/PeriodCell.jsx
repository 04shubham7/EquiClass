function PeriodCell({ periodKey, block, onToggle, onSubjectChange, onClassroomChange, disabled }) {
  return (
    <div className={`rounded-[1.2rem] p-3 ${block.isFree ? 'slot-card-free' : 'slot-card-busy'}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--eq-muted-strong)]">{periodKey}</span>
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${
            block.isFree
              ? 'bg-[var(--eq-success)] text-[var(--eq-bg-soft)]'
              : 'bg-[var(--eq-danger)] text-[var(--eq-bg-soft)]'
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
            className="app-input px-3 py-2 text-xs"
            disabled={disabled}
            required
          />
          <input
            value={block.classroom || ''}
            onChange={(event) => onClassroomChange(event.target.value)}
            placeholder="Classroom (required)"
            className="app-input px-3 py-2 text-xs"
            disabled={disabled}
            required
          />
        </div>
      )}
    </div>
  );
}

export default PeriodCell;
