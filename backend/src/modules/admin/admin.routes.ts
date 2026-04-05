import { Router, Request, Response } from 'express';
import { getDatabase } from '../../config/database';
import { isDatabaseConnected, getSnapshotSize } from '../../services/polling.service';
import { getWhatsAppStatus, restartWhatsApp } from '../../services/whatsapp.service';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../middleware/error-handler';
import { UserModel } from '../../models/user.model';
import { StatsService } from '../../services/stats.service';

const router = Router();

/**
 * GET /api/admin/health — System health status per ADMIN-DASHBOARD.md
 */
router.get('/health', authenticate, authorize('admin'), asyncHandler((req: Request, res: Response) => {
  const db = getDatabase();

  // DB size
  const dbSizeResult = db.prepare(
    "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()"
  ).get() as { size: number } | undefined;

  // Count active sessions
  const sessionsCount = db.prepare(
    "SELECT COUNT(*) as count FROM sessions WHERE expires_at > datetime('now')"
  ).get() as { count: number };

  res.json({
    success: true,
    data: {
      database: {
        access: { status: isDatabaseConnected() ? 'connected' : 'disconnected' },
        sqlite: { status: 'connected' },
      },
      polling: {
        devicesTracked: getSnapshotSize(),
        dbConnected: isDatabaseConnected(),
      },
      activeSessions: sessionsCount.count,
      sqliteSize: dbSizeResult ? `${(dbSizeResult.size / 1024 / 1024).toFixed(1)} MB` : 'unknown',
      uptime: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m`,
      memory: {
        rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)} MB`,
        heap: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
      },
      timestamp: new Date().toISOString(),
    },
  });
}));

/**
 * GET /api/admin/stats — Dashboard header stats
 */
router.get('/stats', authenticate, authorize('admin'), asyncHandler((_req: Request, res: Response) => {
  const stats = StatsService.getDashboardMetrics();
  res.json({
    success: true,
    data: stats,
  });
}));

/**
 * GET /api/admin/events — Recent device events
 */
router.get('/events', authenticate, authorize('admin'), asyncHandler((req: Request, res: Response) => {
  const db = getDatabase();
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  const events = db.prepare(
    `SELECT * FROM device_events ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as Record<string, unknown>[];

  res.json({ success: true, data: events });
}));

/**
 * GET /api/admin/logs — System logs
 */
router.get('/logs', authenticate, authorize('admin'), asyncHandler((req: Request, res: Response) => {
  const db = getDatabase();
  const limit = Math.min(Number(req.query.limit) || 100, 500);

  const logs = db.prepare(
    `SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?`
  ).all(limit) as Record<string, unknown>[];

  res.json({ success: true, data: logs });
}));

/**
 * GET /api/admin/conversations — All chat conversations for admin
 */
router.get('/conversations', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler((_req: Request, res: Response) => {
  const db = getDatabase();

  const conversations = db.prepare(
    `SELECT
       conversation_id,
       device_code,
       MAX(timestamp) as last_message_at,
       COUNT(*) as message_count,
       SUM(CASE WHEN is_read = 0 AND sender_type = 'customer' THEN 1 ELSE 0 END) as unread_count,
       (SELECT message FROM chat_messages cm2
        WHERE cm2.conversation_id = cm.conversation_id
        ORDER BY timestamp DESC LIMIT 1) as last_message
     FROM chat_messages cm
     WHERE conversation_id IS NOT NULL
     GROUP BY conversation_id
     ORDER BY last_message_at DESC`
  ).all() as Record<string, unknown>[];

  const { getAllRepairs } = require('../../config/access-reader');
  const repairs = getAllRepairs() as Record<string, string>[];
  const repMap = new Map<string, { phone: string; name: string }>();
  for (const r of repairs) {
    repMap.set(r.rep_code, { phone: r.rep_tel || 'غير مدرج', name: r.rep_agent || r.rep_name || 'غير مدرج' });
  }

  const enriched = conversations.map(c => ({
    ...c,
    customer_phone: repMap.get(String(c.device_code))?.phone || 'غير مدرج',
    customer_name: repMap.get(String(c.device_code))?.name || 'غير مدرج',
  }));

  res.json({ success: true, data: enriched });
}));

/**
 * GET /api/admin/devices — All devices from Access DB (paginated for admin)
 */
router.get('/devices', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler((req: Request, res: Response) => {
  const { getAllRepairs, getDisplayStatus } = require('../../config/access-reader');
  
  const db = getDatabase();
  const settingsRows = db.prepare('SELECT key, value FROM settings WHERE key LIKE "device_list_%" OR key = "device_classification_source"').all();
  const settings: Record<string, string> = {};
  settingsRows.forEach((row: any) => settings[row.key] = row.value);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.max(1, Math.min(Number(req.query.limit) || 50, 500));
  const search = (req.query.search as string || '').toLowerCase();
  const sortBy = (req.query.sortBy as string || settings.device_list_default_sort || 'rep_date1');
  const sortDir = (req.query.sortDir as string || settings.device_list_sort_dir || 'desc') === 'asc' ? 1 : -1;
  const status = req.query.status as string || 'all';
  const classificationField = settings.device_classification_source || 'rep_case';

  let repairs = getAllRepairs();

  // Search
  if (search) {
    repairs = repairs.filter((r: any) => 
      r.rep_code.toLowerCase().includes(search) ||
      (r.rep_name && r.rep_name.toLowerCase().includes(search)) ||
      (r.rep_tel && r.rep_tel.includes(search)) ||
      (r.rep_agent && r.rep_agent.toLowerCase().includes(search)) ||
      (r.rep_case && r.rep_case.toLowerCase().includes(search))
    );
  }

  // Filter By Status
  const itemsWithStatus = repairs.map((r: any) => ({
    ...r,
    displayStatus: getDisplayStatus(r.rep_state2, r.rep_state),
  }));

  let filtered = itemsWithStatus;
  if (status !== 'all') {
    filtered = filtered.filter((r: any) => r.displayStatus === status);
  }

  // Sort
  filtered.sort((a: any, b: any) => {
    const av = a[sortBy] || '';
    const bv = b[sortBy] || '';
    // Numeric comparison for amount
    if (sortBy === 'rep_amount') {
      return (parseFloat(av) - parseFloat(bv)) * sortDir;
    }
    // String comparison for others
    return String(av).localeCompare(String(bv), 'ar') * sortDir;
  });

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  // Get counts for all statuses (for tabs)
  const statusCounts: Record<string, number> = {};
  itemsWithStatus.forEach((item: any) => {
    statusCounts[item.displayStatus] = (statusCounts[item.displayStatus] || 0) + 1;
  });

  res.json({ 
    success: true, 
    data, 
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    },
    statusCounts,
    classificationField
  });
}));


/**
 * PUT /api/admin/devices/:code/status — Update device status (Overrides on Linux, ADODB on Windows)
 */
router.put('/devices/:code/status', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler(async (req: Request, res: Response) => {
  const code = req.params.code;
  const { rep_state, rep_state2, rep_amount } = req.body;
  
  if (!rep_state && !rep_state2 && rep_amount === undefined) {
    res.status(400).json({ success: false, error: 'No status or amount provided', code: 400 });
    return;
  }

  const os = require('os');
  
  if (os.platform() === 'win32') {
    // TODO: Implement actual ADODB write here
    console.log(`[ADODB] Would write to access DB for ${code}: state=${rep_state}, state2=${rep_state2}, amount=${rep_amount}`);
    // Simulate ADODB writing to standard overrides so UI works immediately even if ADODB isn't ready
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO device_overrides (device_code, rep_state, rep_state2, rep_amount, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(code, rep_state || null, rep_state2 || null, rep_amount !== undefined ? String(rep_amount) : null);
  } else {
    // Linux SQLite Mock Override
    const db = getDatabase();
    db.prepare('INSERT OR REPLACE INTO device_overrides (device_code, rep_state, rep_state2, rep_amount, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)')
      .run(code, rep_state || null, rep_state2 || null, rep_amount !== undefined ? String(rep_amount) : null);
  }

  // Trigger whatsapp notification logic
  const { getRepairByCode, getDisplayStatus } = require('../../config/access-reader');
  const { notifyStatusChange, notifyDeviceReady } = require('../../services/notification.service');
  
  const updatedDevice = getRepairByCode(code);
  if (updatedDevice) {
    const displayStatus = getDisplayStatus(updatedDevice.rep_state2, updatedDevice.rep_state);
    
    try {
      const phone = updatedDevice.rep_tel;
      if (phone) {
        if (displayStatus === 'جاهز للاستلام') {
          await notifyDeviceReady(phone, { code: updatedDevice.rep_code, amount: parseFloat(updatedDevice.rep_amount) || 0 });
        } else {
          await notifyStatusChange(phone, { code: updatedDevice.rep_code, status: displayStatus });
        }
      }
    } catch (err) {
      console.error('[WhatsApp Trigger] Failed to send notification:', err);
    }
  }

  res.json({ success: true, data: { message: 'تم تحديث حالة الجهاز بنجاح' } });
}));

/**
 * POST /api/admin/devices/:code/request-approval — Request customer approval for extra cost
 */
router.post('/devices/:code/request-approval', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.params;
  const { amount, reason } = req.body;

  if (!amount) {
    res.status(400).json({ success: false, error: 'المبلغ مطلوب' });
    return;
  }

  const { getRepairByCode } = require('../../config/access-reader');
  const device = getRepairByCode(code);
  
  if (!device) {
    res.status(404).json({ success: false, error: 'الجهاز غير موجود' });
    return;
  }

  const db = getDatabase();
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  
  // Create pending approval
  db.prepare(
    `INSERT INTO cost_approvals (device_code, amount, reason, token, status)
     VALUES (?, ?, ?, ?, 'pending')`
  ).run(code, amount, reason || '', token);

  // Send WhatsApp notification
  try {
    const { notifyApprovalRequest } = require('../../services/notification.service');
    const phone = device.rep_tel;
    if (phone) {
      const link = `${req.protocol}://${req.get('host')}/approval/${token}`;
      await notifyApprovalRequest(phone, { amount, code, link });
    }
  } catch (err) {
    console.error('[WhatsApp Trigger] Failed to send approval request:', err);
  }

  // Update device status locally to 'انتظار موافقة'
  db.prepare(
    `INSERT INTO device_overrides (rep_code, updated_state, updated_state2, updated_amount)
     VALUES (?, 'لم يتم التسليم', 'الرجوع للعميل', ?)
     ON CONFLICT(rep_code) DO UPDATE SET
     updated_state = 'لم يتم التسليم',
     updated_state2 = 'الرجوع للعميل',
     updated_amount = ?`
  ).run(code, amount, amount);

  res.json({ success: true, data: { message: 'تم إرسال طلب الموافقة للعميل بنجاح', token } });
}));

/**
 * GET /api/admin/settings — Get system settings
 */
router.get('/settings', authenticate, authorize('admin'), asyncHandler((_req: Request, res: Response) => {
  const db = getDatabase();
  const settings = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const obj: Record<string, string> = {};
  for (const s of settings) obj[s.key] = s.value;
  res.json({ success: true, data: obj });
}));

/**
 * PUT /api/admin/settings — Update a setting
 */
router.put('/settings', authenticate, authorize('admin'), asyncHandler((req: Request, res: Response) => {
  const { key, value } = req.body;
  if (!key || value === undefined) {
    res.status(400).json({ success: false, error: 'key and value are required', code: 400 });
    return;
  }
  const db = getDatabase();
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, String(value));
  res.json({ success: true, data: { message: 'تم تحديث الإعداد' } });
}));

/**
 * GET /api/admin/notification-templates — List notification templates
 */
router.get('/notification-templates', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler((_req: Request, res: Response) => {
  const db = getDatabase();
  const templates = db.prepare('SELECT event_type, template, enabled, channels FROM notification_templates').all();
  res.json({ success: true, data: templates });
}));

/**
 * PUT /api/admin/notification-templates/:eventType — Update a template
 */
router.put('/notification-templates/:eventType', authenticate, authorize('admin'), asyncHandler((req: Request, res: Response) => {
  const eventType = req.params.eventType;
  const { template, enabled, channels } = req.body;
  if (!template) {
    res.status(400).json({ success: false, error: 'template is required', code: 400 });
    return;
  }
  const db = getDatabase();
  db.prepare('UPDATE notification_templates SET template = ?, enabled = ?, channels = ? WHERE event_type = ?')
    .run(template, enabled ? 1 : 0, channels || 'whatsapp', eventType);
  res.json({ success: true, data: { message: 'تم تحديث قالب الإشعار' } });
}));

/**
 * GET /api/admin/users — List all users (admin only)
 */
router.get('/users', authenticate, authorize('admin'), asyncHandler(async (_req: Request, res: Response) => {
  const users = UserModel.getAll();
  res.json({ success: true, data: users });
}));

/**
 * POST /api/admin/users — Create a new user (admin only)
 */
router.post('/users', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const { username, password, name, role } = req.body;
  if (!username || !password || !name || !role) {
    res.status(400).json({ success: false, error: 'Missing required fields', code: 400 });
    return;
  }
  try {
    const id = await UserModel.create(username, password, name, role);
    res.json({ success: true, data: { id, message: 'تم إنشاء المستخدم' } });
  } catch (err) {
    res.status(400).json({ success: false, error: 'تعذر إنشاء المستخدم (قد يكون الاسم مستخدمًا)', code: 400 });
  }
}));

/**
 * PUT /api/admin/users/:id — Update role/status (admin only)
 */
router.put('/users/:id', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { role, is_active } = req.body;
  UserModel.updateRoleAndStatus(id, role, is_active ? 1 : 0);
  res.json({ success: true, data: { message: 'تم التحديث بنجاح' } });
}));

/**
 * DELETE /api/admin/users/:id — Delete a user (admin only)
 */
router.delete('/users/:id', authenticate, authorize('admin'), asyncHandler(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  UserModel.delete(id);
  res.json({ success: true, data: { message: 'تم الحذف بنجاح' } });
}));

/**
 * GET /api/admin/clients — Unique clients from Access DB
 */
router.get('/clients', authenticate, authorize('admin', 'tech', 'viewer'), asyncHandler((_req: Request, res: Response) => {
  const { getAllRepairs } = require('../../config/access-reader');
  const repairs = getAllRepairs() as Record<string, string>[];

  // Group by phone number
  const clientMap = new Map<string, { phone: string; name: string; deviceCount: number; lastDate: string }>();
  for (const r of repairs) {
    const phone = r.rep_tel || '';
    if (!phone) continue;
    const existing = clientMap.get(phone);
    if (existing) {
      existing.deviceCount++;
      if (r.rep_date1 > existing.lastDate) existing.lastDate = r.rep_date1;
    } else {
      clientMap.set(phone, {
        phone,
        name: r.rep_agent || r.rep_name || '',
        deviceCount: 1,
        lastDate: r.rep_date1 || '',
      });
    }
  }

  res.json({ success: true, data: Array.from(clientMap.values()) });
}));

/**
 * GET /api/admin/whatsapp/status — WhatsApp connection status + QR code
 */
router.get('/whatsapp/status', authenticate, authorize('admin'), asyncHandler((_req: Request, res: Response) => {
  const status = getWhatsAppStatus();
  res.json({ success: true, data: status });
}));

/**
 * POST /api/admin/whatsapp/restart — Restart WhatsApp client
 */
router.post('/whatsapp/restart', authenticate, authorize('admin'), asyncHandler(async (_req: Request, res: Response) => {
  await restartWhatsApp();
  res.json({ success: true, data: { message: 'تم إعادة تشغيل واتساب' } });
}));

export default router;
