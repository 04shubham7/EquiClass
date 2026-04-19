import { useEffect, useState } from 'react';

import { timetableApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

const DAYS = [
  { label: 'Sunday', value: 0 },
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
];

const SLOT_TYPES = ['teaching', 'busy', 'free', 'office'];

const TIMEZONE_OPTIONS = [
  { label: 'IST (Asia/Kolkata) - UTC+05:30', value: 'Asia/Kolkata' },
  { label: 'GMT (Etc/GMT) - UTC+00:00', value: 'Etc/GMT' },
  { label: 'UTC (UTC) - UTC+00:00', value: 'UTC' },
  { label: 'Europe/London - UTC+00:00/+01:00', value: 'Europe/London' },
  { label: 'America/New_York - UTC-05:00/-04:00', value: 'America/New_York' },
];

const createSlot = () => ({
  dayOfWeek: 1,
  startTime: '09:00',
  endTime: '10:00',
  type: 'busy',
  courseCode: '',
  room: '',
});

function TimetableOnboarding() {
  const { user, refreshUser } = useAuth();
  const [termId, setTermId] = useState('2026-Spring');
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Kolkata');
  const [slots, setSlots] = useState([createSlot()]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadExisting = async () => {
      if (!termId) {
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const result = await timetableApi.getMy(termId);
        const timetable = result?.data?.timetable;

        if (timetable) {
          setTimezone(timetable.timezone || user?.timezone || 'Asia/Kolkata');
          setSlots(timetable.weeklySlots?.length ? timetable.weeklySlots : [createSlot()]);
        }
      } catch (err) {
        if (err.status !== 404) {
          setError(err.message || 'Failed to load existing timetable');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadExisting();
  }, [termId, user?.timezone]);

  const updateSlot = (index, field, value) => {
    setSlots((previous) =>
      previous.map((slot, i) => (i === index ? { ...slot, [field]: value } : slot))
    );
  };

  const addSlot = () => {
    setSlots((previous) => [...previous, createSlot()]);
  };

  const removeSlot = (index) => {
    setSlots((previous) => previous.filter((_, i) => i !== index));
  };

  const saveTimetable = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await timetableApi.saveSchedule({
        termId,
        timezone,
        weeklySlots: slots.map((slot) => ({
          dayOfWeek: Number(slot.dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
          type: slot.type,
          courseCode: slot.courseCode || undefined,
          room: slot.room || undefined,
        })),
        exceptions: [],
      });

      await refreshUser();
      setSuccess('Timetable saved. You can now use the dashboard.');
    } catch (err) {
      setError(err.message || 'Failed to save timetable');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="onboarding-shell min-h-screen px-4 py-8">
      <div className="onboarding-panel mx-auto w-full max-w-6xl rounded-[2rem] p-6 sm:p-7">
        <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-5">
            <div className="app-tag">
              <span className="h-2 w-2 rounded-full bg-[var(--eq-accent)]" />
              EquiClass setup
            </div>
            <div>
              <p className="section-kicker">Weekly routine</p>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] text-[var(--eq-text)]">
                Build your teaching rhythm once, then let requests verify against it.
              </h1>
            </div>
            <p className="text-sm leading-7 text-[var(--eq-muted)] sm:text-base">
              Add your recurring busy or teaching slots so EquiClass can check whether a colleague is truly free before
              a cover request is sent.
            </p>

            <div className="grid gap-3">
              <article className="landing-card rounded-[1.5rem] p-4">
                <p className="section-kicker">1. Set the term</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">
                  Choose the term identifier and timezone your routine should use.
                </p>
              </article>
              <article className="landing-card rounded-[1.5rem] p-4">
                <p className="section-kicker">2. Add repeating slots</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">
                  Mark teaching, office, busy, or free blocks with course and room details where needed.
                </p>
              </article>
              <article className="landing-card rounded-[1.5rem] p-4">
                <p className="section-kicker">3. Save and continue</p>
                <p className="mt-2 text-sm text-[var(--eq-muted-strong)]">
                  Once saved, the dashboard becomes your default space for requests and ledger tracking.
                </p>
              </article>
            </div>
          </section>

          <form onSubmit={saveTimetable} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Term ID</label>
                <input
                  value={termId}
                  onChange={(event) => setTermId(event.target.value)}
                  className="app-input"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[var(--eq-muted-strong)]">Timezone</label>
                <select
                  value={timezone}
                  onChange={(event) => setTimezone(event.target.value)}
                  className="app-select"
                  required
                >
                  {TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {slots.map((slot, index) => (
                <div key={`${slot.dayOfWeek}-${index}`} className="landing-card rounded-[1.6rem] p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="section-kicker">Slot {index + 1}</p>
                      <p className="mt-1 text-sm text-[var(--eq-muted)]">Recurring availability block</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="app-button-secondary px-4 py-2 text-xs"
                      disabled={slots.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        Day
                      </label>
                      <select
                        value={slot.dayOfWeek}
                        onChange={(event) => updateSlot(index, 'dayOfWeek', Number(event.target.value))}
                        className="app-select min-w-[7rem]"
                      >
                        {DAYS.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        Start
                      </label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(event) => updateSlot(index, 'startTime', event.target.value)}
                        className="app-input min-w-[6.5rem]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        End
                      </label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(event) => updateSlot(index, 'endTime', event.target.value)}
                        className="app-input min-w-[6.5rem]"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        Type
                      </label>
                      <select
                        value={slot.type}
                        onChange={(event) => updateSlot(index, 'type', event.target.value)}
                        className="app-select min-w-[6.5rem]"
                      >
                        {SLOT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        Course
                      </label>
                      <input
                        value={slot.courseCode || ''}
                        onChange={(event) => updateSlot(index, 'courseCode', event.target.value)}
                        className="app-input"
                        placeholder="CS301"
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.18em] text-[var(--eq-muted)]">
                        Room
                      </label>
                      <input
                        value={slot.room || ''}
                        onChange={(event) => updateSlot(index, 'room', event.target.value)}
                        className="app-input"
                        placeholder="B-204"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addSlot}
                className="app-button-secondary"
                disabled={isLoading}
              >
                Add Slot
              </button>
              <button
                type="submit"
                className="app-button-primary"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting ? 'Saving...' : 'Save Timetable'}
              </button>
            </div>

            {error && <p className="text-sm text-[var(--eq-danger)]">{error}</p>}
            {success && <p className="text-sm text-[var(--eq-success)]">{success}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default TimetableOnboarding;
