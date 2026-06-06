export type UserRole = 'owner' | 'client' | 'technician'
export type WorkOrderStatus =
  | 'pending'
  | 'accepted'
  | 'assigned'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent'

export interface Company {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  company_id: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
  companies?: Company | null
}

export interface WorkOrder {
  id: string
  title: string
  description: string
  status: WorkOrderStatus
  priority: PriorityLevel
  client_id: string
  technician_id: string | null
  company_id: string | null
  owner_notes: string | null
  preferred_date: string | null
  created_at: string
  updated_at: string
  accepted_at: string | null
  assigned_at: string | null
  completed_at: string | null
  // joined relations
  client?: Profile | null | Record<string, unknown>
  technician?: Profile | null | Record<string, unknown>
  company?: Company | null
}

export interface WorkOrderStatusHistory {
  id: string
  work_order_id: string
  old_status: WorkOrderStatus | null
  new_status: WorkOrderStatus
  changed_by: string
  note: string | null
  created_at: string
  changer?: Profile | null
}

export interface TimeLog {
  id: string
  work_order_id: string
  technician_id: string
  start_time: string
  end_time: string | null
  duration_mins: number | null
  notes: string | null
  created_at: string
}

export interface WorkOrderAttachment {
  id: string
  work_order_id: string
  uploaded_by: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

// ─── Supabase Database Type ──────────────────────────────────────────────────
// Proper Row/Insert/Update structure required by @supabase/supabase-js
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: Company
        Insert: Omit<Company, 'id' | 'created_at' | 'updated_at'> & { id?: string }
        Update: Partial<Omit<Company, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      profiles: {
        Row: Omit<Profile, 'companies'>
        Insert: Omit<Profile, 'created_at' | 'updated_at' | 'companies'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at' | 'companies'>>
        Relationships: []
      }
      work_orders: {
        Row: Omit<WorkOrder, 'client' | 'technician' | 'company'>
        Insert: Omit<WorkOrder, 'id' | 'created_at' | 'updated_at' | 'accepted_at' | 'assigned_at' | 'completed_at' | 'client' | 'technician' | 'company'> & { id?: string }
        Update: Partial<Omit<WorkOrder, 'id' | 'created_at' | 'client' | 'technician' | 'company'>>
        Relationships: []
      }
      work_order_status_history: {
        Row: WorkOrderStatusHistory
        Insert: Omit<WorkOrderStatusHistory, 'id' | 'created_at' | 'changer'> & { id?: string }
        Update: Partial<Omit<WorkOrderStatusHistory, 'id' | 'created_at'>>
        Relationships: []
      }
      time_logs: {
        Row: TimeLog
        Insert: Omit<TimeLog, 'id' | 'created_at' | 'duration_mins'> & { id?: string }
        Update: Partial<Omit<TimeLog, 'id' | 'created_at' | 'duration_mins'>>
        Relationships: []
      }
      work_order_attachments: {
        Row: WorkOrderAttachment
        Insert: Omit<WorkOrderAttachment, 'id' | 'created_at'> & { id?: string }
        Update: Partial<Omit<WorkOrderAttachment, 'id' | 'created_at'>>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      work_order_status: WorkOrderStatus
      priority_level: PriorityLevel
    }
    CompositeTypes: Record<string, never>
  }
}
