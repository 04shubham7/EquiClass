const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [120, 'Actor name cannot exceed 120 characters'],
    },
    actorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: [160, 'Actor email cannot exceed 160 characters'],
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: ['college_approved', 'college_rejected', 'college_activated', 'college_disabled'],
      index: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ['college'],
      default: 'college',
      index: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: [220, 'Target label cannot exceed 220 characters'],
    },
    details: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

adminAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
