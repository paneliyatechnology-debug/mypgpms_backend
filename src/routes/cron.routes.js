/**
 * Cron Job Scheduler & Management Router
 * 
 * Automatically initializes recurring background maintenance tasks upon module loading.
 * Provides a clean mount point under /api/v1/crons for future automated endpoints or webhooks.
 */
import { Router } from 'express';
import cron from 'node-cron';
import cronController from '../controllers/cron.controller.js';
import noticeService from '../services/notice.service.js';

const router = Router();

/**
 * Scheduled Recurring Task: Auto-publish due scheduled notices
 * Runs continuously in background (every 30 seconds) to detect and publish scheduled notices as soon as due.
 */
const runPublishTask = async () => {
  try {
    const result = await noticeService.publishDueScheduledNotices();
    if (result && result.published_count > 0) {
      console.log(`[Cron] Auto-published ${result.published_count} scheduled notice(s): [${result.notice_ids.join(', ')}]`);
    }
    return result;
  } catch (err) {
    console.warn('[Cron] Scheduled notices publication error:', err.message);
    return { published_count: 0, notice_ids: [], error: err.message };
  }
};

// 1. Initial check immediately upon startup / module load
runPublishTask();

// 2. Schedule recurring checks with node-cron every 30 seconds (at :00 and :30)
cron.schedule('*/30 * * * * *', runPublishTask, { timezone: 'Asia/Kolkata' });

// 3. Watchdog fallback interval (every 30 seconds) ensuring continuous background execution
setInterval(runPublishTask, 30000);

/**
 * Scheduled Daily Task: Automated Payment Proof, Receipts & Uploads Cleanup
 * Runs daily at 03:00 AM IST to purge generated receipt PDFs, report exports, and temporary assets.
 */
cron.schedule(
  '0 3 * * *',
  async () => {
    console.log('[Cron] Executing scheduled daily payment receipts and uploads cleanup at 3:00 AM IST...');
    await cronController.cleanPaymentUploads();
  },
  { timezone: 'Asia/Kolkata' }
);

export default router;
