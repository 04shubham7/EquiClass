const mongoose = require('mongoose');

const classEventSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
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
    },
  },
  { _id: false }
);

const ledgerTransactionSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Request',
      required: true,
      unique: true,
      index: true,
    },
    debtorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    creditorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    units: {
      type: Number,
      default: 1,
      min: -100,
      max: 100,
    },
    unitType: {
      type: String,
      default: 'class',
      enum: ['class'],
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
    note: {
      type: String,
      trim: true,
      maxlength: 400,
    },
    createdBySystem: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

ledgerTransactionSchema.index({ debtorId: 1, creditorId: 1, createdAt: -1 });
ledgerTransactionSchema.index({ termId: 1, createdAt: -1 });

module.exports = mongoose.model('LedgerTransaction', ledgerTransactionSchema);
