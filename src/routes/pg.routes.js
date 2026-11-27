import { Router } from 'express';
import pgController from '../controllers/pg.controller.js';
import {
  pgIdParamValidator,
  listPgsValidator,
  updatePgStatusValidator,
} from '../validators/pg.validator.js';
import validate from '../middlewares/validate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { ROLES } from '../constants/index.js';

const router = Router();

router.use(authenticate);

/**
 * @route   GET /api/v1/pgs/stats
 * @desc    Get aggregated KPI statistics across all PG properties
 * @access  Private (Super Admin)
 */
router.get(
  '/stats',
  authorize(ROLES.SUPER_ADMIN),
  pgController.getPgStats
);

/**
 * @route   GET /api/v1/pgs
 * @desc    List all PG properties with pagination and filters
 * @access  Private (Super Admin / Admin)
 */
router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(listPgsValidator),
  pgController.getAllPgs
);

/**
 * @route   GET /api/v1/pgs/:id
 * @desc    Get detailed PG property profile by ID
 * @access  Private (Super Admin / Admin)
 */
router.get(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  validate(pgIdParamValidator),
  pgController.getPgById
);

/**
 * @route   PATCH /api/v1/pgs/:id/status
 * @desc    Update operational status of a PG property
 * @access  Private (Super Admin)
 */
router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN),
  validate(updatePgStatusValidator),
  pgController.updatePgStatus
);

export default router;
