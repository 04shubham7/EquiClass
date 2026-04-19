const mongoose = require('mongoose');

const Timetable = require('../models/Timetable');
const User = require('../models/User');

const BUSY_SLOT_TYPES = new Set(['teaching', 'busy', 'office']);
const EXCEPTION_FREE_TYPES = new Set(['override_free', 'cancelled_class']);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const toMinutes = (timeValue) => {
  const [hour, minute] = timeValue.split(':').map(Number);
  return hour * 60 + minute;
};

const hasOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

const validateSlot = (slot) => {
  if (!Number.isInteger(slot.dayOfWeek) || slot.dayOfWeek < 0 || slot.dayOfWeek > 6) {
    return 'dayOfWeek must be an integer from 0 to 6';
  }

  if (!timeRegex.test(slot.startTime) || !timeRegex.test(slot.endTime)) {
    return 'startTime and endTime must use HH:mm format';
  }

  if (toMinutes(slot.startTime) >= toMinutes(slot.endTime)) {
    return 'startTime must be earlier than endTime';
  }

  return null;
};

const detectWeeklyOverlap = (weeklySlots) => {
  const byDay = new Map();

  for (const slot of weeklySlots) {
    if (!byDay.has(slot.dayOfWeek)) {
      byDay.set(slot.dayOfWeek, []);
    }

    byDay.get(slot.dayOfWeek).push(slot);
  }

  for (const [, daySlots] of byDay.entries()) {
    const sorted = daySlots.slice().sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));

    for (let i = 1; i < sorted.length; i += 1) {
      const previous = sorted[i - 1];
      const current = sorted[i];

      if (
        hasOverlap(
          toMinutes(previous.startTime),
          toMinutes(previous.endTime),
          toMinutes(current.startTime),
          toMinutes(current.endTime)
        )
      ) {
        return `Overlapping weekly slots found on day ${current.dayOfWeek}`;
      }
    }
  }

  return null;
};

const saveWeeklySchedule = async (req, res, next) => {
  try {
    const { termId, timezone, weeklySlots, exceptions } = req.body;

    if (!termId || !Array.isArray(weeklySlots)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'termId and weeklySlots are required',
        },
      });
    }

    for (const slot of weeklySlots) {
      const slotValidationError = validateSlot(slot);
      if (slotValidationError) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_WEEKLY_SLOT',
            message: slotValidationError,
          },
        });
      }
    }

    const overlapError = detectWeeklyOverlap(weeklySlots);
    if (overlapError) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'SLOT_OVERLAP',
          message: overlapError,
        },
      });
    }

    const normalizedExceptions = Array.isArray(exceptions) ? exceptions : [];

    for (const exception of normalizedExceptions) {
      if (!dateRegex.test(exception.date || '')) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_EXCEPTION_DATE',
            message: 'Exception date must use YYYY-MM-DD format',
          },
        });
      }

      if (!timeRegex.test(exception.startTime || '') || !timeRegex.test(exception.endTime || '')) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_EXCEPTION_TIME',
            message: 'Exception startTime and endTime must use HH:mm format',
          },
        });
      }

      if (toMinutes(exception.startTime) >= toMinutes(exception.endTime)) {
        return res.status(422).json({
          success: false,
          error: {
            code: 'INVALID_EXCEPTION_RANGE',
            message: 'Exception startTime must be earlier than endTime',
          },
        });
      }
    }

    const userId = req.user.id;

    const timetable = await Timetable.findOneAndUpdate(
      { userId, termId: String(termId).trim() },
      {
        userId,
        termId: String(termId).trim(),
        timezone: timezone ? String(timezone).trim() : 'UTC',
        weeklySlots,
        exceptions: normalizedExceptions,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    await User.findByIdAndUpdate(userId, {
      onboardingCompleted: true,
      ...(timezone ? { timezone: String(timezone).trim() } : {}),
    });

    return res.status(200).json({
      success: true,
      data: {
        timetable,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMyTimetable = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { termId } = req.query;

    if (!termId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'termId query parameter is required',
        },
      });
    }

    const timetable = await Timetable.findOne({
      userId,
      termId: String(termId).trim(),
    });

    return res.status(200).json({
      success: true,
      data: {
        timetable,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const checkProfessorAvailability = async (req, res, next) => {
  try {
    const { covererId, termId, classEvent } = req.body;
    const requesterCollegeId = req.user.collegeId;

    if (!covererId || !termId || !classEvent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'covererId, termId, and classEvent are required',
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(covererId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COVERER_ID',
          message: 'covererId must be a valid ObjectId',
        },
      });
    }

    const { date, dayOfWeek, startTime, endTime } = classEvent;

    if (!dateRegex.test(date || '') || !timeRegex.test(startTime || '') || !timeRegex.test(endTime || '')) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: 'classEvent date/time format is invalid',
        },
      });
    }

    const targetDay = Number.isInteger(dayOfWeek) ? dayOfWeek : new Date(`${date}T00:00:00Z`).getUTCDay();

    if (targetDay < 0 || targetDay > 6 || toMinutes(startTime) >= toMinutes(endTime)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: 'classEvent has invalid dayOfWeek or time range',
        },
      });
    }

    const coverer = await User.findOne({
      _id: covererId,
      isActive: true,
      collegeId: requesterCollegeId,
    }).select('_id');

    if (!coverer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COVERER_NOT_FOUND',
          message: 'Selected professor does not exist in your college or is inactive',
        },
      });
    }

    const timetable = await Timetable.findOne({
      userId: covererId,
      termId: String(termId).trim(),
    });

    if (!timetable) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          isFree: false,
          conflicts: ['No timetable found for selected professor and term'],
          checkedAt: new Date().toISOString(),
        },
      });
    }

    const targetStart = toMinutes(startTime);
    const targetEnd = toMinutes(endTime);

    const exceptionOverlaps = timetable.exceptions.filter((exception) => {
      if (exception.date !== date) {
        return false;
      }

      return hasOverlap(
        targetStart,
        targetEnd,
        toMinutes(exception.startTime),
        toMinutes(exception.endTime)
      );
    });

    if (exceptionOverlaps.some((item) => item.type === 'override_busy')) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          isFree: false,
          conflicts: exceptionOverlaps
            .filter((item) => item.type === 'override_busy')
            .map((item) => `Exception busy slot ${item.startTime}-${item.endTime}`),
          checkedAt: new Date().toISOString(),
        },
      });
    }

    if (exceptionOverlaps.some((item) => EXCEPTION_FREE_TYPES.has(item.type))) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          isFree: true,
          conflicts: [],
          checkedAt: new Date().toISOString(),
        },
      });
    }

    const busyWeeklyOverlaps = timetable.weeklySlots
      .filter((slot) => slot.dayOfWeek === targetDay && BUSY_SLOT_TYPES.has(slot.type))
      .filter((slot) =>
        hasOverlap(targetStart, targetEnd, toMinutes(slot.startTime), toMinutes(slot.endTime))
      );

    if (busyWeeklyOverlaps.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          isFree: false,
          conflicts: busyWeeklyOverlaps.map(
            (slot) => `${slot.type} slot ${slot.startTime}-${slot.endTime}${slot.courseCode ? ` (${slot.courseCode})` : ''}`
          ),
          checkedAt: new Date().toISOString(),
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        covererId,
        termId: String(termId).trim(),
        isFree: true,
        conflicts: [],
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const checkDateOverrideAvailability = async (req, res, next) => {
  try {
    const { covererId, termId, classEvent } = req.body;
    const requesterCollegeId = req.user.collegeId;

    if (!covererId || !termId || !classEvent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'covererId, termId, and classEvent are required',
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(covererId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COVERER_ID',
          message: 'covererId must be a valid ObjectId',
        },
      });
    }

    const { date, startTime, endTime } = classEvent;

    if (!dateRegex.test(date || '') || !timeRegex.test(startTime || '') || !timeRegex.test(endTime || '')) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: 'classEvent date/time format is invalid',
        },
      });
    }

    if (toMinutes(startTime) >= toMinutes(endTime)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: 'classEvent has invalid time range',
        },
      });
    }

    const coverer = await User.findOne({
      _id: covererId,
      isActive: true,
      collegeId: requesterCollegeId,
    }).select('_id');

    if (!coverer) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COVERER_NOT_FOUND',
          message: 'Selected professor does not exist in your college or is inactive',
        },
      });
    }

    const timetable = await Timetable.findOne({
      userId: covererId,
      termId: String(termId).trim(),
    });

    if (!timetable) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          hasSpecificEntry: false,
          isFree: null,
          conflicts: [],
          checkedAt: new Date().toISOString(),
          reason: 'No timetable found for selected professor and term',
        },
      });
    }

    const targetStart = toMinutes(startTime);
    const targetEnd = toMinutes(endTime);

    const exceptionOverlaps = timetable.exceptions.filter((exception) => {
      if (exception.date !== date) {
        return false;
      }

      return hasOverlap(
        targetStart,
        targetEnd,
        toMinutes(exception.startTime),
        toMinutes(exception.endTime)
      );
    });

    if (exceptionOverlaps.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          hasSpecificEntry: false,
          isFree: null,
          conflicts: [],
          checkedAt: new Date().toISOString(),
        },
      });
    }

    const busyOverrides = exceptionOverlaps
      .filter((item) => item.type === 'override_busy')
      .map((item) => `Exception busy slot ${item.startTime}-${item.endTime}`);

    if (busyOverrides.length > 0) {
      return res.status(200).json({
        success: true,
        data: {
          covererId,
          termId: String(termId).trim(),
          hasSpecificEntry: true,
          isFree: false,
          conflicts: busyOverrides,
          checkedAt: new Date().toISOString(),
          source: 'timetable_override',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        covererId,
        termId: String(termId).trim(),
        hasSpecificEntry: true,
        isFree: true,
        conflicts: [],
        checkedAt: new Date().toISOString(),
        source: 'timetable_override',
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyTimetable,
  saveWeeklySchedule,
  checkProfessorAvailability,
  checkDateOverrideAvailability,
};
