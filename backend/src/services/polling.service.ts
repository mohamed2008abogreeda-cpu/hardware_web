import { getAllRepairs, getDisplayStatus } from '../config/access-reader';
import type { RepairRecord } from '../config/access-reader';
import { getDatabase } from '../config/database';
import { env } from '../config/env';
import { logAction } from '../middleware/logger';
import type { Server as SocketIOServer } from 'socket.io';

/**
 * Polling Service — watches the Access database for changes.
 *
 * Since Access doesn't support webhooks, we poll the database
 * at regular intervals and detect status changes by comparing
 * with a snapshot. Based on POLLING-LOGIC.md spec.
 */

interface DeviceSnapshot {
  displayStatus: string;
  repState: string;
  repState2: string;
  repAmount: string;
}

let lastSnapshot = new Map<string, DeviceSnapshot>();
let isPolling = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let io: SocketIOServer | null = null;
let dbConnected = true;

/**
 * Initialize and start the polling service.
 */
export function startPolling(socketIO: SocketIOServer): void {
  io = socketIO;
  const interval = env.POLLING_INTERVAL_MS;

  console.log(`🔄 Polling service started — every ${interval / 1000}s`);

  // Initial snapshot
  poll();

  // Periodic polling
  pollTimer = setInterval(poll, interval);
}

/**
 * Stop the polling service.
 */
export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    console.log('🔄 Polling service stopped');
  }
}

/**
 * Update the polling interval (callable from admin settings).
 */
export function updatePollingInterval(newInterval: number): void {
  stopPolling();
  if (io) {
    startPolling(io);
  }
  console.log(`🔄 Polling interval updated: ${newInterval / 1000}s`);
}

/**
 * Main poll function — reads Access DB and detects changes.
 */
async function poll(): Promise<void> {
  if (isPolling) return; // Prevent concurrent polls
  isPolling = true;

  try {
    const repairs = getAllRepairs();
    console.log(`[Polling] Fetched ${repairs.length} repairs from Access DB`);

    // If DB was previously down, notify recovery
    if (!dbConnected) {
      dbConnected = true;
      console.log('[Polling] Database connection restored');
      io?.to('admin').emit('admin:system:dbStatus', { status: 'connected' });
      logAction('system', 'polling', 'DB_RECONNECTED');
    }

    const changes = detectChanges(repairs);

    // Process each change
    for (const change of changes) {
      await handleChange(change);
    }

    // Update snapshot
    updateSnapshot(repairs);

  } catch (err) {
    const error = err as Error;

    if (dbConnected) {
      dbConnected = false;
      console.error('[Polling] Database connection lost:', error.message);
      io?.to('admin').emit('admin:system:dbStatus', { status: 'disconnected' });
      logAction('system', 'polling', 'DB_DISCONNECTED', error.message);
    }
  } finally {
    isPolling = false;
  }
}

// ============================================
// Change Detection
// ============================================

interface DeviceChange {
  type: 'NEW_DEVICE' | 'STATUS_CHANGED';
  repair: RepairRecord;
  oldStatus?: string;
  newStatus: string;
}

function detectChanges(repairs: RepairRecord[]): DeviceChange[] {
  const changes: DeviceChange[] = [];

  for (const repair of repairs) {
    const displayStatus = getDisplayStatus(repair.rep_state2, repair.rep_state);
    const prev = lastSnapshot.get(repair.rep_code);

    // New device
    if (!prev) {
      // Only flag as new if this isn't the first poll (building initial snapshot)
      if (lastSnapshot.size > 0) {
        changes.push({
          type: 'NEW_DEVICE',
          repair,
          newStatus: displayStatus,
        });
      }
      continue;
    }

    // Status changed
    if (prev.displayStatus !== displayStatus) {
      changes.push({
        type: 'STATUS_CHANGED',
        repair,
        oldStatus: prev.displayStatus,
        newStatus: displayStatus,
      });
    }
  }

  return changes;
}

// ============================================
// Change Handlers
// ============================================

async function handleChange(change: DeviceChange): Promise<void> {
  const { type, repair, oldStatus, newStatus } = change;
  const db = getDatabase();

  if (type === 'NEW_DEVICE') {
    console.log(`[Polling] 🆕 New device: ${repair.rep_code} (${repair.rep_name})`);

    // Log event
    db.prepare(
      'INSERT INTO device_events (device_code, event_type, new_value) VALUES (?, ?, ?)'
    ).run(repair.rep_code, 'NEW_DEVICE', newStatus);

    // Notify admin dashboard
    io?.to('admin').emit('admin:device:new', {
      device: {
        rep_code: repair.rep_code,
        rep_name: repair.rep_name,
        rep_agent: repair.rep_agent,
        displayStatus: newStatus,
      },
    });

    logAction('system', repair.rep_code, 'NEW_DEVICE_DETECTED');

    // TODO: Send WhatsApp notification to customer
    // await notificationService.send(repair.rep_tel, 'استُلم', repair);
  }

  if (type === 'STATUS_CHANGED') {
    console.log(
      `[Polling] 🔄 Status changed: ${repair.rep_code} — ${oldStatus} → ${newStatus}`
    );

    // Log event
    db.prepare(
      'INSERT INTO device_events (device_code, event_type, old_value, new_value) VALUES (?, ?, ?, ?)'
    ).run(repair.rep_code, 'STATUS_CHANGED', oldStatus, newStatus);

    // Real-time update to customer watching this device
    io?.to(`device:${repair.rep_code}`).emit('server:device:status', {
      deviceId: repair.rep_code,
      oldStatus,
      newStatus,
    });

    // Notify admin dashboard
    io?.to('admin').emit('admin:device:status', {
      device: {
        rep_code: repair.rep_code,
        rep_name: repair.rep_name,
        displayStatus: newStatus,
      },
      oldStatus,
      newStatus,
    });

    logAction('system', repair.rep_code, 'STATUS_CHANGED', `${oldStatus} → ${newStatus}`);

    // TODO: Send notification based on new status
    // await notificationService.onStatusChange(repair, oldStatus, newStatus);

    // Special handling for "جاهز للاستلام"
    if (newStatus === 'جاهز للاستلام') {
      // The frontend will show confetti! 🎉
      io?.to(`device:${repair.rep_code}`).emit('server:device:ready', {
        deviceId: repair.rep_code,
        amount: parseFloat(repair.rep_amount) || 0,
      });
    }
  }
}

// ============================================
// Snapshot
// ============================================

function updateSnapshot(repairs: RepairRecord[]): void {
  const newSnapshot = new Map<string, DeviceSnapshot>();
  for (const repair of repairs) {
    newSnapshot.set(repair.rep_code, {
      displayStatus: getDisplayStatus(repair.rep_state2, repair.rep_state),
      repState: repair.rep_state,
      repState2: repair.rep_state2,
      repAmount: repair.rep_amount,
    });
  }
  lastSnapshot = newSnapshot;
}

/**
 * Get the current snapshot size (for health monitoring).
 */
export function getSnapshotSize(): number {
  return lastSnapshot.size;
}

/**
 * Check if the database is currently connected.
 */
export function isDatabaseConnected(): boolean {
  return dbConnected;
}
