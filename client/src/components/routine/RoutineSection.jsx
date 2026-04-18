import { useCallback, useEffect, useMemo, useState } from 'react';

import { routineApi } from '../../lib/api';
import FeedbackBanner from './FeedbackBanner';
import RoutineLegend from './RoutineLegend';
import RoutineToolbar from './RoutineToolbar';
import SaveBar from './SaveBar';
import WeeklyRoutineGrid from './WeeklyRoutineGrid';

const DAYS = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
];

const DEFAULT_PERIOD_KEYS = [
  'Period_1',
  'Period_2',
  'Period_3',
  'Period_4',
  'Period_5',
  'Period_6',
  'Period_7',
  'Period_8',
];

const createDefaultBlock = () => ({ isFree: true, subjectCode: null, classroom: null });

const sortPeriodKeys = (keys) =>
  [...keys].sort((a, b) => {
    const aMatch = String(a).match(/(\d+)$/);
    const bMatch = String(b).match(/(\d+)$/);
    if (aMatch && bMatch) {
      return Number(aMatch[1]) - Number(bMatch[1]);
    }
    return String(a).localeCompare(String(b));
  });

const resolvePeriodKeys = (routine) => {
  const fromOrder = Array.isArray(routine?.periodOrder) ? routine.periodOrder.filter(Boolean) : [];
  if (fromOrder.length) {
    return sortPeriodKeys(fromOrder);
  }

  const discovered = [];
  const week = routine?.week || {};
  for (const day of DAYS) {
    const daySlots = week?.[day.key] || {};
    for (const key of Object.keys(daySlots)) {
      if (!discovered.includes(key)) {
        discovered.push(key);
      }
    }
  }

  return discovered.length ? sortPeriodKeys(discovered) : [...DEFAULT_PERIOD_KEYS];
};

const createDefaultWeek = (periodKeys = DEFAULT_PERIOD_KEYS) =>
  DAYS.reduce((weekAcc, day) => {
    weekAcc[day.key] = periodKeys.reduce((periodAcc, period) => {
      periodAcc[period] = createDefaultBlock();
      return periodAcc;
    }, {});
    return weekAcc;
  }, {});

const cloneWeek = (week) => JSON.parse(JSON.stringify(week));

const normalizeWeek = (payloadWeek, periodKeys) => {
  const normalized = createDefaultWeek(periodKeys);

  for (const day of DAYS) {
    for (const period of periodKeys) {
      const block = payloadWeek?.[day.key]?.[period];
      normalized[day.key][period] = {
        isFree: block?.isFree ?? true,
        subjectCode: block?.subjectCode ?? null,
        classroom: block?.classroom ?? null,
      };
    }
  }

  return normalized;
};

function RoutineSection() {
  const [periodKeys, setPeriodKeys] = useState([...DEFAULT_PERIOD_KEYS]);
  const [week, setWeek] = useState(createDefaultWeek(DEFAULT_PERIOD_KEYS));
  const [initialWeek, setInitialWeek] = useState(createDefaultWeek(DEFAULT_PERIOD_KEYS));
  const [initialPeriodKeys, setInitialPeriodKeys] = useState([...DEFAULT_PERIOD_KEYS]);
  const [newPeriodNumber, setNewPeriodNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  const isDirty = useMemo(() => {
    const periodChanged = JSON.stringify(periodKeys) !== JSON.stringify(initialPeriodKeys);
    const weekChanged = JSON.stringify(week) !== JSON.stringify(initialWeek);
    return periodChanged || weekChanged;
  }, [periodKeys, initialPeriodKeys, week, initialWeek]);

  const loadRoutine = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const result = await routineApi.getMy();
      const routine = result?.data?.routine;
      const resolvedKeys = resolvePeriodKeys(routine);
      const normalized = normalizeWeek(routine?.week || {}, resolvedKeys);

      setPeriodKeys(resolvedKeys);
      setInitialPeriodKeys([...resolvedKeys]);
      setWeek(normalized);
      setInitialWeek(cloneWeek(normalized));
      setLastSavedAt(routine?.updatedAt || null);
    } catch (err) {
      setError(err.message || 'Failed to load routine');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutine();
  }, [loadRoutine]);

  const handleTogglePeriod = (dayKey, periodKey) => {
    setWeek((previous) => {
      const next = cloneWeek(previous);
      const nextValue = !next[dayKey][periodKey].isFree;
      next[dayKey][periodKey].isFree = nextValue;
      if (nextValue) {
        next[dayKey][periodKey].subjectCode = null;
        next[dayKey][periodKey].classroom = null;
      }
      return next;
    });
  };

  const handleSubjectChange = (dayKey, periodKey, value) => {
    setWeek((previous) => {
      const next = cloneWeek(previous);
      next[dayKey][periodKey].isFree = false;
      next[dayKey][periodKey].subjectCode = value || null;
      return next;
    });
  };

  const handleClassroomChange = (dayKey, periodKey, value) => {
    setWeek((previous) => {
      const next = cloneWeek(previous);
      next[dayKey][periodKey].isFree = false;
      next[dayKey][periodKey].classroom = value || null;
      return next;
    });
  };

  const handleSetDay = (dayKey, isFree) => {
    setWeek((previous) => {
      const next = cloneWeek(previous);
      for (const period of periodKeys) {
        next[dayKey][period].isFree = isFree;
        if (isFree) {
          next[dayKey][period].subjectCode = null;
          next[dayKey][period].classroom = null;
        }
      }
      return next;
    });
  };

  const handleMarkAll = (isFree) => {
    setWeek((previous) => {
      const next = cloneWeek(previous);
      for (const day of DAYS) {
        for (const period of periodKeys) {
          next[day.key][period].isFree = isFree;
          if (isFree) {
            next[day.key][period].subjectCode = null;
            next[day.key][period].classroom = null;
          }
        }
      }
      return next;
    });
  };

  const handleAddPeriod = () => {
    const periodNo = Number(newPeriodNumber);
    if (!Number.isInteger(periodNo) || periodNo <= 0) {
      setError('Enter a valid positive period number.');
      return;
    }

    const periodKey = `Period_${periodNo}`;
    if (periodKeys.includes(periodKey)) {
      setError(`${periodKey} already exists.`);
      return;
    }

    const nextKeys = sortPeriodKeys([...periodKeys, periodKey]);
    setPeriodKeys(nextKeys);
    setWeek((previous) => {
      const next = cloneWeek(previous);
      for (const day of DAYS) {
        next[day.key][periodKey] = createDefaultBlock();
      }
      return next;
    });
    setNewPeriodNumber('');
    setError('');
    setSuccess(`${periodKey} added.`);
  };

  const handleRemovePeriod = (periodKey) => {
    if (periodKeys.length <= 1) {
      setError('At least one period is required.');
      return;
    }

    const nextKeys = periodKeys.filter((key) => key !== periodKey);
    setPeriodKeys(nextKeys);
    setWeek((previous) => {
      const next = cloneWeek(previous);
      for (const day of DAYS) {
        delete next[day.key][periodKey];
      }
      return next;
    });
    setError('');
    setSuccess(`${periodKey} removed.`);
  };

  const handleReset = () => {
    setPeriodKeys([...initialPeriodKeys]);
    setWeek(cloneWeek(initialWeek));
    setError('');
    setSuccess('Changes reverted to last saved routine.');
  };

  const handleSave = async () => {
    for (const day of DAYS) {
      for (const period of periodKeys) {
        const block = week?.[day.key]?.[period] || createDefaultBlock();
        if (!block.isFree && (!block.subjectCode || !block.classroom)) {
          setError(`${day.label} ${period}: Subject code and Classroom are required when Busy.`);
          return;
        }
      }
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const result = await routineApi.update({ week, periodOrder: periodKeys });
      const routine = result?.data?.routine;
      const savedKeys = resolvePeriodKeys(routine || { week, periodOrder: periodKeys });
      const savedWeek = normalizeWeek(routine?.week || week, savedKeys);

      setPeriodKeys(savedKeys);
      setInitialPeriodKeys([...savedKeys]);
      setWeek(cloneWeek(savedWeek));
      setInitialWeek(cloneWeek(savedWeek));
      setLastSavedAt(result?.data?.routine?.updatedAt || new Date().toISOString());
      setSuccess('Routine saved successfully.');
    } catch (err) {
      setError(err.message || 'Failed to save routine');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="routine-panel mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <RoutineToolbar
        onMarkAllFree={() => handleMarkAll(true)}
        onMarkAllBusy={() => handleMarkAll(false)}
        isSaving={isSaving || isLoading}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <label htmlFor="newPeriodNumber" className="text-xs font-semibold text-slate-700">
          Add period number
        </label>
        <input
          id="newPeriodNumber"
          type="number"
          min="1"
          value={newPeriodNumber}
          onChange={(event) => setNewPeriodNumber(event.target.value)}
          className="w-24 rounded-md border border-slate-300 px-2 py-1 text-xs"
          disabled={isSaving || isLoading}
          placeholder="e.g. 9"
        />
        <button
          type="button"
          onClick={handleAddPeriod}
          disabled={isSaving || isLoading}
          className="rounded-md border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
        >
          Add Period
        </button>
        <div className="flex flex-wrap gap-1">
          {periodKeys.map((periodKey) => (
            <button
              key={`${periodKey}_remove`}
              type="button"
              onClick={() => handleRemovePeriod(periodKey)}
              disabled={isSaving || isLoading || periodKeys.length <= 1}
              className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              title={`Remove ${periodKey}`}
            >
              Remove {periodKey}
            </button>
          ))}
        </div>
      </div>

      <RoutineLegend />
      <FeedbackBanner error={error} success={success} />

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading routine...</p>
      ) : (
        <>
          <WeeklyRoutineGrid
            days={DAYS}
            periodKeys={periodKeys}
            weekData={week}
            onTogglePeriod={handleTogglePeriod}
            onSubjectChange={handleSubjectChange}
            onClassroomChange={handleClassroomChange}
            onSetDay={handleSetDay}
            isSaving={isSaving}
          />
          <SaveBar
            isDirty={isDirty}
            isSaving={isSaving}
            onSave={handleSave}
            onReset={handleReset}
            lastSavedAt={lastSavedAt}
          />
        </>
      )}
    </section>
  );
}

export default RoutineSection;
