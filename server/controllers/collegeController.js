const College = require('../models/College');
const { normalizeCollegeName, buildUniqueCollegeCode } = require('../utils/collegeCode');

const mapCollege = (college) => ({
  id: college._id.toString(),
  name: college.name,
  code: college.code,
  isActive: college.isActive,
  createdAt: college.createdAt,
  updatedAt: college.updatedAt,
});

const registerCollege = async (req, res, next) => {
  try {
    const name = normalizeCollegeName(req.body?.name);

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name is required',
        },
      });
    }

    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const existing = await College.findOne({
      name: { $regex: `^${escapedName}$`, $options: 'i' },
    });

    if (existing) {
      return res.status(200).json({
        success: true,
        data: {
          college: mapCollege(existing),
          created: false,
        },
      });
    }

    const code = await buildUniqueCollegeCode({
      name,
      existsCode: async (candidate) => Boolean(await College.findOne({ code: candidate }).select('_id')),
    });

    const college = await College.create({
      name,
      code,
    });

    return res.status(201).json({
      success: true,
      data: {
        college: mapCollege(college),
        created: true,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'COLLEGE_ALREADY_EXISTS',
          message: 'A college with this code already exists',
        },
      });
    }

    return next(error);
  }
};

module.exports = {
  registerCollege,
};
