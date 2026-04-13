const jwt = require('jsonwebtoken');
const validator = require('validator');

const User = require('../models/User');

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

const register = async (req, res, next) => {
  try {
    const { email, password, fullName, department, employeeCode, timezone } = req.body;

    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || !fullName || !department) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email, password, fullName, and department are required',
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

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email already exists',
        },
      });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      fullName: fullName.trim(),
      department: department.trim(),
      employeeCode: employeeCode ? String(employeeCode).trim() : undefined,
      timezone: timezone ? String(timezone).trim() : 'UTC',
    });

    return sendAuthResponse(res, 201, user);
  } catch (error) {
    if (error.code === 11000) {
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
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'email and password are required',
        },
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password',
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
          message: 'Invalid email or password',
        },
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    return sendAuthResponse(res, 200, user);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  login,
};
