const mongoose = require('mongoose');

const REQUEST_STATUSES = ['pending', 'accepted', 'declined', 'cancelled', 'expired'];

const classEventSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    endTime: {
      type: String,
      required: true,
      match: /^([01]\d|2[0-3]):([0-5]\d)$/,
    },
    courseCode: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    room: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    department: {
      type: String,
      trim: true,
      maxlength: 120,
    },
  },
  { _id: false }
);

const availabilitySnapshotSchema = new mongoose.Schema(
  {
    checkedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    isCovererFree: {
      type: Boolean,
      required: true,
    },
    conflictDetails: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const requestSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      index: true,
    },
    requesterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    covererId: {
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
    classEvent: {
      type: classEventSchema,
      required: true,
    },
    status: {
      type: String,
      enum: REQUEST_STATUSES,
      default: 'pending',
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 400,
    },
    requesterComment: {
      type: String,
      trim: true,
      maxlength: 400,
    },
    covererComment: {
      type: String,
      trim: true,
      maxlength: 400,
    },
    availabilitySnapshot: {
      type: availabilitySnapshotSchema,
      required: true,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

requestSchema.index({ requesterId: 1, status: 1, createdAt: -1 });
requestSchema.index({ covererId: 1, status: 1, createdAt: -1 });
requestSchema.index({ collegeId: 1, status: 1, createdAt: -1 });
requestSchema.index({ termId: 1, 'classEvent.date': 1 });
requestSchema.index({ status: 1, expiresAt: 1 });

module.exports = mongoose.model('Request', requestSchema);
