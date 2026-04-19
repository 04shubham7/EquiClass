const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const userSchema = new mongoose.Schema(
  {
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'College',
      required: [true, 'College is required'],
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      lowercase: true,
      trim: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Please provide a valid email address',
      },
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [120, 'Full name cannot exceed 120 characters'],
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      maxlength: [120, 'Department cannot exceed 120 characters'],
    },
    employeeCode: {
      type: String,
      trim: true,
    },
    roles: {
      type: [String],
      default: ['professor'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ department: 1 });
userSchema.index({ collegeId: 1, email: 1 }, { unique: true });
userSchema.index(
  { collegeId: 1, employeeCode: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeCode: { $exists: true, $type: 'string', $ne: '' } },
  }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);
  return next();
});

userSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function toSafeObject() {
  return {
    id: this._id.toString(),
    collegeId: this.collegeId?.toString?.() || this.collegeId,
    email: this.email,
    fullName: this.fullName,
    department: this.department,
    employeeCode: this.employeeCode,
    roles: this.roles,
    isActive: this.isActive,
    onboardingCompleted: this.onboardingCompleted,
    timezone: this.timezone,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
    lastLoginAt: this.lastLoginAt,
  };
};

module.exports = mongoose.model('User', userSchema);
