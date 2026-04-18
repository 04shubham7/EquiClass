function SaveBar({ isDirty, isSaving, onSave, onReset, lastSavedAt }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <div className="text-xs text-slate-600">
        {isDirty ? 'You have unsaved changes.' : 'No unsaved changes.'}
        {lastSavedAt && <span className="ml-2">Last saved: {new Date(lastSavedAt).toLocaleString()}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty || isSaving}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Routine'}
        </button>
      </div>
    </div>
  );
}

export default SaveBar;
