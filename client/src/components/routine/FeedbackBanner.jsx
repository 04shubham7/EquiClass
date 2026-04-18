function FeedbackBanner({ error, success }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {success}
        </div>
      )}
    </div>
  );
}

export default FeedbackBanner;
