const mongoose = require('mongoose');

const Routine = require('../models/Routine');
const User = require('../models/User');

const DEFAULT_PERIODS = [
  'Period_1',
  'Period_2',
  'Period_3',
  'Period_4',
  'Period_5',
  'Period_6',
  'Period_7',
  'Period_8',
];

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const createDefaultDay = (periodOrder = DEFAULT_PERIODS) =>
  periodOrder.reduce((acc, period) => {
    acc[period] = { isFree: true, subjectCode: null, classroom: null };
    return acc;
  }, {});

const createDefaultWeek = (periodOrder = DEFAULT_PERIODS) =>
  DAY_KEYS.reduce((acc, day) => {
    acc[day] = createDefaultDay(periodOrder);
    return acc;
  }, {});

const normalizeDayKey = (dayOfWeek) => String(dayOfWeek || '').trim().toLowerCase();

const normalizePeriod = (period) => String(period || '').trim();

const getDayPeriodKeys = (daySchedule) => {
  if (!daySchedule) {
    return [];
  }

  if (daySchedule instanceof Map) {
    return Array.from(daySchedule.keys());
  }

  return Object.keys(daySchedule);
};

const getDayBlock = (daySchedule, period) => {
  if (!daySchedule) {
    return null;
  }

  if (daySchedule instanceof Map) {
    return daySchedule.get(period) || null;
  }

  return daySchedule[period] || null;
};

const validateWeekPayload = (week, periodOrderPayload) => {
  if (!week || typeof week !== 'object') {
    return { error: 'week object is required' };
  }

  const normalizedWeek = {};
  const derivedPeriodSet = new Set();

  for (const day of DAY_KEYS) {
    const dayValue = week[day];
    if (!dayValue || typeof dayValue !== 'object') {
      return { error: `Missing or invalid day payload: ${day}` };
    }

    const dayEntries = Object.entries(dayValue);
    if (dayEntries.length === 0) {
      return { error: `Day payload cannot be empty: ${day}` };
    }

    const normalizedDay = {};

    for (const [rawPeriod, block] of dayEntries) {
      const period = normalizePeriod(rawPeriod);

      if (!period) {
        return { error: `Invalid period key in ${day}` };
      }

      if (!block || typeof block !== 'object') {
        return { error: `Missing period block ${period} in ${day}` };
      }

      if (typeof block.isFree !== 'boolean') {
        return { error: `${day}.${period}.isFree must be boolean` };
      }

      if (block.subjectCode !== undefined && block.subjectCode !== null && typeof block.subjectCode !== 'string') {
        return { error: `${day}.${period}.subjectCode must be a string or null` };
      }

      if (block.classroom !== undefined && block.classroom !== null && typeof block.classroom !== 'string') {
        return { error: `${day}.${period}.classroom must be a string or null` };
      }

      if (!block.isFree) {
        if (!String(block.subjectCode || '').trim()) {
          return { error: `${day}.${period}.subjectCode is required when Busy` };
        }

        if (!String(block.classroom || '').trim()) {
          return { error: `${day}.${period}.classroom is required when Busy` };
        }
      }

      normalizedDay[period] = {
        isFree: block.isFree,
        subjectCode: block.isFree ? null : String(block.subjectCode || '').trim(),
        classroom: block.isFree ? null : String(block.classroom || '').trim(),
      };

      derivedPeriodSet.add(period);
    }

    normalizedWeek[day] = normalizedDay;
  }

  const normalizedPeriodOrder = Array.isArray(periodOrderPayload)
    ? periodOrderPayload
        .map(normalizePeriod)
        .filter(Boolean)
        .filter((value, index, list) => list.indexOf(value) === index)
    : [];

  const finalPeriodOrder = (normalizedPeriodOrder.length ? normalizedPeriodOrder : Array.from(derivedPeriodSet)).filter(
    (period, index, list) => list.indexOf(period) === index
  );

  if (finalPeriodOrder.length === 0) {
    return { error: 'At least one period is required' };
  }

  return {
    error: null,
    week: normalizedWeek,
    periodOrder: finalPeriodOrder,
  };
};

const getMyRoutine = async (req, res, next) => {
  try {
    const userId = req.user.id;

    let routine = await Routine.findOne({ userId });

    if (!routine) {
      routine = await Routine.create({
        userId,
        periodOrder: DEFAULT_PERIODS,
        week: createDefaultWeek(DEFAULT_PERIODS),
      });
    }

    if (!Array.isArray(routine.periodOrder) || routine.periodOrder.length === 0) {
      const mondayPeriods = getDayPeriodKeys(routine.week?.monday);
      routine.periodOrder = mondayPeriods.length ? mondayPeriods : DEFAULT_PERIODS;
      await routine.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        routine,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateRoutine = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { week, periodOrder } = req.body;

    const validation = validateWeekPayload(week, periodOrder);
    if (validation.error) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_ROUTINE_PAYLOAD',
          message: validation.error,
        },
      });
    }

    const routine = await Routine.findOneAndUpdate(
      { userId },
      {
        userId,
        periodOrder: validation.periodOrder,
        week: validation.week,
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        routine,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const checkRoutineAvailability = async (req, res, next) => {
  try {
    const { targetProfessorId, dayOfWeek, period } = req.body;
    const requesterCollegeId = req.user.collegeId;

    if (!targetProfessorId || !dayOfWeek || !period) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'targetProfessorId, dayOfWeek, and period are required',
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(targetProfessorId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TARGET_PROFESSOR_ID',
          message: 'targetProfessorId must be a valid ObjectId',
        },
      });
    }

    const normalizedDay = normalizeDayKey(dayOfWeek);
    if (!DAY_KEYS.includes(normalizedDay)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_DAY_OF_WEEK',
          message: 'dayOfWeek must be one of Monday-Saturday',
        },
      });
    }

    const normalizedPeriod = String(period).trim();
    if (!normalizedPeriod) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_PERIOD',
          message: 'period is required',
        },
      });
    }

    const professor = await User.findOne({
      _id: targetProfessorId,
      isActive: true,
      collegeId: requesterCollegeId,
    }).select('isActive');
    if (!professor || !professor.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROFESSOR_NOT_FOUND',
          message: 'Target professor does not exist or is inactive',
        },
      });
    }

    const routine = await Routine.findOne({ userId: targetProfessorId });

    if (!routine) {
      return res.status(200).json({
        success: true,
        data: {
          targetProfessorId,
          dayOfWeek: normalizedDay,
          period: normalizedPeriod,
          isFree: false,
          subjectCode: null,
          reason: 'No routine found for this professor',
        },
      });
    }

    const daySchedule = routine.week?.[normalizedDay];
    const block = getDayBlock(daySchedule, normalizedPeriod);

    if (!block) {
      return res.status(200).json({
        success: true,
        data: {
          targetProfessorId,
          dayOfWeek: normalizedDay,
          period: normalizedPeriod,
          isFree: false,
          subjectCode: null,
          classroom: null,
          reason: 'Routine block missing',
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        targetProfessorId,
        dayOfWeek: normalizedDay,
        period: normalizedPeriod,
        isFree: Boolean(block.isFree),
        subjectCode: block.subjectCode || null,
        classroom: block.classroom || null,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getMyRoutine,
  updateRoutine,
  checkRoutineAvailability,
};
