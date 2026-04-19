function RoutineLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] px-3 py-3 text-xs text-[var(--eq-muted-strong)]">
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-[var(--eq-success)]" /> Free
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-[var(--eq-danger)]" /> Busy
      </span>
      <span className="text-[var(--eq-muted)]">When Busy, subject code and classroom are mandatory.</span>
    </div>
  );
}

export default RoutineLegend;
