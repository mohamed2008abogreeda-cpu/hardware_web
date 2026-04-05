/**
 * TypeScript type definitions for the Hardware Portal.
 * No `any` types allowed per PRD requirements.
 */

// ============================================
// Device / Repair Types
// ============================================

export interface DevicePublic {
  rep_code: string;
  rep_agent: string;
  rep_name: string;
  rep_date1: string;
  rep_date2: string;
  rep_defects: string;
  rep_solution: string;
  rep_amount: number;
  displayStatus: string;
}

export interface DeviceFull extends DevicePublic {
  rep_serial: string;
  rep_emp: string;
  rep_emp2: string;
  rep_memo: string;
  rep_state: string;
  rep_state2: string;
  rep_tel: string;
}

export type DisplayStatus =
  | 'قيد الفحص'
  | 'قيد الإصلاح'
  | 'انتظار قطعة'
  | 'انتظار موافقة'
  | 'جاهز للاستلام'
  | 'تم التسليم'
  | 'مرفوض';

// ============================================
// Auth Types
// ============================================

export interface CustomerJWTPayload {
  phone: string;
  role: 'customer';
  iat?: number;
  exp?: number;
}

export interface AdminJWTPayload {
  username: string;
  role: 'admin' | 'tech' | 'viewer';
  iat?: number;
  exp?: number;
}

export type JWTPayload = CustomerJWTPayload | AdminJWTPayload;

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: number;
  device_code: string;
  sender_type: 'customer' | 'support';
  message: string;
  timestamp: string;
  is_read: number;
  conversation_id: string | null;
  file_url?: string;
  file_type?: string;
  file_size?: number;
}

// ============================================
// Approval Types
// ============================================

export interface CostApproval {
  id: number;
  device_code: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reason: string | null;
  created_at: string;
  responded_at: string | null;
}

// ============================================
// Rating Types
// ============================================

export interface Rating {
  id: number;
  device_code: string;
  type: 'service' | 'chat';
  rating_speed: number;
  rating_quality: number;
  rating_handling: number;
  comment: string | null;
  created_at: string;
  chat_conversation_id: string | null;
}

// ============================================
// Notification Types
// ============================================

export interface NotificationTemplate {
  event_type: string;
  template: string;
  enabled: number;
  channels: string;
}

export type NotificationEvent =
  | 'new_device'
  | 'status_change'
  | 'device_ready'
  | 'approval_request'
  | 'chat_reply'
  | 'reminder_3days'
  | 'bad_rating'
  | 'system_alert';

export interface NotificationPayload {
  type: NotificationEvent;
  phone: string;
  deviceCode: string;
  data: Record<string, string>;
}

// ============================================
// System Types
// ============================================

export interface SystemLog {
  id: number;
  timestamp: string;
  user_type: 'customer' | 'admin' | 'system';
  user_id: string;
  action: string;
  details: string | null;
  ip: string | null;
}

export interface SystemSettings {
  work_hours_start: string;
  work_hours_end: string;
  emergency_stop: string;
  vacation_mode: string;
  vacation_message: string;
  [key: string]: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: number;
  errors?: { field: string; message: string }[];
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================
// Express Extension
// ============================================

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: CustomerJWTPayload | AdminJWTPayload;
    }
  }
}
