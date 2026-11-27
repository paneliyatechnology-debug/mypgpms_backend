import pgService from '../services/pg.service.js';
import { success, successAction, AppError } from '../utils/apiResponse.js';
import { HTTP_STATUS, ROLES } from '../constants/index.js';

/**
 * Get aggregated KPI statistics for all PG properties
 * @route GET /api/v1/pgs/stats
 */
export const getPgStats = async (req, res, next) => {
  try {
    const stats = await pgService.getStats();
    return success(res, 'PG statistics retrieved successfully', stats);
  } catch (err) {
    next(err);
  }
};

/**
 * List all PG properties with search, filters, and pagination
 * @route GET /api/v1/pgs
 */
export const getAllPgs = async (req, res, next) => {
  try {
    const isAdmin = req.user.role === ROLES.ADMIN;
    const owner_id = isAdmin
      ? req.user.id
      : req.query.owner_id
      ? Number(req.query.owner_id)
      : null;

    const { city = '', type = '', status = '', search = '', page = 1, limit = 10 } = req.query;

    const result = await pgService.findAll({
      owner_id,
      city,
      type,
      status,
      search,
      page,
      limit,
    });

    return success(res, 'Properties retrieved successfully', result.pgs, HTTP_STATUS.OK, result.pagination);
  } catch (err) {
    next(err);
  }
};

/**
 * Get single PG property by ID
 * @route GET /api/v1/pgs/:id
 */
export const getPgById = async (req, res, next) => {
  try {
    const pg = await pgService.findById(req.params.id);
    if (!pg) {
      throw new AppError('PG property not found', HTTP_STATUS.NOT_FOUND);
    }

    if (req.user.role === ROLES.ADMIN && Number(pg.owner_id) !== Number(req.user.id)) {
      throw new AppError('Access denied to this PG property', HTTP_STATUS.FORBIDDEN);
    }

    return success(res, 'Property details retrieved successfully', pg);
  } catch (err) {
    next(err);
  }
};

/**
 * Update PG operational status (active, under_review, suspended, inactive)
 * @route PATCH /api/v1/pgs/:id/status
 */
export const updatePgStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const updated = await pgService.updateStatus(id, status, reason, req);
    return successAction(res, `Property status updated to ${status}`, updated.id, HTTP_STATUS.OK, updated);
  } catch (err) {
    next(err);
  }
};

export default {
  getPgStats,
  getAllPgs,
  getPgById,
  updatePgStatus,
};
