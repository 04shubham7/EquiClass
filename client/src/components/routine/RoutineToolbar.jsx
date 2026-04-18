function RoutineToolbar({ onMarkAllFree, onMarkAllBusy, isSaving }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Weekly Routine</h3>
        <p className="text-xs text-slate-500">Toggle each period between Free and Busy, then save changes.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onMarkAllFree}
          disabled={isSaving}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
        >
          Mark All Free
        </button>
        <button
          type="button"
          onClick={onMarkAllBusy}
          disabled={isSaving}
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          Mark All Busy
        </button>
      </div>
    </div>
  );
}

export default RoutineToolbar;
