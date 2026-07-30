export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          code: string
          name: string
          owner_user_id: string
          status: 'waiting' | 'setup' | 'capturing' | 'review' | 'completed' | 'closed'
          shared_settings: Json
          settings_revision: number
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name?: string
          owner_user_id: string
          status?: 'waiting' | 'setup' | 'capturing' | 'review' | 'completed' | 'closed'
          shared_settings?: Json
          settings_revision?: number
          expires_at: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          code?: string
          name?: string
          owner_user_id?: string
          status?: 'waiting' | 'setup' | 'capturing' | 'review' | 'completed' | 'closed'
          shared_settings?: Json
          settings_revision?: number
          expires_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          role: 'host' | 'partner'
          display_name: string
          joined_at: string
          last_seen_at: string
          left_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          role: 'host' | 'partner'
          display_name: string
          joined_at?: string
          last_seen_at?: string
          left_at?: string | null
        }
        Update: {
          role?: 'host' | 'partner'
          display_name?: string
          last_seen_at?: string
          left_at?: string | null
        }
        Relationships: []
      }
      photobooth_sessions: {
        Row: {
          id: string
          room_id: string
          created_by: string
          status: 'preparing' | 'countdown' | 'capturing' | 'review' | 'completed' | 'cancelled'
          configuration: Json
          shot_count: number
          current_shot_index: number
          capture_at: string | null
          revision: number
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          room_id: string
          created_by: string
          status?: 'preparing' | 'countdown' | 'capturing' | 'review' | 'completed' | 'cancelled'
          configuration: Json
          shot_count: number
          current_shot_index?: number
          capture_at?: string | null
          revision?: number
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          status?: 'preparing' | 'countdown' | 'capturing' | 'review' | 'completed' | 'cancelled'
          configuration?: Json
          current_shot_index?: number
          capture_at?: string | null
          revision?: number
          completed_at?: string | null
        }
        Relationships: []
      }
      captures: {
        Row: {
          id: string
          session_id: string
          room_id: string
          shot_index: number
          user_id: string
          role: 'host' | 'partner'
          storage_path: string
          width: number
          height: number
          mime_type: 'image/webp' | 'image/jpeg'
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          room_id: string
          shot_index: number
          user_id: string
          role: 'host' | 'partner'
          storage_path: string
          width: number
          height: number
          mime_type: 'image/webp' | 'image/jpeg'
          created_at?: string
        }
        Update: {
          storage_path?: string
          width?: number
          height?: number
          mime_type?: 'image/webp' | 'image/jpeg'
        }
        Relationships: []
      }
      results: {
        Row: {
          id: string
          session_id: string
          room_id: string
          created_by: string
          storage_path: string
          width: number
          height: number
          metadata: Json
          created_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          session_id: string
          room_id: string
          created_by: string
          storage_path: string
          width: number
          height: number
          metadata?: Json
          created_at?: string
          deleted_at?: string | null
        }
        Update: {
          storage_path?: string
          width?: number
          height?: number
          metadata?: Json
          deleted_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_room: {
        Args: { p_display_name: string; p_room_name: string }
        Returns: Database['public']['CompositeTypes']['room_access'][]
      }
      join_room: {
        Args: { p_display_name: string; p_room_code: string }
        Returns: Database['public']['CompositeTypes']['room_access'][]
      }
      leave_room: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      update_room_settings: {
        Args: { p_expected_revision: number; p_room_id: string; p_settings_patch: Json }
        Returns: Database['public']['CompositeTypes']['room_access'][]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: {
      room_access: {
        room_id: string | null
        code: string | null
        name: string | null
        role: 'host' | 'partner' | null
        status: 'waiting' | 'setup' | 'capturing' | 'review' | 'completed' | 'closed' | null
        settings_revision: number | null
        expires_at: string | null
      }
    }
  }
}
