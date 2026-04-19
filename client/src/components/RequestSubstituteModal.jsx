import { useEffect, useMemo, useState } from 'react';

import { requestApi, routineApi, timetableApi, userApi } from '../lib/api';

const DEFAULT_FORM = {
  covererId: '',
  termId: '2026-Spring',
  date: '',
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  courseCode: '',
  room: '',
  department: '',
  reason: '',
  requesterComment: '',
  period: 'Period_1',
};

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const PERIOD_OPTIONS = ['Period_1', 'Period_2', 'Period_3', 'Period_4', 'Period_5', 'Period_6', 'Period_7', 'Period_8'];

const toDayOfWeek = (dateString) => {
  if (!dateString) {
    return 0;
  }

  const dt = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(dt.getTime()) ? 0 : dt.getDay();
};

function RequestSubstituteModal({ isOpen, onClose, onRequestCreated }) {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [professors, setProfessors] = useState([]);
  const [isLoadingProfessors, setIsLoadingProfessors] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [availability, setAvailability] = useState(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const loadProfessors = async () => {
      setIsLoadingProfessors(true);
      setError('');

      try {
        const result = await userApi.list({ search: searchQuery });
        setProfessors(result?.data?.items || []);
      } catch (err) {
        setError(err.message || 'Failed to load professor list');
      } finally {
        setIsLoadingProfessors(false);
      }
    };

    loadProfessors();
  }, [isOpen, searchQuery]);

  const selectedProfessor = useMemo(
    () => professors.find((item) => item.id === form.covererId) || null,
    [form.covererId, professors]
  );

  const noProfessorMessage = useMemo(() => {
    if (isLoadingProfessors) {
      return '';
    }

    if (searchQuery.trim()) {
      return 'No matching professors found. Try a different name/email or clear search.';
    }

    return 'No colleague accounts found yet. Register another professor account to send substitute requests.';
  }, [isLoadingProfessors, searchQuery]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => {
      const next = { ...previous, [name]: value };
      if (name === 'date') {
        next.dayOfWeek = toDayOfWeek(value);
      }
      return next;
    });

    if (name === 'covererId' || name === 'date' || name === 'startTime' || name === 'endTime' || name === 'termId' || name === 'period') {
      setAvailability(null);
    }
  };

  const checkAvailability = async () => {
    if (!form.covererId || !form.date || !form.startTime || !form.endTime) {
      setError('Select a professor, date, and time slot before checking availability.');
      return;
    }

    setIsCheckingAvailability(true);
    setError('');

    try {
      const overrideResult = await timetableApi.checkDateOverride({
        covererId: form.covererId,
        termId: form.termId,
        classEvent: {
          date: form.date,
          startTime: form.startTime,
          endTime: form.endTime,
        },
      });

      if (overrideResult?.data?.hasSpecificEntry) {
        setAvailability({
          ...overrideResult.data,
          source: 'timetable_override',
        });
      } else {
        const dayLabel = DAY_LABELS[Number(form.dayOfWeek)] || 'Monday';
        const routineResult = await routineApi.checkAvailability({
          targetProfessorId: form.covererId,
          dayOfWeek: dayLabel,
          period: form.period,
        });

        setAvailability({
          ...routineResult.data,
          conflicts: routineResult.data.isFree
            ? []
            : [routineResult.data.reason || 'Professor is busy in weekly routine'],
          source: 'routine_fallback',
        });
      }
    } catch (err) {
      setAvailability(null);
      setError(err.message || 'Could not check professor availability');
    } finally {
      setIsCheckingAvailability(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!availability?.isFree) {
      setError('Please check availability and choose a free professor before submitting.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await requestApi.create({
        covererId: form.covererId,
        termId: form.termId,
        classEvent: {
          date: form.date,
          dayOfWeek: Number(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          courseCode: form.courseCode,
          room: form.room,
          department: form.department,
        },
        reason: form.reason,
        requesterComment: form.requesterComment,
      });

      setForm(DEFAULT_FORM);
      setAvailability(null);
      onRequestCreated();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create substitute request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay fixed inset-0 z-50 overflow-y-auto bg-black/35 p-4 backdrop-blur-sm">
      <div className="modal-panel mx-auto max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] p-6 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="app-tag">
              <span className="h-2 w-2 rounded-full bg-[var(--eq-accent)]" />
              EquiClass request
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-[var(--eq-text)]">Request substitute coverage</h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--eq-muted)]">
              Pick a colleague, verify the slot, and send a request with all the academic context attached.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="app-button-secondary px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-[1.6rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Term</label>
              <input
                name="termId"
                value={form.termId}
                onChange={handleInputChange}
                className="app-input"
                placeholder="2026-Spring"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Search professor</label>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="app-input"
                placeholder="Name, email, or employee ID"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Select professor</label>
              <select
                name="covererId"
                value={form.covererId}
                onChange={handleInputChange}
                className="app-select"
                required
                disabled={isLoadingProfessors}
              >
                <option value="">{isLoadingProfessors ? 'Loading professors...' : 'Choose a professor'}</option>
                {professors.map((professor) => (
                  <option key={professor.id} value={professor.id}>
                    {professor.fullName} (ID: {professor.employeeCode || 'N/A'})
                  </option>
                ))}
              </select>
              {selectedProfessor && (
                <div className="mt-2 rounded-xl border border-[var(--eq-border)] bg-[var(--eq-surface-strong)] px-3 py-2 text-xs text-[var(--eq-muted-strong)]">
                  <p>
                    Department: <span className="font-semibold text-[var(--eq-text)]">{selectedProfessor.department || 'Not specified'}</span>
                  </p>
                  <p className="mt-1">
                    Employee ID: <span className="font-semibold text-[var(--eq-text)]">{selectedProfessor.employeeCode || 'N/A'}</span>
                  </p>
                </div>
              )}
              {!isLoadingProfessors && professors.length === 0 && (
                <p className="mt-2 text-xs text-[var(--eq-warning)]">
                  {noProfessorMessage}
                </p>
              )}
              {!isLoadingProfessors && professors.length > 0 && (
                <p className="mt-2 text-xs text-[var(--eq-muted)]">
                  Any professor from your college can be selected, including different departments. Your own account is excluded.
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 rounded-[1.6rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleInputChange}
                className="app-input"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Course code</label>
              <input
                name="courseCode"
                value={form.courseCode}
                onChange={handleInputChange}
                className="app-input"
                placeholder="CS301"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Start time</label>
              <input
                type="time"
                name="startTime"
                value={form.startTime}
                onChange={handleInputChange}
                className="app-input"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">End time</label>
              <input
                type="time"
                name="endTime"
                value={form.endTime}
                onChange={handleInputChange}
                className="app-input"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">
                Routine period
              </label>
              <input
                name="period"
                value={form.period}
                onChange={handleInputChange}
                className="app-input"
                list="routine-period-options"
                placeholder="Period_1"
                required
              />
              <datalist id="routine-period-options">
                {PERIOD_OPTIONS.map((period) => (
                  <option key={period} value={period} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Room</label>
              <input
                name="room"
                value={form.room}
                onChange={handleInputChange}
                className="app-input"
                placeholder="B-204"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Department</label>
              <input
                name="department"
                value={form.department}
                onChange={handleInputChange}
                className="app-input"
                placeholder="Computer Science"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Reason</label>
            <input
              name="reason"
              value={form.reason}
              onChange={handleInputChange}
              className="app-input"
              placeholder="Medical leave"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Comment</label>
            <textarea
              name="requesterComment"
              value={form.requesterComment}
              onChange={handleInputChange}
              className="app-textarea"
              rows={3}
              placeholder="Need cover for one class."
            />
          </div>

          <div className="rounded-[1.6rem] border border-[var(--eq-border)] bg-[var(--eq-surface-muted)] p-4 text-sm">
            <div className="mb-2 section-kicker">Availability check</div>
            <p className="text-[var(--eq-muted)]">
              Selected:{' '}
              {selectedProfessor
                ? `${selectedProfessor.fullName} (ID: ${selectedProfessor.employeeCode || 'N/A'})`
                : 'No professor selected'}
            </p>
            {availability && (
              <div className="mt-2">
                <p className="text-xs text-[var(--eq-muted)]">
                  Checked via:{' '}
                  {availability.source === 'timetable_override' ? 'Date-specific timetable override' : 'Weekly routine fallback'}
                </p>
                <p className={availability.isFree ? 'text-[var(--eq-success)]' : 'text-[var(--eq-danger)]'}>
                  {availability.isFree ? 'Professor is free for this slot.' : 'Professor is busy for this slot.'}
                </p>
                {!availability.isFree && availability.conflicts?.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-[var(--eq-danger)]">
                    {availability.conflicts.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-[var(--eq-danger)]">{error}</p>}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={checkAvailability}
              className="app-button-secondary"
              disabled={isCheckingAvailability}
            >
              {isCheckingAvailability ? 'Checking...' : 'Check Availability'}
            </button>

            <button
              type="submit"
              className="app-button-primary"
              disabled={isSubmitting || !availability?.isFree}
            >
              {isSubmitting ? 'Submitting...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default RequestSubstituteModal;
