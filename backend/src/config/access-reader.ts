import { execSync } from 'child_process';
import { parse } from 'csv-parse/sync';
import { env } from './env';

import { getDatabase } from './database';

/**
 * Access Database Reader using mdbtools CLI.
 * This replaces node-adodb which only works on Windows.
 * mdbtools must be installed: `sudo apt install mdbtools`
 */

export interface RepairRecord {
  [key: string]: string;
  rep_code: string;
  rep_agent: string;
  rep_tel: string;
  rep_name: string;
  rep_date1: string;
  rep_date2: string;
  rep_defects: string;
  rep_serial: string;
  rep_emp: string;
  rep_solution: string;
  rep_amount: string;
  rep_state: string;
  rep_state2: string;
  rep_user: string;
  rep_user2: string;
  rep_emp2: string;
  rep_memo: string;
  rep_case: string;
  rep_cpu: string;
}

export interface AgentRecord {
  [key: string]: string;
  agt_code: string;
  agt_name: string;
  agt_tel: string;
  agt_mobile: string;
  agt_address: string;
}

/**
 * Apply local SQLite overrides to Access records
 */
function applyOverrides(repairs: RepairRecord[]): RepairRecord[] {
  try {
    const db = getDatabase();
    const overrides = db.prepare('SELECT * FROM device_overrides').all() as {
      device_code: string;
      rep_state?: string;
      rep_state2?: string;
      rep_amount?: string;
    }[];
    
    if (overrides.length === 0) return repairs;
    
    const overrideMap = new Map();
    for (const o of overrides) {
      overrideMap.set(o.device_code, o);
    }
    
    for (const r of repairs) {
      const ov = overrideMap.get(r.rep_code);
      if (ov) {
        if (ov.rep_state) r.rep_state = ov.rep_state;
        if (ov.rep_state2) r.rep_state2 = ov.rep_state2;
        if (ov.rep_amount) r.rep_amount = ov.rep_amount;
      }
    }
  } catch (err) {
    // DB or table might not be ready yet
  }
  return repairs;
}

/**
 * Export an entire table from Access as parsed JSON records
 */
function exportTable<T extends Record<string, unknown>>(tableName: string): T[] {
  try {
    const csv = execSync(
      `mdb-export "${env.ACCESS_DB_PATH}" "${tableName}"`,
      {
        encoding: 'utf-8',
        maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large tables
        timeout: 30000,
      }
    );

    if (!csv.trim()) return [];

    return parse(csv, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    }) as T[];
  } catch (err) {
    const error = err as Error;
    console.error(`[AccessReader] Failed to export table "${tableName}":`, error.message);
    throw new Error(`Failed to read Access database table "${tableName}"`);
  }
}

/**
 * Get all repair records from Access
 */
export function getAllRepairs(): RepairRecord[] {
  const records = exportTable<RepairRecord>('repair');
  return applyOverrides(records);
}

/**
 * Get repair records by phone number
 */
export function getRepairsByPhone(phone: string): RepairRecord[] {
  const allRepairs = getAllRepairs();
  const normalizedPhone = normalizePhone(phone);
  return allRepairs.filter((r) => normalizePhone(r.rep_tel) === normalizedPhone);
}

/**
 * Get a single repair record by code
 */
export function getRepairByCode(code: string): RepairRecord | undefined {
  const allRepairs = getAllRepairs();
  return allRepairs.find((r) => r.rep_code === code);
}

/**
 * Check if a phone number exists in any repair record
 */
export function phoneExists(phone: string): boolean {
  return getRepairsByPhone(phone).length > 0;
}

/**
 * Get all agents from Access
 */
export function getAllAgents(): AgentRecord[] {
  return exportTable<AgentRecord>('agents');
}

/**
 * Calculate the display status for a repair record.
 * This is the customer-facing status derived from internal states.
 *
 * Real rep_state values:  "تم التسليم" | "لم يتم التسليم" | numbers | empty
 * Real rep_state2 values: "تم الاصلاح" | "لا تصلح" | "إعاده توجيه" | "الرجوع للعميل" | empty
 */
export function getDisplayStatus(repState2: string, repState: string): string {
  // Final delivery status
  if (repState === 'تم التسليم') return 'تم التسليم';

  // Repair completed — ready for pickup
  if (repState2 === 'تم الاصلاح') return 'جاهز للاستلام';

  // Cannot be repaired
  if (repState2 === 'لا تصلح') return 'لا تصلح';

  // Redirected to another workshop/specialist
  if (repState2 === 'إعاده توجيه') return 'إعاده توجيه';

  // Customer needs to be contacted / waiting for customer decision
  if (repState2 === 'الرجوع للعميل') return 'انتظار موافقة';

  // Not yet delivered — still being worked on
  if (repState === 'لم يتم التسليم' && !repState2) return 'قيد الإصلاح';

  // Default: under inspection / in progress
  return 'قيد الفحص';
}

/**
 * Normalize Egyptian phone numbers to a consistent format
 */
function normalizePhone(phone: string): string {
  if (!phone) return '';
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // Handle Egyptian numbers
  if (digits.startsWith('20')) digits = digits.substring(2);
  if (digits.startsWith('0')) digits = digits.substring(1);
  return digits;
}

/**
 * Filter repair fields for customer display (hide internal fields)
 */
export function filterForCustomer(record: RepairRecord): Record<string, unknown> {
  return {
    rep_code: record.rep_code,
    rep_agent: record.rep_agent,
    rep_name: record.rep_name,
    rep_date1: record.rep_date1,
    rep_date2: record.rep_date2,
    rep_defects: record.rep_defects,
    rep_solution: record.rep_solution,
    rep_amount: parseFloat(record.rep_amount) || 0,
    displayStatus: getDisplayStatus(record.rep_state2, record.rep_state),
  };
}
