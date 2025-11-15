export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_archived_conversations: {
        Row: {
          admin_profile_id: string
          archived_at: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          admin_profile_id: string
          archived_at?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          admin_profile_id?: string
          archived_at?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          admin_profile_id: string
          created_at: string
          id: string
          interaction_type: string
          message_preview: string | null
          read: boolean
          user_id: string
        }
        Insert: {
          admin_profile_id: string
          created_at?: string
          id?: string
          interaction_type: string
          message_preview?: string | null
          read?: boolean
          user_id: string
        }
        Update: {
          admin_profile_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          message_preview?: string | null
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_admin_profile_id_fkey"
            columns: ["admin_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_secondary_accounts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          last_login: string | null
          nickname: string
          password_hash: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          nickname: string
          password_hash: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          last_login?: string | null
          nickname?: string
          password_hash?: string
        }
        Relationships: []
      }
      banned_users: {
        Row: {
          banned_at: string
          banned_by: string | null
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          banned_at?: string
          banned_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blocked_users: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          order_id: string | null
          reason: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          default_html_content: string
          description: string | null
          html_content: string
          id: string
          subject: string
          template_key: string
          template_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_html_content: string
          description?: string | null
          html_content: string
          id?: string
          subject: string
          template_key: string
          template_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_html_content?: string
          description?: string | null
          html_content?: string
          id?: string
          subject?: string
          template_key?: string
          template_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      hidden_matches: {
        Row: {
          hidden_at: string
          hidden_from: string
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          hidden_at?: string
          hidden_from?: string
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          hidden_at?: string
          hidden_from?: string
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: []
      }
      inbox_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      likes: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          to_user_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          to_user_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes_unlocked: {
        Row: {
          expires_at: string | null
          id: string
          stripe_payment_id: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          stripe_payment_id?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          stripe_payment_id?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string
          id: string
          user1_id: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user1_id: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user1_id?: string
          user2_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_user1_id_fkey"
            columns: ["user1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_user2_id_fkey"
            columns: ["user2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          admin_sender_nickname: string | null
          content: string
          created_at: string
          id: string
          match_id: string
          media_url: string | null
          message_type: string | null
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          admin_sender_nickname?: string | null
          content: string
          created_at?: string
          id?: string
          match_id: string
          media_url?: string | null
          message_type?: string | null
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          admin_sender_nickname?: string | null
          content?: string
          created_at?: string
          id?: string
          match_id?: string
          media_url?: string | null
          message_type?: string | null
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          body: string
          created_at: string | null
          data: Json | null
          id: string
          sent: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          data?: Json | null
          id?: string
          sent?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          sent?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_notes: {
        Row: {
          admin_profile_id: string | null
          altro: string | null
          colore_capelli: string | null
          colore_occhi: string | null
          compleanno: string | null
          created_at: string | null
          eta: string | null
          figli: string | null
          fumatore: string | null
          hobby: string | null
          id: string
          lavoro: string | null
          location: string | null
          match_id: string | null
          nome: string | null
          peso_altezza: string | null
          piercings: string | null
          profile_id: string
          relazione: string | null
          tatuaggi: string | null
          updated_at: string | null
        }
        Insert: {
          admin_profile_id?: string | null
          altro?: string | null
          colore_capelli?: string | null
          colore_occhi?: string | null
          compleanno?: string | null
          created_at?: string | null
          eta?: string | null
          figli?: string | null
          fumatore?: string | null
          hobby?: string | null
          id?: string
          lavoro?: string | null
          location?: string | null
          match_id?: string | null
          nome?: string | null
          peso_altezza?: string | null
          piercings?: string | null
          profile_id: string
          relazione?: string | null
          tatuaggi?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_profile_id?: string | null
          altro?: string | null
          colore_capelli?: string | null
          colore_occhi?: string | null
          compleanno?: string | null
          created_at?: string | null
          eta?: string | null
          figli?: string | null
          fumatore?: string | null
          hobby?: string | null
          id?: string
          lavoro?: string | null
          location?: string | null
          match_id?: string | null
          nome?: string | null
          peso_altezza?: string | null
          piercings?: string | null
          profile_id?: string
          relazione?: string | null
          tatuaggi?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_notes_admin_profile_id_fkey"
            columns: ["admin_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_notes_match_fk"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_notes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          birthdate_locked: boolean | null
          city: string | null
          created_at: string
          favorite_songs: Json | null
          full_name: string
          game_elo: number | null
          gender: string | null
          id: string
          interests: string[] | null
          is_admin_profile: boolean
          last_active: string | null
          latitude: number | null
          location_locked: boolean | null
          longitude: number | null
          looking_for: string[] | null
          manual_online_status: boolean | null
          nickname: string
          photos: string[] | null
          relationship_status: string | null
          relationship_type: string | null
          sexual_orientation: string | null
          show_online_status: boolean | null
          tutorial_completed: boolean | null
          updated_at: string
          user_images_link: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          birthdate_locked?: boolean | null
          city?: string | null
          created_at?: string
          favorite_songs?: Json | null
          full_name: string
          game_elo?: number | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          latitude?: number | null
          location_locked?: boolean | null
          longitude?: number | null
          looking_for?: string[] | null
          manual_online_status?: boolean | null
          nickname: string
          photos?: string[] | null
          relationship_status?: string | null
          relationship_type?: string | null
          sexual_orientation?: string | null
          show_online_status?: boolean | null
          tutorial_completed?: boolean | null
          updated_at?: string
          user_images_link?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          birthdate_locked?: boolean | null
          city?: string | null
          created_at?: string
          favorite_songs?: Json | null
          full_name?: string
          game_elo?: number | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          latitude?: number | null
          location_locked?: boolean | null
          longitude?: number | null
          looking_for?: string[] | null
          manual_online_status?: boolean | null
          nickname?: string
          photos?: string[] | null
          relationship_status?: string | null
          relationship_type?: string | null
          sexual_orientation?: string | null
          show_online_status?: boolean | null
          tutorial_completed?: boolean | null
          updated_at?: string
          user_images_link?: string | null
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          credits_amount: number | null
          currency: string
          id: string
          product_type: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          product_type: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          credits_amount?: number | null
          currency?: string
          id?: string
          product_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          updated_at: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subscription_gifts: {
        Row: {
          amount_cents: number
          completed_at: string | null
          created_at: string
          currency: string
          gifter_id: string
          id: string
          recipient_id: string
          status: string
          stripe_session_id: string
          stripe_subscription_id: string | null
          subscription_type: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gifter_id: string
          id?: string
          recipient_id: string
          status?: string
          stripe_session_id: string
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          gifter_id?: string
          id?: string
          recipient_id?: string
          status?: string
          stripe_session_id?: string
          stripe_subscription_id?: string | null
          subscription_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_admin_response: boolean
          message: string
          read: boolean
          request_data: Json | null
          request_status: string | null
          request_type: string | null
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin_response?: boolean
          message: string
          read?: boolean
          request_data?: Json | null
          request_status?: string | null
          request_type?: string | null
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_admin_response?: boolean
          message?: string
          read?: boolean
          request_data?: Json | null
          request_status?: string | null
          request_type?: string | null
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      territory_connections: {
        Row: {
          badge: string | null
          created_at: string | null
          id: string
          neighbor_indices: number[]
          territory_index: number
          territory_name: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          badge?: string | null
          created_at?: string | null
          id?: string
          neighbor_indices: number[]
          territory_index: number
          territory_name: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          badge?: string | null
          created_at?: string | null
          id?: string
          neighbor_indices?: number[]
          territory_index?: number
          territory_name?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      tris_games: {
        Row: {
          created_at: string
          games_played_today: number
          id: string
          last_reset_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          games_played_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          games_played_today?: number
          id?: string
          last_reset_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          credits_depleted_at: string | null
          daily_free_chats_remaining: number | null
          daily_free_chats_reset_at: string | null
          daily_likes_remaining: number
          daily_likes_reset_at: string | null
          has_used_weekly_trial: boolean | null
          id: string
          is_premium: boolean
          last_daily_reset: string
          premium_expires_at: string | null
          premium_tier: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          credits_depleted_at?: string | null
          daily_free_chats_remaining?: number | null
          daily_free_chats_reset_at?: string | null
          daily_likes_remaining?: number
          daily_likes_reset_at?: string | null
          has_used_weekly_trial?: boolean | null
          id?: string
          is_premium?: boolean
          last_daily_reset?: string
          premium_expires_at?: string | null
          premium_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          credits_depleted_at?: string | null
          daily_free_chats_remaining?: number | null
          daily_free_chats_reset_at?: string | null
          daily_likes_remaining?: number
          daily_likes_reset_at?: string | null
          has_used_weekly_trial?: boolean | null
          id?: string
          is_premium?: boolean
          last_daily_reset?: string
          premium_expires_at?: string | null
          premium_tier?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          reason: string | null
          report_type: string
          reported_id: string
          reporter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason?: string | null
          report_type: string
          reported_id: string
          reporter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          reason?: string | null
          report_type?: string
          reported_id?: string
          reporter_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_distance: {
        Args: { lat1: number; lat2: number; lon1: number; lon2: number }
        Returns: number
      }
      check_and_reset_daily_free_chats: {
        Args: { _user_id: string }
        Returns: {
          chats_remaining: number
          reset_at: string
        }[]
      }
      check_and_reset_daily_likes: {
        Args: { _user_id: string }
        Returns: {
          is_premium: boolean
          likes_remaining: number
          premium_tier: string
          reset_at: string
          subscription_type: string
        }[]
      }
      check_and_reset_user_credits: {
        Args: { _user_id: string }
        Returns: {
          balance: number
          is_premium: boolean
          last_daily_reset: string
        }[]
      }
      consume_daily_like: {
        Args: { _use_credits?: boolean; _user_id: string }
        Returns: {
          credits_used: boolean
          likes_remaining: number
          new_balance: number
          success: boolean
        }[]
      }
      consume_free_chat: {
        Args: { _user_id: string }
        Returns: {
          chats_remaining: number
          success: boolean
        }[]
      }
      create_user_report: {
        Args: {
          _match_id: string
          _reason: string
          _report_type: string
          _reported_id: string
        }
        Returns: string
      }
      deduct_credits: {
        Args: { _amount: number; _user_id: string }
        Returns: boolean
      }
      deduct_message_credits: { Args: { _user_id: string }; Returns: boolean }
      get_subscription_types: {
        Args: { profile_ids: string[] }
        Returns: {
          subscription_type: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_blocked: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      like_with_credits: {
        Args: { _cost?: number; _to_user_id: string }
        Returns: {
          already_exists: boolean
          match_created: boolean
          new_balance: number
          success: boolean
        }[]
      }
      reset_daily_credits: { Args: never; Returns: undefined }
      unlock_birthdate_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      unlock_location_for_user: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      update_game_elo: {
        Args: { elo_change: number; user_id: string }
        Returns: undefined
      }
      update_tris_elo: {
        Args: { elo_change: number; user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "user" | "creator" | "admin"
      gallery_access_status: "pending" | "accepted" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "creator", "admin"],
      gallery_access_status: ["pending", "accepted", "rejected"],
    },
  },
} as const
