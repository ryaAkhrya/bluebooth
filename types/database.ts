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
          active_session_id: string | null
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
          active_session_id?: string | null
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
          active_session_id?: string | null
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
          status: 'preparing' | 'waiting-for-ready' | 'countdown' | 'capturing' | 'waiting-for-uploads' | 'review' | 'retake-countdown' | 'completed' | 'cancelled'
          configuration: Json
          shot_count: number
          current_shot_index: number
          capture_at: string | null
          revision: number
          created_at: string
          completed_at: string | null
          retake_shot_index: number | null
          full_retake: boolean
        }
        Insert: {
          id?: string
          room_id: string
          created_by: string
          status?: 'preparing' | 'waiting-for-ready' | 'countdown' | 'capturing' | 'waiting-for-uploads' | 'review' | 'retake-countdown' | 'completed' | 'cancelled'
          configuration: Json
          shot_count: number
          current_shot_index?: number
          capture_at?: string | null
          revision?: number
          created_at?: string
          completed_at?: string | null
          retake_shot_index?: number | null
          full_retake?: boolean
        }
        Update: {
          status?: 'preparing' | 'waiting-for-ready' | 'countdown' | 'capturing' | 'waiting-for-uploads' | 'review' | 'retake-countdown' | 'completed' | 'cancelled'
          configuration?: Json
          current_shot_index?: number
          capture_at?: string | null
          revision?: number
          completed_at?: string | null
          retake_shot_index?: number | null
          full_retake?: boolean
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
          revision: number
          captured_at: string | null
          metadata: Json
          updated_at: string
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
          revision?: number
          captured_at?: string | null
          metadata?: Json
          updated_at?: string
        }
        Update: {
          storage_path?: string
          width?: number
          height?: number
          mime_type?: 'image/webp' | 'image/jpeg'
          revision?: number
          captured_at?: string | null
          metadata?: Json
          updated_at?: string
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
      capture_session_readiness: {
        Row: {
          session_id: string
          room_id: string
          user_id: string
          revision: number
          camera_ready: boolean
          acknowledged_at: string
        }
        Insert: {
          session_id: string
          room_id: string
          user_id: string
          revision: number
          camera_ready: boolean
          acknowledged_at?: string
        }
        Update: {
          revision?: number
          camera_ready?: boolean
          acknowledged_at?: string
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
        Returns: Database['public']['CompositeTypes']['room_settings_result'][]
      }
      enter_room_setup: {
        Args: { p_room_id: string }
        Returns: boolean
      }
      is_valid_room_settings_patch: {
        Args: { p_patch: Json }
        Returns: boolean
      }
      create_capture_session: {
        Args: { p_room_id: string; p_configuration: Json; p_shot_count: number }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      get_capture_server_time: {
        Args: { p_room_id: string }
        Returns: string
      }
      attach_capture_custom_frame: {
        Args: {
          p_session_id: string
          p_expected_revision: number
          p_storage_path: string
        }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      acknowledge_capture_ready: {
        Args: {
          p_session_id: string
          p_expected_revision: number
          p_camera_ready: boolean
        }
        Returns: Database['public']['Tables']['capture_session_readiness']['Row']
      }
      schedule_capture_shot: {
        Args: { p_session_id: string; p_expected_revision: number; p_lead_ms: number }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      submit_capture_metadata: {
        Args: {
          p_session_id: string
          p_expected_revision: number
          p_shot_index: number
          p_storage_path: string
          p_width: number
          p_height: number
          p_mime_type: string
          p_captured_at: string
          p_metadata?: Json
        }
        Returns: Database['public']['Tables']['captures']['Row']
      }
      complete_capture_shot: {
        Args: { p_session_id: string; p_expected_revision: number }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      prepare_capture_retake: {
        Args: {
          p_session_id: string
          p_expected_revision: number
          p_shot_index?: number | null
        }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      cancel_capture_session: {
        Args: { p_session_id: string; p_expected_revision: number }
        Returns: Database['public']['Tables']['photobooth_sessions']['Row']
      }
      finalize_capture_result: {
        Args: {
          p_session_id: string
          p_expected_revision: number
          p_storage_path: string
          p_width: number
          p_height: number
          p_metadata?: Json
        }
        Returns: Database['public']['Tables']['results']['Row']
      }
      storage_raw_shot_index: {
        Args: { p_name: string }
        Returns: number | null
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
      room_settings_result: {
        room_id: string | null
        shared_settings: Json | null
        settings_revision: number | null
        updated_at: string | null
      }
    }
  }
}
