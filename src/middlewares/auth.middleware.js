import { HTTP_STATUS, ROLES } from '../constants/index.js';
import { AppError } from '../utils/apiResponse.js';
import { verifyAccessToken } from '../utils/jwt.js';
import userService from '../services/user.service.js';
import db from '../config/db.js';

/**
 * Authenticate JWT middleware.
 * Verifies token from Authorization header (Bearer) or HTTP-only cookies (access_token).
 * Smoothly falls back to cookies if the Authorization header is empty or an unresolved Postman variable.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const auth_header = req.headers.authorization;

    // 1. Extract from Authorization Bearer header
    if (auth_header && auth_header.startsWith('Bearer ')) {
      const candidate = auth_header.slice(7).trim();
      // Validate candidate is not empty and not an unparsed template like {{accessToken}}
      if (candidate && candidate !== 'undefined' && candidate !== 'null' && !candidate.startsWith('{{')) {
        token = candidate;
      }
    }

    // 2. Fall back to HTTP-only cookie if Authorization header is missing or empty
    if (!token && req.cookies && req.cookies.access_token) {
      token = req.cookies.access_token;
    }

    if (!token) {
      throw new AppError('Access token is missing or invalid. Please login', HTTP_STATUS.UNAUTHORIZED);
    }

    // 3. Verify access token with cookie fallback if header candidate fails
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (req.cookies && req.cookies.access_token && req.cookies.access_token !== token) {
        try {
          decoded = verifyAccessToken(req.cookies.access_token);
          token = req.cookies.access_token;
        } catch (cookieErr) {
          if (err.name === 'TokenExpiredError') {
            throw new AppError('Access token has expired. Please refresh your session or login again', HTTP_STATUS.UNAUTHORIZED);
          }
          throw new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED);
        }
      } else {
        if (err.name === 'TokenExpiredError') {
          throw new AppError('Access token has expired. Please refresh your session or login again', HTTP_STATUS.UNAUTHORIZED);
        }
        throw new AppError('Invalid access token', HTTP_STATUS.UNAUTHORIZED);
      }
    }

    const user = await userService.findById(decoded.id, decoded.pg_id);

    if (!user) {
      throw new AppError('User belonging to this token no longer exists', HTTP_STATUS.UNAUTHORIZED);
    }

    if (user.status !== 'active') {
      throw new AppError('User account is deactivated', HTTP_STATUS.FORBIDDEN);
    }

    let resolved_pg_id = decoded.pg_id || user.pg?.id || user.room_info?.pg_id || user.pg_id || null;
    if (!resolved_pg_id) {
      if (user.role === ROLES.ADMIN) {
        const pg = await db('pgs').where({ owner_id: user.id }).whereNull('deleted_at').orderBy('id', 'asc').first();
        if (pg) resolved_pg_id = pg.id;
      } else if (user.role === ROLES.RESIDENT) {
        const stay = await db('resident_pg_stays').where({ resident_id: user.id, status: 'active' }).whereNull('deleted_at').orderBy('id', 'desc').first();
        if (stay) resolved_pg_id = stay.pg_id;
      }
    }
    if (user.role === ROLES.RESIDENT) {
      user.pg_id = resolved_pg_id;
    }

    let resolved_branch_id = decoded.branch_id || user.room_info?.branch_id || null;
    if (!resolved_branch_id && resolved_pg_id) {
      if (user.role === ROLES.RESIDENT) {
        const stay = await db('resident_pg_stays').where({ resident_id: user.id, status: 'active' }).whereNull('deleted_at').orderBy('id', 'desc').first();
        if (stay?.branch_id) resolved_branch_id = stay.branch_id;
      } else if (user.role === ROLES.ADMIN) {
        const branch = await db('branches').where({ pg_id: resolved_pg_id }).whereNull('deleted_at').orderBy('id', 'asc').first();
        if (branch) resolved_branch_id = branch.id;
      }
    }

    req.user = user;
    req.pg_id = resolved_pg_id;
    req.branch_id = resolved_branch_id;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Role-based authorization middleware.
 * Supports both top-level user roles (super_admin, admin, resident, staff)
 * and operational staff roles (e.g., BRANCH_MANAGER).
 * @param {...string} roles - Permitted roles (e.g. 'admin', 'super_admin', 'resident', 'staff', 'BRANCH_MANAGER')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', HTTP_STATUS.UNAUTHORIZED));
    }

    const userRole = req.user.role;
    const staffRole = req.user.staff_role;
    const isAllowed = roles.includes(userRole) || (Boolean(staffRole) && roles.includes(staffRole));

    if (!isAllowed) {
      return next(
        new AppError(
          'Permission denied. You do not have permission to perform this action.',
          HTTP_STATUS.FORBIDDEN
        )
      );
    }

    next();
  };
};

/**
 * PG Active Status Guard Middleware.
 *
 * Ensures the PG associated with the authenticated user is in `active` status
 * before allowing access to the route.
 *
 * Rules:
 *  - `super_admin`: always passes (platform-level access).
 *  - `resident`: always passes (they should still be able to view their own data
 *     even if the PG is under review / being suspended).
 *  - `admin`, `staff`, `BRANCH_MANAGER` and all staff roles: blocked if the PG
 *     status is anything other than `active`.
 *
 * Must be placed AFTER `authenticate` (needs `req.user` and `req.pg_id`).
 *
 * @example
 * router.use(authenticate, requireActivePg);
 * router.use(authenticate, requireActivePg, authorize(ROLES.ADMIN));
 */
export const requireActivePg = async (req, res, next) => {
  try {
    // super_admin always bypasses this check
    if (req.user?.role === ROLES.SUPER_ADMIN) {
      return next();
    }

    // residents can still access their own data regardless of PG status
    if (req.user?.role === ROLES.RESIDENT) {
      return next();
    }

    const pg_id = req.pg_id;

    if (!pg_id) {
      throw new AppError(
        'No PG facility is associated with your account. Please contact your administrator.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    const pg = await db('pgs').where({ id: pg_id }).whereNull('deleted_at').first();

    if (!pg) {
      throw new AppError(
        'The PG facility linked to your account could not be found.',
        HTTP_STATUS.UNAUTHORIZED
      );
    }

    if (pg.status !== 'active') {
      const statusMessages = {
        under_review:
          'Your PG facility is currently under review by the platform administrator. Access is temporarily restricted.',
        suspended:
          'Your PG facility has been suspended. Please contact MYPGPMS support to resolve this.',
        inactive:
          'Your PG facility is marked as inactive. Please contact MYPGPMS support to reactivate it.',
      };
      const message =
        statusMessages[pg.status] ||
        'Your PG facility is not active. Access is restricted.';

      throw new AppError(message, HTTP_STATUS.UNAUTHORIZED);
    }

    // Attach resolved PG to request for downstream use
    req.pg = pg;
    next();
  } catch (err) {
    next(err);
  }
};

export default {
  authenticate,
  authorize,
  requireActivePg,
};
