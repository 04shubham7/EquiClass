const mongoose = require('mongoose');

const College = require('../models/College');
const User = require('../models/User');
const AdminAuditLog = require('../models/AdminAuditLog');

const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
};

const mapCollege = (college) => ({
  id: college._id.toString(),
  name: college.name,
  code: college.code,
  isActive: college.isActive,
  verificationStatus: college.verificationStatus || 'approved',
  verificationNote: college.verificationNote || '',
  verifiedBy: college.verifiedBy
    ? {
        id: college.verifiedBy._id?.toString?.() || college.verifiedBy.toString(),
        fullName: college.verifiedBy.fullName,
        email: college.verifiedBy.email,
      }
    : null,
  verifiedAt: college.verifiedAt,
  createdAt: college.createdAt,
  updatedAt: college.updatedAt,
});

const mapAuditLog = (log) => ({
  id: log._id.toString(),
  action: log.action,
  actor: {
    id: log.actorId?._id?.toString?.() || log.actorId?.toString?.() || '',
    fullName: log.actorId?.fullName || log.actorName,
    email: log.actorId?.email || log.actorEmail,
  },
  targetType: log.targetType,
  targetId: log.targetId?.toString?.() || '',
  targetLabel: log.targetLabel,
  details: log.details || {},
  createdAt: log.createdAt,
});

const createAdminAuditLog = async ({ req, action, college, details = {} }) => {
  await AdminAuditLog.create({
    actorId: req.user.id,
    actorName: req.user.fullName || req.user.email || 'Global Admin',
    actorEmail: req.user.email,
    action,
    targetType: 'college',
    targetId: college._id,
    targetLabel: `${college.name} (${college.code})`,
    details,
  });
};

const getAdminOverview = async (req, res, next) => {
  try {
    const [pendingColleges, approvedColleges, rejectedColleges, totalUsers, globalAdmins] = await Promise.all([
      College.countDocuments({ verificationStatus: 'pending' }),
      College.countDocuments({
        $or: [{ verificationStatus: 'approved' }, { verificationStatus: { $exists: false } }],
      }),
      College.countDocuments({ verificationStatus: 'rejected' }),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: true, roles: 'global_admin' }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        metrics: {
          pendingColleges,
          approvedColleges,
          rejectedColleges,
          totalUsers,
          globalAdmins,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listCollegesForAdmin = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const status = String(req.query.status || 'all').trim().toLowerCase();
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);

    const filter = {};

    if (status === 'approved') {
      filter.$or = [{ verificationStatus: 'approved' }, { verificationStatus: { $exists: false } }];
    } else if (['pending', 'rejected'].includes(status)) {
      filter.verificationStatus = status;
    }

    if (search) {
      const searchFilter = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
      ];

      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: searchFilter }];
        delete filter.$or;
      } else {
        filter.$or = searchFilter;
      }
    }

    const [items, total] = await Promise.all([
      College.find(filter)
        .populate({ path: 'verifiedBy', select: 'fullName email' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      College.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map(mapCollege),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyCollege = async (req, res, next) => {
  try {
    const collegeId = req.params.id;
    const action = String(req.body?.action || '').trim().toLowerCase();
    const note = String(req.body?.note || '').trim();

    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid college id',
        },
      });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'action must be either approve or reject',
        },
      });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COLLEGE_NOT_FOUND',
          message: 'College not found',
        },
      });
    }

    college.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    college.verificationNote = note;
    college.verifiedBy = req.user.id;
    college.verifiedAt = new Date();

    if (action === 'reject') {
      college.isActive = false;
    }

    await college.save();
    await createAdminAuditLog({
      req,
      action: action === 'approve' ? 'college_approved' : 'college_rejected',
      college,
      details: {
        note,
      },
    });
    await college.populate({ path: 'verifiedBy', select: 'fullName email' });

    return res.status(200).json({
      success: true,
      data: {
        college: mapCollege(college),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const setCollegeActiveState = async (req, res, next) => {
  try {
    const collegeId = req.params.id;
    const isActive = Boolean(req.body?.isActive);

    if (!mongoose.Types.ObjectId.isValid(collegeId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid college id',
        },
      });
    }

    const college = await College.findById(collegeId);
    if (!college) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COLLEGE_NOT_FOUND',
          message: 'College not found',
        },
      });
    }

    college.isActive = isActive;
    await college.save();

    await createAdminAuditLog({
      req,
      action: isActive ? 'college_activated' : 'college_disabled',
      college,
      details: {
        verificationStatus: college.verificationStatus || 'approved',
      },
    });

    return res.status(200).json({
      success: true,
      data: {
        college: mapCollege(college),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listAdminAuditLogs = async (req, res, next) => {
  try {
    const action = String(req.query.action || 'all').trim().toLowerCase();
    const search = String(req.query.search || '').trim();
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);

    const filter = {};

    if (
      ['college_approved', 'college_rejected', 'college_activated', 'college_disabled'].includes(action)
    ) {
      filter.action = action;
    }

    if (search) {
      filter.$or = [
        { actorName: { $regex: search, $options: 'i' } },
        { actorEmail: { $regex: search, $options: 'i' } },
        { targetLabel: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      AdminAuditLog.find(filter)
        .populate({ path: 'actorId', select: 'fullName email' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AdminAuditLog.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map(mapAuditLog),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const listUsersForAdmin = async (req, res, next) => {
  try {
    const search = String(req.query.search || '').trim();
    const collegeId = String(req.query.collegeId || '').trim();
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);

    const filter = {};

    if (collegeId) {
      if (!mongoose.Types.ObjectId.isValid(collegeId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid college id',
          },
        });
      }
      filter.collegeId = collegeId;
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .populate({ path: 'collegeId', select: 'name code verificationStatus isActive' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((user) => ({
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          department: user.department,
          roles: user.roles || [],
          isActive: user.isActive,
          lastLoginAt: user.lastLoginAt || null,
          college: user.collegeId
            ? {
                id: user.collegeId._id.toString(),
                name: user.collegeId.name,
                code: user.collegeId.code,
                verificationStatus: user.collegeId.verificationStatus || 'approved',
                isActive: user.collegeId.isActive,
              }
            : null,
          createdAt: user.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(Math.ceil(total / limit), 1),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminOverview,
  listCollegesForAdmin,
  verifyCollege,
  setCollegeActiveState,
  listUsersForAdmin,
  listAdminAuditLogs,
};
