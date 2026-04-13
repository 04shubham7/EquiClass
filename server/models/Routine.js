const mongoose = require('mongoose');

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

const periodBlockSchema = new mongoose.Schema(
  {
    isFree: {
      type: Boolean,
      required: true,
      default: true,
    },
    subjectCode: {
      type: String,
      trim: true,
      maxlength: 32,
      default: null,
    },
    classroom: {
      type: String,
      trim: true,
      maxlength: 64,
      default: null,
    },
  },
  { _id: false }
);

const createDefaultDayMap = () => {
  const dayMap = new Map();

  for (const periodKey of DEFAULT_PERIODS) {
    dayMap.set(periodKey, {
      isFree: true,
      subjectCode: null,
      classroom: null,
    });
  }

  return dayMap;
};

const routineSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    periodOrder: {
      type: [String],
      default: DEFAULT_PERIODS,
    },
    week: {
      monday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
      tuesday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
      wednesday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
      thursday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
      friday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
      saturday: {
        type: Map,
        of: periodBlockSchema,
        default: createDefaultDayMap,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

routineSchema.pre('validate', function validateWeekDays(next) {
  if (!this.week) {
    return next(new Error('week is required'));
  }

  if (!Array.isArray(this.periodOrder) || this.periodOrder.length === 0) {
    return next(new Error('periodOrder must include at least one period'));
  }

  for (const dayKey of DAY_KEYS) {
    const daySchedule = this.week[dayKey];

    if (!daySchedule) {
      return next(new Error(`Missing day schedule: ${dayKey}`));
    }

    const entries = daySchedule instanceof Map ? Array.from(daySchedule.entries()) : Object.entries(daySchedule);

    if (entries.length === 0) {
      return next(new Error(`Day schedule cannot be empty: ${dayKey}`));
    }

    for (const [periodKey, block] of entries) {
      if (!String(periodKey || '').trim()) {
        return next(new Error(`Invalid period key in ${dayKey}`));
      }

      if (typeof block?.isFree !== 'boolean') {
        return next(new Error(`Invalid isFree value for ${dayKey}.${periodKey}`));
      }

      if (!block.isFree) {
        if (!String(block.subjectCode || '').trim()) {
          return next(new Error(`subjectCode is required when period is busy: ${dayKey}.${periodKey}`));
        }

        if (!String(block.classroom || '').trim()) {
          return next(new Error(`classroom is required when period is busy: ${dayKey}.${periodKey}`));
        }
      }
    }
  }

  return next();
});

module.exports = mongoose.model('Routine', routineSchema);
