/**
 * TypeScript type definitions for the Hardware Portal Frontend.
 */

// ============================================
// Device / Repair Types
// ============================================

export type DisplayStatus =
  | 'قيد الفحص'
  | 'قيد الإصلاح'
  | 'انتظار موافقة'
  | 'جاهز للاستلام'
  | 'تم التسليم'
  | 'لا تصلح'
  | 'إعاده توجيه'
  | string; // Flexible for any Access DB value

export interface DevicePublic {
  rep_code: string;
  rep_agent: string;
  rep_name: string;
  rep_date1: string;
  rep_date2: string;
  rep_defects: string;
  rep_solution: string;
  rep_amount: number;
  displayStatus: DisplayStatus;
}

// ============================================
// Auth Types
// ============================================

export interface AuthState {
  phone: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  token: string | null;
}

export interface OtpRequest {
  phone: string;
  countryCode: string;
  turnstileToken?: string;
}

export interface OtpVerify {
  phone: string;
  code: string;
}

export interface AdminLogin {
  username: string;
  password: string;
  twoFactorCode?: string;
}

// ============================================
// Chat Types
// ============================================

export interface ChatMessage {
  id: number;
  device_code: string;
  sender_type: 'customer' | 'support';
  message: string;
  timestamp: string;
  is_read: boolean;
  conversation_id: string | null;
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

export interface RatingSubmission {
  device_code: string;
  type: 'service' | 'chat';
  rating_speed: number;
  rating_quality: number;
  rating_handling: number;
  comment?: string;
  chat_conversation_id?: string;
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
// Socket.IO Event Types
// ============================================

export const SOCKET_EVENTS = {
  // Client → Server
  CLIENT_JOIN_DEVICE:   'client:join:device',
  CLIENT_SEND_MESSAGE:  'client:chat:message',
  CLIENT_TYPING:        'client:chat:typing',
  CLIENT_STOP_TYPING:   'client:chat:stopTyping',
  CLIENT_APPROVE:       'client:device:approve',
  CLIENT_REJECT:        'client:device:reject',
  CLIENT_ENROUTE:       'client:device:enroute',
  CLIENT_RATING:        'client:rating:submit',

  // Server → Client
  SERVER_MESSAGE:        'server:chat:message',
  SERVER_TYPING:         'server:chat:typing',
  SERVER_STOP_TYPING:    'server:chat:stopTyping',
  SERVER_STATUS_CHANGED: 'server:device:status',
  SERVER_APPROVAL_REQ:   'server:device:approval',

  // Support → Server
  SUPPORT_JOIN:          'support:join',
  SUPPORT_SEND_MESSAGE:  'support:chat:message',
  SUPPORT_TYPING:        'support:chat:typing',
  SUPPORT_STOP_TYPING:   'support:chat:stopTyping',
  SUPPORT_CLOSE_CHAT:    'support:chat:close',

  // Server → Admin
  ADMIN_NEW_DEVICE:      'admin:device:new',
  ADMIN_STATUS_CHANGED:  'admin:device:status',
  ADMIN_NEW_MESSAGE:     'admin:chat:newMessage',
  ADMIN_CLIENT_ONLINE:   'admin:client:online',
  ADMIN_CLIENT_APPROVED: 'admin:device:approved',
  ADMIN_CLIENT_REJECTED: 'admin:device:rejected',
  ADMIN_CLIENT_ENROUTE:  'admin:client:enroute',
  ADMIN_BAD_RATING:      'admin:rating:bad',
  ADMIN_DB_STATUS:       'admin:system:dbStatus',
  ADMIN_TUNNEL_STATUS:   'admin:system:tunnelStatus',
  ADMIN_UNANSWERED:      'admin:chat:unanswered',
  ADMIN_ANXIOUS_CLIENT:  'admin:client:anxious',
} as const;

// ============================================
// Notification Types
// ============================================

export type NotificationEvent =
  | 'new_device'
  | 'status_change'
  | 'device_ready'
  | 'approval_request'
  | 'chat_reply'
  | 'reminder_3days'
  | 'bad_rating'
  | 'system_alert';

// ============================================
// Admin Dashboard Types
// ============================================

export interface DashboardStats {
  activeDevices: number;
  readyDevices: number;
  delayedDevices: number;
  unreadMessages: number;
  onlineClients: number;
}

export interface PeriodStats {
  period: string;
  received: number;
  fixed: number;
  delivered: number;
  rejected: number;
  revenue: number;
  avgRating: number;
}
