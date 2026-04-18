function RoutineLegend() {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-emerald-500" /> Free
      </span>
      <span className="inline-flex items-center gap-1">
        <span className="h-3 w-3 rounded bg-rose-500" /> Busy
      </span>
      <span className="text-slate-500">When Busy, Subject code and Classroom are mandatory.</span>
    </div>
  );
}

export default RoutineLegend;
