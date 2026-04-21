const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const validator = require('validator');

const College = require('../models/College');
const User = require('../models/User');
const { CODE_REGEX } = require('../utils/collegeCode');
const { isGlobalAdminEmail } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not set in environment variables.');
}

const signAccessToken = (userId) =>
  jwt.sign(
    {
      sub: userId,
      type: 'access',
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );

const sendAuthResponse = (res, statusCode, user) => {
  const accessToken = signAccessToken(user._id.toString());

  return res.status(statusCode).json({
    success: true,
    data: {
      user: user.toSafeObject(),
      tokens: {
        accessToken,
        expiresIn: JWT_EXPIRES_IN,
      },
    },
  });
};

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();
const normalizeCollegeCode = (code) => String(code || '').trim().toUpperCase();

const ensureGlobalAdminRole = async (user) => {
  if (!user || !isGlobalAdminEmail(user.email)) {
    return user;
  }

  if (Array.isArray(user.roles) && user.roles.includes('global_admin')) {
    return user;
  }

  user.roles = Array.from(new Set([...(user.roles || []), 'global_admin']));
  await user.save();
  return user;
};

const resolveCollegeFromInput = async ({ collegeId, collegeCode, requireActive = true }) => {
  if (collegeId) {
    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      return null;
    }

    return College.findOne({
      _id: collegeId,
      ...(requireActive ? { isActive: true } : {}),
    });
  }

  const normalizedCollegeCode = normalizeCollegeCode(collegeCode);
  if (!normalizedCollegeCode || !CODE_REGEX.test(normalizedCollegeCode)) {
    return null;
  }

  return College.findOne({
    code: normalizedCollegeCode,
    ...(requireActive ? { isActive: true } : {}),
  });
};

const listColleges = async (req, res, next) => {
  try {
    const colleges = await College.find({
      isActive: true,
      $or: [{ verificationStatus: 'approved' }, { verificationStatus: { $exists: false } }],
    })
      .select('name code')
      .sort({ name: 1 })
      .limit(500)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        items: colleges.map((college) => ({
          id: college._id.toString(),
          name: college.name,
          code: college.code,
        })),
        count: colleges.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const {
      email,
      password,
      fullName,
      department,
      employeeCode,
      timezone,
      collegeId,
      collegeCode,
    } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !fullName || !department || (!collegeId && !collegeCode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, password, fullName, department, and collegeId or collegeCode are required',
        },
      });
    }

    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid email format',
        },
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: 'Password must be at least 8 characters long',
        },
      });
    }

    const college = await resolveCollegeFromInput({ collegeId, collegeCode, requireActive: true });

    if (!college) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COLLEGE_NOT_FOUND',
          message: 'Selected college was not found or is inactive',
        },
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      collegeId: college._id,
    });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists for the selected college',
        },
      });
    }

    const user = await User.create({
      collegeId: college._id,
      email: normalizedEmail,
      password,
      fullName: fullName.trim(),
      department: department.trim(),
      employeeCode: employeeCode ? String(employeeCode).trim() : undefined,
      timezone: timezone ? String(timezone).trim() : 'UTC',
    });

    await ensureGlobalAdminRole(user);

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    if (error.code === 11000) {
      const duplicateKey = Object.keys(error.keyPattern || {})[0];

      if (duplicateKey === 'code') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'COLLEGE_CODE_ALREADY_EXISTS',
            message: 'College code already exists. Use a different unique code.',
          },
        });
      }

      if (duplicateKey === 'email') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMAIL_ALREADY_EXISTS',
            message: 'An account with this email already exists for the selected college',
          },
        });
      }

      if (duplicateKey === 'employeeCode') {
        return res.status(409).json({
          success: false,
          error: {
            code: 'EMPLOYEE_CODE_ALREADY_EXISTS',
            message: 'Employee code already exists for the selected college',
          },
        });
      }

      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_FIELD',
          message: 'A unique field value already exists',
        },
      });
    }

    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password, collegeId, collegeCode } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || (!collegeId && !collegeCode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, password, and collegeId or collegeCode are required',
        },
      });
    }

    const college = await resolveCollegeFromInput({ collegeId, collegeCode, requireActive: true });
    if (!college) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid college code, email, or password',
        },
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
      collegeId: college._id,
    }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid college code, email, or password',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_INACTIVE',
          message: 'Account is inactive. Contact administrator.',
        },
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid college code, email, or password',
        },
      });
    }

    await ensureGlobalAdminRole(user);
    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listColleges,
  register,
  login,
};
