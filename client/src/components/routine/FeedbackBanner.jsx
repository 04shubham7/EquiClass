function FeedbackBanner({ error, success }) {
  if (!error && !success) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2">
      {error && (
        <div className="rounded-[1.3rem] border border-[rgba(154,68,80,0.2)] bg-[rgba(154,68,80,0.08)] px-4 py-3 text-sm text-[var(--eq-danger)]">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-[1.3rem] border border-[rgba(47,114,95,0.2)] bg-[rgba(47,114,95,0.08)] px-4 py-3 text-sm text-[var(--eq-success)]">
          {success}
        </div>
      )}
    </div>
  );
}

export default FeedbackBanner;
