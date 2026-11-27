import { body, param, query } from 'express-validator';

export const ALLOWED_PG_STATUSES = ['active', 'under_review', 'suspended', 'inactive'];
export const ALLOWED_PG_TYPES = ['boys', 'girls', 'coed', 'other'];

export const pgIdParamValidator = [
  param('id')
    .notEmpty()
    .withMessage('PG ID is required')
    .toInt()
    .isInt({ min: 1 })
    .withMessage('PG ID must be a positive integer'),
];

export const listPgsValidator = [
  query('page')
    .optional({ checkFalsy: true })
    .toInt()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional({ checkFalsy: true })
    .toInt()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('type')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_PG_TYPES)
    .withMessage(`Type must be one of: ${ALLOWED_PG_TYPES.join(', ')}`),

  query('status')
    .optional({ checkFalsy: true })
    .trim()
    .toLowerCase()
    .isIn(ALLOWED_PG_STATUSES)
    .withMessage(`Status must be one of: ${ALLOWED_PG_STATUSES.join(', ')}`),

  query('city').optional().trim().isString(),
  query('search').optional().trim().isString(),
  query('owner_id').optional({ checkFalsy: true }).toInt().isInt({ min: 1 }),
];

export const updatePgStatusValidator = [
  ...pgIdParamValidator,
  body('status')
    .trim()
    .notEmpty()
    .withMessage('Status is required')
    .toLowerCase()
    .isIn(ALLOWED_PG_STATUSES)
    .withMessage(`Status must be one of: ${ALLOWED_PG_STATUSES.join(', ')}`),
  body('reason')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
];
