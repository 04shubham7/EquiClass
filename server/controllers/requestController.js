const mongoose = require('mongoose');

const Request = require('../models/Request');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const { recordAcceptedCoverage } = require('./ledgerController');

const BUSY_SLOT_TYPES = new Set(['teaching', 'busy', 'office']);
const EXCEPTION_FREE_TYPES = new Set(['override_free', 'cancelled_class']);
const EXCEPTION_BUSY_TYPES = new Set(['override_busy']);

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const toMinutes = (timeValue) => {
  const [hour, minute] = timeValue.split(':').map(Number);
  return hour * 60 + minute;
};

const hasOverlap = (startA, endA, startB, endB) => startA < endB && startB < endA;

const validateClassEvent = (classEvent) => {
  if (!classEvent) {
    return 'classEvent is required';
  }

  const { date, dayOfWeek, startTime, endTime } = classEvent;

  if (!dateRegex.test(date || '')) {
    return 'classEvent.date must use YYYY-MM-DD format';
  }

  if (!timeRegex.test(startTime || '') || !timeRegex.test(endTime || '')) {
    return 'classEvent.startTime and classEvent.endTime must use HH:mm format';
  }

  if (toMinutes(startTime) >= toMinutes(endTime)) {
    return 'classEvent.startTime must be earlier than classEvent.endTime';
  }

  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
    return 'classEvent.dayOfWeek must be an integer from 0 to 6';
  }

  return null;
};

const isClassEventInFuture = (classEvent) => {
  const dt = new Date(`${classEvent.date}T${classEvent.startTime}:00Z`);
  return !Number.isNaN(dt.getTime()) && dt.getTime() > Date.now();
};

const evaluateProfessorAvailability = async ({ covererId, termId, classEvent }) => {
  const timetable = await Timetable.findOne({
    userId: covererId,
    termId: String(termId).trim(),
  });

  if (!timetable) {
    return {
      isFree: false,
      conflicts: ['No timetable found for selected professor and term'],
    };
  }

  const targetStart = toMinutes(classEvent.startTime);
  const targetEnd = toMinutes(classEvent.endTime);

  const exceptionOverlaps = timetable.exceptions.filter((exception) => {
    if (exception.date !== classEvent.date) {
      return false;
    }

    return hasOverlap(
      targetStart,
      targetEnd,
      toMinutes(exception.startTime),
      toMinutes(exception.endTime)
    );
  });

  const busyExceptionConflicts = exceptionOverlaps
    .filter((item) => EXCEPTION_BUSY_TYPES.has(item.type))
    .map((item) => `Exception busy slot ${item.startTime}-${item.endTime}`);

  if (busyExceptionConflicts.length > 0) {
    return {
      isFree: false,
      conflicts: busyExceptionConflicts,
    };
  }

  if (exceptionOverlaps.some((item) => EXCEPTION_FREE_TYPES.has(item.type))) {
    return {
      isFree: true,
      conflicts: [],
    };
  }

  const busyWeeklyConflicts = timetable.weeklySlots
    .filter((slot) => slot.dayOfWeek === classEvent.dayOfWeek && BUSY_SLOT_TYPES.has(slot.type))
    .filter((slot) =>
      hasOverlap(targetStart, targetEnd, toMinutes(slot.startTime), toMinutes(slot.endTime))
    )
    .map((slot) => `${slot.type} slot ${slot.startTime}-${slot.endTime}${slot.courseCode ? ` (${slot.courseCode})` : ''}`);

  if (busyWeeklyConflicts.length > 0) {
    return {
      isFree: false,
      conflicts: busyWeeklyConflicts,
    };
  }

  return {
    isFree: true,
    conflicts: [],
  };
};

const createRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const requesterCollegeId = req.user.collegeId;
    const { covererId, termId, classEvent, reason, requesterComment, expiresAt } = req.body;

    if (!covererId || !termId || !classEvent) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'covererId, termId, and classEvent are required',
        },
      });
    }

    if (!requesterCollegeId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'COLLEGE_CONTEXT_REQUIRED',
          message: 'Requester must belong to a college to create requests',
        },
      });
    }

    if (!mongoose.Types.ObjectId.isValid(covererId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_COVERER_ID',
          message: 'covererId must be a valid ObjectId',
        },
      });
    }

    if (String(covererId) === String(requesterId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Requester and coverer cannot be the same professor',
        },
      });
    }

    const classEventError = validateClassEvent(classEvent);
    if (classEventError) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: classEventError,
        },
      });
    }

    if (!isClassEventInFuture(classEvent)) {
      return res.status(422).json({
        success: false,
        error: {
          code: 'INVALID_CLASS_EVENT',
          message: 'classEvent must be in the future',
        },
      });
    }

    const coverer = await User.findOne({
      _id: covererId,
      isActive: true,
      collegeId: requesterCollegeId,
    });
    if (!coverer || !coverer.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COVERER_NOT_FOUND',
          message: 'Selected coverer does not exist in your college or is inactive',
        },
      });
    }

    const availability = await evaluateProfessorAvailability({
      covererId,
      termId,
      classEvent,
    });

    if (!availability.isFree) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'COVERER_NOT_AVAILABLE',
          message: 'Cannot create request because selected professor is busy',
          details: availability.conflicts,
        },
      });
    }

    const requestDoc = await Request.create({
      collegeId: requesterCollegeId,
      requesterId,
      covererId,
      termId: String(termId).trim(),
      classEvent: {
        date: classEvent.date,
        dayOfWeek: classEvent.dayOfWeek,
        startTime: classEvent.startTime,
        endTime: classEvent.endTime,
        courseCode: classEvent.courseCode,
        room: classEvent.room,
        department: classEvent.department,
      },
      status: 'pending',
      reason: reason ? String(reason).trim() : undefined,
      requesterComment: requesterComment ? String(requesterComment).trim() : undefined,
      availabilitySnapshot: {
        checkedAt: new Date(),
        isCovererFree: true,
        conflictDetails: [],
      },
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
    });

    return res.status(201).json({
      success: true,
      data: {
        request: requestDoc,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const acceptRequest = async (req, res, next) => {
  const session = await mongoose.startSession();

  try {
    const covererId = req.user.id;
    const covererCollegeId = req.user.collegeId;
    const requestId = req.params.id;
    const covererComment = req.body?.covererComment;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Request id must be a valid ObjectId',
        },
      });
    }

    let acceptedRequest;
    let ledgerTransaction;

    await session.withTransaction(async () => {
      const requestDoc = await Request.findOne({
        _id: requestId,
        covererId,
        collegeId: covererCollegeId,
      }).session(session);

      if (!requestDoc) {
        const error = new Error('Request not found for this coverer');
        error.statusCode = 404;
        error.code = 'REQUEST_NOT_FOUND';
        throw error;
      }

      if (requestDoc.status !== 'pending') {
        const error = new Error('Only pending requests can be accepted');
        error.statusCode = 409;
        error.code = 'REQUEST_NOT_PENDING';
        throw error;
      }

      const availability = await evaluateProfessorAvailability({
        covererId,
        termId: requestDoc.termId,
        classEvent: requestDoc.classEvent,
      });

      if (!availability.isFree) {
        const error = new Error('Coverer is no longer available for this class slot');
        error.statusCode = 409;
        error.code = 'REQUEST_NOT_ACCEPTABLE';
        error.details = availability.conflicts;
        throw error;
      }

      requestDoc.status = 'accepted';
      requestDoc.respondedAt = new Date();
      if (covererComment) {
        requestDoc.covererComment = String(covererComment).trim();
      }

      await requestDoc.save({ session });

      ledgerTransaction = await recordAcceptedCoverage({
        requestDoc,
        session,
      });

      acceptedRequest = requestDoc;
    });

    return res.status(200).json({
      success: true,
      data: {
        request: acceptedRequest,
        ledgerTransaction,
      },
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        error: {
          code: error.code || 'REQUEST_ERROR',
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      });
    }

    return next(error);
  } finally {
    session.endSession();
  }
};

const getIncomingRequests = async (req, res, next) => {
  try {
    const covererId = req.user.id;
    const collegeId = req.user.collegeId;
    const { status, termId, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {
      covererId,
      collegeId,
      ...(status ? { status: String(status).trim() } : {}),
      ...(termId ? { termId: String(termId).trim() } : {}),
    };

    const [items, total] = await Promise.all([
      Request.find(filter)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('requesterId', 'fullName email department')
        .lean(),
      Request.countDocuments(filter),
    ]);

    const normalized = items.map((item) => ({
      id: item._id.toString(),
      requester: item.requesterId
        ? {
            id: item.requesterId._id.toString(),
            fullName: item.requesterId.fullName,
            email: item.requesterId.email,
            department: item.requesterId.department,
          }
        : null,
      status: item.status,
      termId: item.termId,
      classEvent: item.classEvent,
      reason: item.reason,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        items: normalized,
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

const getOutgoingRequests = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const collegeId = req.user.collegeId;
    const { status, termId, page = 1, limit = 20 } = req.query;

    const parsedPage = Math.max(Number(page) || 1, 1);
    const parsedLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const filter = {
      requesterId,
      collegeId,
      ...(status ? { status: String(status).trim() } : {}),
      ...(termId ? { termId: String(termId).trim() } : {}),
    };

    const [items, total] = await Promise.all([
      Request.find(filter)
        .sort({ createdAt: -1 })
        .skip((parsedPage - 1) * parsedLimit)
        .limit(parsedLimit)
        .populate('covererId', 'fullName email department')
        .lean(),
      Request.countDocuments(filter),
    ]);

    const normalized = items.map((item) => ({
      id: item._id.toString(),
      coverer: item.covererId
        ? {
            id: item.covererId._id.toString(),
            fullName: item.covererId.fullName,
            email: item.covererId.email,
            department: item.covererId.department,
          }
        : null,
      status: item.status,
      termId: item.termId,
      classEvent: item.classEvent,
      reason: item.reason,
      createdAt: item.createdAt,
    }));

    return res.status(200).json({
      success: true,
      data: {
        items: normalized,
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

const declineRequest = async (req, res, next) => {
  try {
    const covererId = req.user.id;
    const covererCollegeId = req.user.collegeId;
    const requestId = req.params.id;
    const covererComment = req.body?.covererComment;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Request id must be a valid ObjectId',
        },
      });
    }

    const requestDoc = await Request.findOne({
      _id: requestId,
      covererId,
      collegeId: covererCollegeId,
    });

    if (!requestDoc) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Request not found for this coverer',
        },
      });
    }

    if (requestDoc.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_PENDING',
          message: 'Only pending requests can be declined',
        },
      });
    }

    requestDoc.status = 'declined';
    requestDoc.respondedAt = new Date();
    if (covererComment) {
      requestDoc.covererComment = String(covererComment).trim();
    }

    await requestDoc.save();

    return res.status(200).json({
      success: true,
      data: {
        request: requestDoc,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const cancelRequest = async (req, res, next) => {
  try {
    const requesterId = req.user.id;
    const requesterCollegeId = req.user.collegeId;
    const requestId = req.params.id;
    const requesterComment = req.body?.requesterComment;

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST_ID',
          message: 'Request id must be a valid ObjectId',
        },
      });
    }

    const requestDoc = await Request.findOne({
      _id: requestId,
      requesterId,
      collegeId: requesterCollegeId,
    });

    if (!requestDoc) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Request not found for this requester',
        },
      });
    }

    if (requestDoc.status !== 'pending') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'REQUEST_NOT_PENDING',
          message: 'Only pending requests can be cancelled',
        },
      });
    }

    requestDoc.status = 'cancelled';
    if (requesterComment) {
      requestDoc.requesterComment = String(requesterComment).trim();
    }

    await requestDoc.save();

    return res.status(200).json({
      success: true,
      data: {
        request: requestDoc,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createRequest,
  acceptRequest,
  getIncomingRequests,
  getOutgoingRequests,
  declineRequest,
  cancelRequest,
};
