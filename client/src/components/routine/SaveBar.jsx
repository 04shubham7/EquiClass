function SaveBar({ isDirty, isSaving, onSave, onReset, lastSavedAt }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-4 py-3">
      <div className="text-xs text-[var(--eq-muted)]">
        {isDirty ? 'You have unsaved changes.' : 'No unsaved changes.'}
        {lastSavedAt && <span className="ml-2">Last saved: {new Date(lastSavedAt).toLocaleString()}</span>}
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty || isSaving}
          className="app-button-secondary px-4 py-2 text-xs"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="app-button-primary px-4 py-2 text-xs"
        >
          {isSaving ? 'Saving...' : 'Save Routine'}
        </button>
      </div>
    </div>
  );
}

export default SaveBar;
