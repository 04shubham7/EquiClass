#!/usr/bin/env node
require('dotenv').config();

const mongoose = require('mongoose');

const College = require('../models/College');
const User = require('../models/User');
const Request = require('../models/Request');
const Timetable = require('../models/Timetable');
const Routine = require('../models/Routine');
const LedgerTransaction = require('../models/LedgerTransaction');

const DEFAULT_COLLEGE_NAME = process.env.DEFAULT_COLLEGE_NAME || 'Default Institution';
const DEFAULT_COLLEGE_CODE = process.env.DEFAULT_COLLEGE_CODE || 'DEFAULT-INST';

const parseFlag = (flag) => process.argv.includes(flag);

const removeUsersMode = parseFlag('--remove-users');

const run = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error('MONGO_URI is required');
  }

  await mongoose.connect(mongoUri);

  const college =
    (await College.findOne({ code: DEFAULT_COLLEGE_CODE })) ||
    (await College.create({
      name: DEFAULT_COLLEGE_NAME,
      code: DEFAULT_COLLEGE_CODE,
      isActive: true,
    }));

  console.log(`[migration] Default college ready: ${college.name} (${college.code})`);

  if (removeUsersMode) {
    const [usersResult, requestResult, timetableResult, routineResult, ledgerResult] = await Promise.all([
      User.deleteMany({}),
      Request.deleteMany({}),
      Timetable.deleteMany({}),
      Routine.deleteMany({}),
      LedgerTransaction.deleteMany({}),
    ]);

    console.log(`[migration] Removed users: ${usersResult.deletedCount}`);
    console.log(`[migration] Removed requests: ${requestResult.deletedCount}`);
    console.log(`[migration] Removed timetables: ${timetableResult.deletedCount}`);
    console.log(`[migration] Removed routines: ${routineResult.deletedCount}`);
    console.log(`[migration] Removed ledger transactions: ${ledgerResult.deletedCount}`);
  } else {
    const backfillResult = await User.updateMany(
      {
        $or: [{ collegeId: { $exists: false } }, { collegeId: null }],
      },
      {
        $set: { collegeId: college._id },
      }
    );

    console.log(`[migration] Backfilled users without collegeId: ${backfillResult.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('[migration] Completed successfully');
};

run().catch(async (error) => {
  console.error('[migration] Failed:', error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect failures on hard exits.
  }
  process.exit(1);
});
