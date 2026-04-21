const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'College name is required'],
      trim: true,
      maxlength: [180, 'College name cannot exceed 180 characters'],
    },
    code: {
      type: String,
      required: [true, 'College code is required'],
      uppercase: true,
      trim: true,
      maxlength: [32, 'College code cannot exceed 32 characters'],
      match: [/^[A-Z0-9-]{4,32}$/, 'College code must be 4-32 chars using A-Z, 0-9, or -'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    verificationNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Verification note cannot exceed 500 characters'],
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

collegeSchema.index({ code: 1 }, { unique: true });
collegeSchema.index({ name: 1 });

module.exports = mongoose.model('College', collegeSchema);
