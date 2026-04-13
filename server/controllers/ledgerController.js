const mongoose = require('mongoose');

const LedgerTransaction = require('../models/LedgerTransaction');

const recordAcceptedCoverage = async ({ requestDoc, session }) => {
  const transactionPayload = {
    requestId: requestDoc._id,
    debtorId: requestDoc.requesterId,
    creditorId: requestDoc.covererId,
    units: 1,
    unitType: 'class',
    termId: requestDoc.termId,
    classEvent: {
      date: requestDoc.classEvent.date,
      startTime: requestDoc.classEvent.startTime,
      endTime: requestDoc.classEvent.endTime,
      courseCode: requestDoc.classEvent.courseCode,
    },
    note: requestDoc.reason || undefined,
    createdBySystem: true,
  };

  try {
    const [ledgerTransaction] = await LedgerTransaction.create([transactionPayload], { session });
    return ledgerTransaction;
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateError = new Error('Ledger entry already exists for this request');
      duplicateError.statusCode = 409;
      duplicateError.code = 'LEDGER_ENTRY_EXISTS';
      throw duplicateError;
    }

    throw error;
  }
};

const getPairwiseBalance = async (req, res, next) => {
  try {
    const me = req.user.id;
    const { withUserId, termId } = req.query;

    if (!withUserId || !mongoose.Types.ObjectId.isValid(withUserId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'withUserId query parameter is required and must be a valid ObjectId',
        },
      });
    }

    const match = {
      $or: [
        { debtorId: new mongoose.Types.ObjectId(me), creditorId: new mongoose.Types.ObjectId(withUserId) },
        { debtorId: new mongoose.Types.ObjectId(withUserId), creditorId: new mongoose.Types.ObjectId(me) },
      ],
      ...(termId ? { termId: String(termId).trim() } : {}),
    };

    const [result] = await LedgerTransaction.aggregate([
      { $match: match },
      {
        $project: {
          signedUnits: {
            $cond: [{ $eq: ['$debtorId', new mongoose.Types.ObjectId(me)] }, '$units', { $multiply: ['$units', -1] }],
          },
        },
      },
      {
        $group: {
          _id: null,
          netUnits: { $sum: '$signedUnits' },
        },
      },
    ]);

    const netUnits = result?.netUnits || 0;

    return res.status(200).json({
      success: true,
      data: {
        me,
        withUserId,
        termId: termId ? String(termId).trim() : null,
        netUnits: Math.abs(netUnits),
        direction: netUnits > 0 ? 'you_owe_them' : netUnits < 0 ? 'they_owe_you' : 'settled',
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMyLedgerSummary = async (req, res, next) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id);
    const { termId } = req.query;

    const matchStage = {
      $match: {
        $or: [{ debtorId: me }, { creditorId: me }],
        ...(termId ? { termId: String(termId).trim() } : {}),
      },
    };

    const [totalsResult, pairwiseResult] = await Promise.all([
      LedgerTransaction.aggregate([
        matchStage,
        {
          $group: {
            _id: null,
            youOwe: {
              $sum: {
                $cond: [{ $eq: ['$debtorId', me] }, '$units', 0],
              },
            },
            owedToYou: {
              $sum: {
                $cond: [{ $eq: ['$creditorId', me] }, '$units', 0],
              },
            },
          },
        },
      ]),
      LedgerTransaction.aggregate([
        matchStage,
        {
          $project: {
            withUserId: {
              $cond: [{ $eq: ['$debtorId', me] }, '$creditorId', '$debtorId'],
            },
            signedUnits: {
              $cond: [{ $eq: ['$debtorId', me] }, '$units', { $multiply: ['$units', -1] }],
            },
          },
        },
        {
          $group: {
            _id: '$withUserId',
            netSignedUnits: { $sum: '$signedUnits' },
          },
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'withUser',
          },
        },
        {
          $unwind: {
            path: '$withUser',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 0,
            withUser: {
              id: '$_id',
              fullName: '$withUser.fullName',
            },
            netUnits: { $abs: '$netSignedUnits' },
            direction: {
              $switch: {
                branches: [
                  { case: { $gt: ['$netSignedUnits', 0] }, then: 'you_owe_them' },
                  { case: { $lt: ['$netSignedUnits', 0] }, then: 'they_owe_you' },
                ],
                default: 'settled',
              },
            },
          },
        },
        {
          $sort: {
            netUnits: -1,
          },
        },
      ]),
    ]);

    const totals = totalsResult[0] || { youOwe: 0, owedToYou: 0 };

    return res.status(200).json({
      success: true,
      data: {
        termId: termId ? String(termId).trim() : null,
        totals: {
          youOwe: totals.youOwe || 0,
          owedToYou: totals.owedToYou || 0,
          net: (totals.owedToYou || 0) - (totals.youOwe || 0),
        },
        pairwise: pairwiseResult.map((item) => ({
          withUser: {
            id: item.withUser?.id ? item.withUser.id.toString() : null,
            fullName: item.withUser?.fullName || 'Unknown Professor',
          },
          netUnits: item.netUnits,
          direction: item.direction,
        })),
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getMyLedgerTransactions = async (req, res, next) => {
  try {
    const me = new mongoose.Types.ObjectId(req.user.id);
    const {
      termId,
      page = 1,
      limit = 20,
      fromDate,
      toDate,
    } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {
      $or: [{ debtorId: me }, { creditorId: me }],
      ...(termId ? { termId: String(termId).trim() } : {}),
    };

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) {
        filter.createdAt.$gte = new Date(fromDate);
      }
      if (toDate) {
        filter.createdAt.$lte = new Date(toDate);
      }
    }

    const [items, total] = await Promise.all([
      LedgerTransaction.find(filter)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .lean(),
      LedgerTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item._id.toString(),
          requestId: item.requestId?.toString?.() || item.requestId,
          debtorId: item.debtorId?.toString?.() || item.debtorId,
          creditorId: item.creditorId?.toString?.() || item.creditorId,
          units: item.units,
          unitType: item.unitType,
          termId: item.termId,
          classEvent: item.classEvent,
          createdAt: item.createdAt,
          direction: String(item.debtorId) === String(me) ? 'you_owe_them' : 'they_owe_you',
        })),
        pagination: {
          page: parsedPage,
          limit: parsedLimit,
          total,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  recordAcceptedCoverage,
  getPairwiseBalance,
  getMyLedgerSummary,
  getMyLedgerTransactions,
};
