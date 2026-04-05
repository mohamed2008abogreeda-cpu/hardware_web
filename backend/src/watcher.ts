import fs from 'fs';
import path from 'path';
import { env } from './config/env';
import { getDatabase } from './config/database';
import { getAllRepairs, getDisplayStatus, type RepairRecord } from './config/access-reader';
import { queueNotification } from './services/queue.service';
import { trackEvent } from './services/analytics.service';
import { createApprovalRequest } from './modules/approvals/approvals.service';

// Queue logic will be implemented later
const WATCH_INTERVAL_MS = env.POLLING_INTERVAL_MS || 5000;

// Memory cache for Change Data Capture
let lastKnownData = new Map<string, { state2: string; amount: number; state: string; phone: string; name: string }>();
let lastFileSize = 0;
let lastModified = 0;

/**
 * Handle new or updated records
 */
async function handleChanges(changes: any[]) {
  const db = getDatabase();

  for (const change of changes) {
    const { rep_code, rep_state2, rep_amount, rep_state, rep_tel, rep_agent, type } = change;

    // Log the event in SQLite
    const insertStmt = db.prepare(`
      INSERT INTO device_events (device_code, event_type, old_value, new_value)
      VALUES (?, ?, ?, ?)
    `);

    const oldValue = type === 'update' ? JSON.stringify({
      state2: lastKnownData.get(rep_code)?.state2,
      amount: lastKnownData.get(rep_code)?.amount
    }) : null;

    const newValue = JSON.stringify({ state2: rep_state2, amount: rep_amount });

    insertStmt.run(
      rep_code,
      type === 'new' ? 'new' : 'status_change',
      oldValue,
      newValue
    );
    
    trackEvent(rep_code, type === 'new' ? 'DEVICE_NEW_RECORDED' : 'DEVICE_STATUS_CHANGED', { state: rep_state2, previousState: lastKnownData.get(rep_code)?.state2 });

    const newDisplayStatus = getDisplayStatus(rep_state2, rep_state);
    const oldData = lastKnownData.get(rep_code);
    const oldDisplayStatus = oldData ? getDisplayStatus(oldData.state2, oldData.state) : null;

    // Notification via Queue if status changed
    if (newDisplayStatus !== oldDisplayStatus) {
       console.log(`[Watcher] Status changed for ${rep_code} to ${newDisplayStatus}`);
       void queueNotification({
         phone: rep_tel,
         eventType: 'status_change',
         data: { code: rep_code, status: newDisplayStatus }
       });
    }

    // Cost Approvals system
    if (rep_state2 === 'الرجوع للعميل' || rep_state2 === 'انتظار موافقة') {
      // Check for pending approvals
      const pendingApproval = db.prepare(
        "SELECT * FROM cost_approvals WHERE device_code = ? AND status = 'pending'"
      ).get(rep_code);

      if (!pendingApproval) {
        const { token } = createApprovalRequest(rep_code, parseFloat(rep_amount) || 0);

        console.log(`[Watcher] Approval requested for ${rep_code} with amount ${rep_amount}, token: ${token}`);
        
        // Approval Notification via Bull queue
        void queueNotification({
           phone: rep_tel,
           eventType: 'approval_request',
           data: { amount: rep_amount, code: rep_code, link: `${env.FRONTEND_URL}/share?token=${token}` }
        });
      }
    }

    // Update memory cache
    lastKnownData.set(rep_code, {
      state2: rep_state2,
      amount: parseFloat(rep_amount) || 0,
      state: rep_state,
      phone: rep_tel,
      name: rep_agent
    });
  }
}

/**
 * Watch the Access DB for changes
 */
async function watchAccess() {
  console.log(`[Watcher] Initializing... pulling initial data from ${env.ACCESS_DB_PATH}`);
  let rows: RepairRecord[] = [];
  
  try {
     rows = getAllRepairs();
  } catch (err) {
     console.error(`[Watcher] Failed to pull initial data:`, err);
  }

  for (const row of rows) {
    lastKnownData.set(row.rep_code, {
      state2: row.rep_state2,
      amount: parseFloat(row.rep_amount) || 0,
      state: row.rep_state,
      phone: row.rep_tel,
      name: row.rep_agent
    });
  }

  if (fs.existsSync(env.ACCESS_DB_PATH)) {
     const stats = fs.statSync(env.ACCESS_DB_PATH);
     lastFileSize = stats.size;
     lastModified = stats.mtimeMs;
  }

  console.log(`[Watcher] Initialization complete. Watching for changes every ${WATCH_INTERVAL_MS}ms...`);

  setInterval(async () => {
    try {
      if (!fs.existsSync(env.ACCESS_DB_PATH)) return;

      const stats = fs.statSync(env.ACCESS_DB_PATH);
      if (stats.size === lastFileSize && stats.mtimeMs === lastModified) return;

      lastFileSize = stats.size;
      lastModified = stats.mtimeMs;

      console.log(`[Watcher] Access DB modified. Checking for changes...`);
      const currentRows = getAllRepairs();
      const changes = [];

      for (const row of currentRows) {
        const prev = lastKnownData.get(row.rep_code);
        const currentAmount = parseFloat(row.rep_amount) || 0;

        if (!prev) {
          changes.push({ ...row, type: 'new' });
        } else if (prev.state2 !== row.rep_state2 || prev.amount !== currentAmount) {
          changes.push({ ...row, type: 'update' });
        }
      }

      if (changes.length > 0) {
        console.log(`[Watcher] Found ${changes.length} changes. Processing...`);
        await handleChanges(changes);
      }
    } catch (err) {
      console.error('[Watcher] Error during watch loop:', err);
      try {
        const db = getDatabase();
        db.prepare(
          "INSERT INTO system_logs (user_type, action, details) VALUES ('system', 'watch_error', ?)"
        ).run(err instanceof Error ? err.message : String(err));
      } catch (logErr) {
        // ignore
      }
    }
  }, WATCH_INTERVAL_MS);
}

// Start watching
watchAccess();
