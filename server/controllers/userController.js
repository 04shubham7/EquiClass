const User = require('../models/User');

const listUsers = async (req, res, next) => {
  try {
    const me = req.user.id;
    const collegeId = req.user.collegeId;
    const { search } = req.query;

    const filter = {
      isActive: true,
      collegeId,
      _id: { $ne: me },
    };

    if (search && String(search).trim()) {
      const query = String(search).trim();
      filter.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { employeeCode: { $regex: query, $options: 'i' } },
      ];
    }

    const users = await User.find(filter)
      .select('fullName email department employeeCode')
      .sort({ fullName: 1 })
      .limit(100)
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        items: users.map((user) => ({
          id: user._id.toString(),
          fullName: user.fullName,
          email: user.email,
          department: user.department,
          employeeCode: user.employeeCode || '',
        })),
        count: users.length,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listUsers,
};
