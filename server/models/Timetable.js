const mongoose = require('mongoose');

const WEEKDAY_MIN = 0;
const WEEKDAY_MAX = 6;
const SLOT_TYPES = ['teaching', 'busy', 'free', 'office'];
const EXCEPTION_TYPES = ['override_busy', 'override_free', 'cancelled_class'];

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const slotSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: WEEKDAY_MIN,
      max: WEEKDAY_MAX,
    },
    startTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    endTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    type: {
      type: String,
      required: true,
      enum: SLOT_TYPES,
    },
    courseCode: {
      type: String,
      trim: true,
    },
    room: {
      type: String,
      trim: true,
    },
    recurrenceRule: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const exceptionSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    startTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    endTime: {
      type: String,
      required: true,
      match: timeRegex,
    },
    type: {
      type: String,
      required: true,
      enum: EXCEPTION_TYPES,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 400,
    },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    termId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    weeklySlots: {
      type: [slotSchema],
      default: [],
    },
    exceptions: {
      type: [exceptionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const minutesFromTime = (value) => {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
};

const assertValidRange = (start, end) => minutesFromTime(start) < minutesFromTime(end);

timetableSchema.pre('validate', function validateTimetable(next) {
  for (const slot of this.weeklySlots) {
    if (!assertValidRange(slot.startTime, slot.endTime)) {
      return next(new Error('Each weekly slot must have startTime earlier than endTime'));
    }
  }

  for (const exception of this.exceptions) {
    if (!assertValidRange(exception.startTime, exception.endTime)) {
      return next(new Error('Each exception must have startTime earlier than endTime'));
    }
  }

  return next();
});

timetableSchema.index({ userId: 1, termId: 1 }, { unique: true });
timetableSchema.index({ userId: 1, updatedAt: -1 });

module.exports = mongoose.model('Timetable', timetableSchema);
