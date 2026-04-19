function RoutineToolbar({ onMarkAllFree, onMarkAllBusy, isSaving }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <p className="section-kicker">Recurring schedule</p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--eq-text)]">Weekly routine</h3>
        <p className="mt-1 text-sm text-[var(--eq-muted)]">
          Toggle each period between free and busy, then save the version you want requests to check against.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMarkAllFree}
          disabled={isSaving}
          className="app-button-secondary px-4 py-2 text-xs"
        >
          Mark All Free
        </button>
        <button
          type="button"
          onClick={onMarkAllBusy}
          disabled={isSaving}
          className="app-button-secondary px-4 py-2 text-xs"
        >
          Mark All Busy
        </button>
      </div>
    </div>
  );
}

export default RoutineToolbar;
