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
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
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
          setTimezone(timetable.timezone || user?.timezone || 'UTC');
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
      <div className="onboarding-panel mx-auto w-full max-w-5xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Set Up Weekly Timetable</h1>
        <p className="mt-1 text-sm text-slate-600">
          Add your busy/teaching slots so ClassSwap can verify availability before class cover requests.
        </p>

        <form onSubmit={saveTimetable} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Term ID</label>
              <input
                value={termId}
                onChange={(event) => setTermId(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Timezone</label>
              <input
                value={timezone}
                onChange={(event) => setTimezone(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            {slots.map((slot, index) => (
              <div key={`${slot.dayOfWeek}-${index}`} className="rounded-xl border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-6">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Day</label>
                    <select
                      value={slot.dayOfWeek}
                      onChange={(event) => updateSlot(index, 'dayOfWeek', Number(event.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      {DAYS.map((day) => (
                        <option key={day.value} value={day.value}>
                          {day.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Start</label>
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(event) => updateSlot(index, 'startTime', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">End</label>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(event) => updateSlot(index, 'endTime', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                    <select
                      value={slot.type}
                      onChange={(event) => updateSlot(index, 'type', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                    >
                      {SLOT_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Course</label>
                    <input
                      value={slot.courseCode || ''}
                      onChange={(event) => updateSlot(index, 'courseCode', event.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                      placeholder="CS301"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs font-medium text-slate-600">Room</label>
                      <input
                        value={slot.room || ''}
                        onChange={(event) => updateSlot(index, 'room', event.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                        placeholder="B-204"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSlot(index)}
                      className="rounded-lg border border-rose-300 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      disabled={slots.length === 1}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={addSlot}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              disabled={isLoading}
            >
              Add Slot
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? 'Saving...' : 'Save Timetable'}
            </button>
          </div>

          {error && <p className="text-sm text-rose-700">{error}</p>}
          {success && <p className="text-sm text-emerald-700">{success}</p>}
        </form>
      </div>
    </div>
  );
}

export default TimetableOnboarding;
