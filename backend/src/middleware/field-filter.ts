/**
 * Field filter middleware — per SCHEMA.md / SECURITY-RULES.md.
 * Strips internal fields from API responses to prevent
 * leaking cost, profit, and technician data to customers.
 */

const INTERNAL_FIELDS = [
  'CostPrice',
  'PartCost',
  'ProfitMargin',
  'InternalNotes',
  'TechnicianID',
  'TechnicianName',
  'InternalStatus',
  'rep_user',
  'rep_user2',
  'rep_emp',
  'rep_emp2',
  'rep_memo',
  'rep_serial',
];

export function filterDevice(device: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...device };
  for (const field of INTERNAL_FIELDS) {
    delete safe[field];
  }
  return safe;
}

export function filterDevices(devices: Record<string, unknown>[]): Record<string, unknown>[] {
  return devices.map(filterDevice);
}
