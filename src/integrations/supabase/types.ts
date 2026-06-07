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
      admin_credit_actions: {
        Row: {
          action_label: string
          admin_email: string | null
          admin_id: string | null
          created_at: string
          id: string
          reason: string
          target_user_id: string
        }
        Insert: {
          action_label: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          reason: string
          target_user_id: string
        }
        Update: {
          action_label?: string
          admin_email?: string | null
          admin_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          target_user_id?: string
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
          source_id: string | null
          source_table: string | null
          user_id: string
        }
        Insert: {
          admin_profile_id: string
          created_at?: string
          id?: string
          interaction_type: string
          message_preview?: string | null
          read?: boolean
          source_id?: string | null
          source_table?: string | null
          user_id: string
        }
        Update: {
          admin_profile_id?: string
          created_at?: string
          id?: string
          interaction_type?: string
          message_preview?: string | null
          read?: boolean
          source_id?: string | null
          source_table?: string | null
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
      admin_panel_unlocks: {
        Row: {
          unlocked_at: string
          user_id: string
        }
        Insert: {
          unlocked_at?: string
          user_id: string
        }
        Update: {
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_profile_edits: {
        Row: {
          admin_email: string | null
          admin_id: string | null
          changes: string
          created_at: string
          id: string
          profile_id: string | null
          profile_nickname: string | null
        }
        Insert: {
          admin_email?: string | null
          admin_id?: string | null
          changes: string
          created_at?: string
          id?: string
          profile_id?: string | null
          profile_nickname?: string | null
        }
        Update: {
          admin_email?: string | null
          admin_id?: string | null
          changes?: string
          created_at?: string
          id?: string
          profile_id?: string | null
          profile_nickname?: string | null
        }
        Relationships: []
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
      admin_user_actions: {
        Row: {
          action_type: string
          admin_email: string | null
          admin_id: string | null
          batch_id: string | null
          created_at: string
          id: string
          inbox_deleted: boolean
          message: string | null
          target_nickname: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_email?: string | null
          admin_id?: string | null
          batch_id?: string | null
          created_at?: string
          id?: string
          inbox_deleted?: boolean
          message?: string | null
          target_nickname?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_email?: string | null
          admin_id?: string | null
          batch_id?: string | null
          created_at?: string
          id?: string
          inbox_deleted?: boolean
          message?: string | null
          target_nickname?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      app_banners: {
        Row: {
          created_at: string
          id: string
          image_path: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_path: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string
          position?: number
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
      daily_top1_trophies: {
        Row: {
          award_date: string
          awarded_at: string
          user_elo: number
          user_id: string
        }
        Insert: {
          award_date: string
          awarded_at?: string
          user_elo: number
          user_id: string
        }
        Update: {
          award_date?: string
          awarded_at?: string
          user_elo?: number
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
      email_templates_backup_20260517: {
        Row: {
          backed_up_at: string | null
          created_at: string | null
          default_html_content: string | null
          description: string | null
          html_content: string | null
          id: string | null
          subject: string | null
          template_key: string | null
          template_name: string | null
          updated_at: string | null
        }
        Insert: {
          backed_up_at?: string | null
          created_at?: string | null
          default_html_content?: string | null
          description?: string | null
          html_content?: string | null
          id?: string | null
          subject?: string | null
          template_key?: string | null
          template_name?: string | null
          updated_at?: string | null
        }
        Update: {
          backed_up_at?: string | null
          created_at?: string | null
          default_html_content?: string | null
          description?: string | null
          html_content?: string | null
          id?: string | null
          subject?: string | null
          template_key?: string | null
          template_name?: string | null
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
          batch_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: []
      }
      leaderboard_rank_streaks: {
        Row: {
          created_at: string
          current_elo: number
          current_rank: number
          is_admin_profile: boolean
          last_checked_at: string
          profile_id: string
          rank_started_at: string
          top1_streak_started_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_elo?: number
          current_rank: number
          is_admin_profile?: boolean
          last_checked_at?: string
          profile_id: string
          rank_started_at?: string
          top1_streak_started_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_elo?: number
          current_rank?: number
          is_admin_profile?: boolean
          last_checked_at?: string
          profile_id?: string
          rank_started_at?: string
          top1_streak_started_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaderboard_rank_streaks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          destiny_traits: Json | null
          email_like_notifications: boolean
          email_message_notifications: boolean
          favorite_songs: Json | null
          full_name: string
          game_elo: number | null
          gender: string | null
          id: string
          interests: string[] | null
          is_admin_profile: boolean
          last_active: string | null
          last_login_at: string | null
          last_logout_at: string | null
          latitude: number | null
          location_locked: boolean | null
          longitude: number | null
          looking_for: string[] | null
          manual_online_status: boolean | null
          nickname: string
          onboarding_completed: boolean
          photos: string[] | null
          profile_theme: string
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
          destiny_traits?: Json | null
          email_like_notifications?: boolean
          email_message_notifications?: boolean
          favorite_songs?: Json | null
          full_name: string
          game_elo?: number | null
          gender?: string | null
          id: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          last_login_at?: string | null
          last_logout_at?: string | null
          latitude?: number | null
          location_locked?: boolean | null
          longitude?: number | null
          looking_for?: string[] | null
          manual_online_status?: boolean | null
          nickname: string
          onboarding_completed?: boolean
          photos?: string[] | null
          profile_theme?: string
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
          destiny_traits?: Json | null
          email_like_notifications?: boolean
          email_message_notifications?: boolean
          favorite_songs?: Json | null
          full_name?: string
          game_elo?: number | null
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          last_login_at?: string | null
          last_logout_at?: string | null
          latitude?: number | null
          location_locked?: boolean | null
          longitude?: number | null
          looking_for?: string[] | null
          manual_online_status?: boolean | null
          nickname?: string
          onboarding_completed?: boolean
          photos?: string[] | null
          profile_theme?: string
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
          admin_id: string | null
          created_at: string
          file_name: string | null
          file_url: string | null
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
          admin_id?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
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
          admin_id?: string | null
          created_at?: string
          file_name?: string | null
          file_url?: string | null
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
      support_ratings: {
        Row: {
          admins: Json | null
          assisted_at: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number | null
          status: string
          submitted_at: string | null
          user_email: string | null
          user_id: string
        }
        Insert: {
          admins?: Json | null
          assisted_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          submitted_at?: string | null
          user_email?: string | null
          user_id: string
        }
        Update: {
          admins?: Json | null
          assisted_at?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number | null
          status?: string
          submitted_at?: string | null
          user_email?: string | null
          user_id?: string
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
      tournament_matches: {
        Row: {
          bracket_side: string
          completed_at: string | null
          created_at: string
          id: string
          is_user_match: boolean
          loser_id: string | null
          match_index: number
          player_a_id: string | null
          player_b_id: string | null
          predetermined_winner_id: string | null
          round: number
          scheduled_end_at: string | null
          started_at: string | null
          status: string
          tournament_id: string
          updated_at: string
          winner_id: string | null
        }
        Insert: {
          bracket_side: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_user_match?: boolean
          loser_id?: string | null
          match_index: number
          player_a_id?: string | null
          player_b_id?: string | null
          predetermined_winner_id?: string | null
          round: number
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string
          tournament_id: string
          updated_at?: string
          winner_id?: string | null
        }
        Update: {
          bracket_side?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          is_user_match?: boolean
          loser_id?: string | null
          match_index?: number
          player_a_id?: string | null
          player_b_id?: string | null
          predetermined_winner_id?: string | null
          round?: number
          scheduled_end_at?: string | null
          started_at?: string | null
          status?: string
          tournament_id?: string
          updated_at?: string
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_matches_loser_id_fkey"
            columns: ["loser_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player_a_id_fkey"
            columns: ["player_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_player_b_id_fkey"
            columns: ["player_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_predetermined_winner_id_fkey"
            columns: ["predetermined_winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_matches_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_participants: {
        Row: {
          bracket_side: string
          created_at: string
          eliminated_in_round: number | null
          elo_snapshot: number
          final_position: number | null
          id: string
          is_user: boolean
          profile_id: string
          slot: number
          tournament_id: string
        }
        Insert: {
          bracket_side: string
          created_at?: string
          eliminated_in_round?: number | null
          elo_snapshot: number
          final_position?: number | null
          id?: string
          is_user?: boolean
          profile_id: string
          slot: number
          tournament_id: string
        }
        Update: {
          bracket_side?: string
          created_at?: string
          eliminated_in_round?: number | null
          elo_snapshot?: number
          final_position?: number | null
          id?: string
          is_user?: boolean
          profile_id?: string
          slot?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          created_at: string
          current_round: number
          finished_at: string | null
          game_type: string
          id: string
          last_heartbeat_at: string
          rewards_claimed: boolean
          started_at: string
          status: string
          updated_at: string
          user_final_position: number | null
          user_id: string
          user_slot: number
          winner_id: string | null
        }
        Insert: {
          created_at?: string
          current_round?: number
          finished_at?: string | null
          game_type: string
          id?: string
          last_heartbeat_at?: string
          rewards_claimed?: boolean
          started_at?: string
          status?: string
          updated_at?: string
          user_final_position?: number | null
          user_id: string
          user_slot: number
          winner_id?: string | null
        }
        Update: {
          created_at?: string
          current_round?: number
          finished_at?: string | null
          game_type?: string
          id?: string
          last_heartbeat_at?: string
          rewards_claimed?: boolean
          started_at?: string
          status?: string
          updated_at?: string
          user_final_position?: number | null
          user_id?: string
          user_slot?: number
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tris_games: {
        Row: {
          apex_unlocked: boolean
          created_at: string
          dama_draws: number
          dama_losses: number
          dama_wins: number
          ever_champion: boolean
          games_played_today: number
          id: string
          last_game_at: string | null
          last_game_payment_type: string | null
          last_known_rank: number | null
          last_reset_date: string
          max_elo_reached: number
          monthly_champion_titles: number
          othello_draws: number
          othello_losses: number
          othello_wins: number
          top_1_trophies: number
          tournaments_won: number
          tris_draws: number
          tris_losses: number
          tris_wins: number
          updated_at: string
          user_id: string
          weekly_champion_titles: number
          zenith_unlocked: boolean
        }
        Insert: {
          apex_unlocked?: boolean
          created_at?: string
          dama_draws?: number
          dama_losses?: number
          dama_wins?: number
          ever_champion?: boolean
          games_played_today?: number
          id?: string
          last_game_at?: string | null
          last_game_payment_type?: string | null
          last_known_rank?: number | null
          last_reset_date?: string
          max_elo_reached?: number
          monthly_champion_titles?: number
          othello_draws?: number
          othello_losses?: number
          othello_wins?: number
          top_1_trophies?: number
          tournaments_won?: number
          tris_draws?: number
          tris_losses?: number
          tris_wins?: number
          updated_at?: string
          user_id: string
          weekly_champion_titles?: number
          zenith_unlocked?: boolean
        }
        Update: {
          apex_unlocked?: boolean
          created_at?: string
          dama_draws?: number
          dama_losses?: number
          dama_wins?: number
          ever_champion?: boolean
          games_played_today?: number
          id?: string
          last_game_at?: string | null
          last_game_payment_type?: string | null
          last_known_rank?: number | null
          last_reset_date?: string
          max_elo_reached?: number
          monthly_champion_titles?: number
          othello_draws?: number
          othello_losses?: number
          othello_wins?: number
          top_1_trophies?: number
          tournaments_won?: number
          tris_draws?: number
          tris_losses?: number
          tris_wins?: number
          updated_at?: string
          user_id?: string
          weekly_champion_titles?: number
          zenith_unlocked?: boolean
        }
        Relationships: []
      }
      unlocked_like_profiles: {
        Row: {
          credits_used: number | null
          id: string
          unlocked_at: string | null
          unlocked_profile_id: string
          user_id: string
        }
        Insert: {
          credits_used?: number | null
          id?: string
          unlocked_at?: string | null
          unlocked_profile_id: string
          user_id: string
        }
        Update: {
          credits_used?: number | null
          id?: string
          unlocked_at?: string | null
          unlocked_profile_id?: string
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
          admin_tier: number | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          admin_tier?: number | null
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          admin_tier?: number | null
          created_at?: string
          display_name?: string | null
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
      _tournament_setup_match: {
        Args: { _match_id: string; _user_id: string }
        Returns: undefined
      }
      abandon_tournament: {
        Args: { _reason?: string; _tournament_id: string }
        Returns: undefined
      }
      admin_base_elo: { Args: { id: string }; Returns: number }
      admin_bucket: { Args: { id: string; now_ms: number }; Returns: number }
      admin_create_admin_user: {
        Args: { p_email: string; p_password: string; p_tier: number }
        Returns: {
          message: string
          success: boolean
          user_id: string
        }[]
      }
      admin_cum_drift: { Args: { cb: number; id: string }; Returns: number }
      admin_demote: {
        Args: { p_user_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      admin_drift1: { Args: { b: number; id: string }; Returns: number }
      admin_elo: { Args: { id: string; now_ms: number }; Returns: number }
      admin_games: { Args: { b: number; id: string }; Returns: number }
      admin_list_tiered: {
        Args: never
        Returns: {
          admin_tier: number
          created_at: string
          email: string
          user_id: string
        }[]
      }
      admin_promote_to_tier: {
        Args: { p_delete_profile?: boolean; p_email: string; p_tier: number }
        Returns: {
          message: string
          success: boolean
          user_id: string
        }[]
      }
      advance_tournament: {
        Args: { _tournament_id: string }
        Returns: undefined
      }
      award_daily_champion_full: {
        Args: never
        Returns: {
          awarded_date: string
          processed_days: number
          winner_kind: string
        }[]
      }
      award_daily_top1_if_needed: {
        Args: never
        Returns: {
          awarded_date: string
          awarded_to: string
          processed_days: number
        }[]
      }
      award_my_daily_champion: { Args: never; Returns: boolean }
      award_top1_trophy_if_promoted: {
        Args: { p_current_rank: number; p_user_id: string }
        Returns: {
          awarded: boolean
          total_trophies: number
        }[]
      }
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
      claim_tournament_rewards: {
        Args: { _tournament_id: string }
        Returns: {
          credits_awarded: number
          elo_delta: number
          final_position: number
          game_type: string
          status: string
        }[]
      }
      cleanup_abandoned_tournaments_internal: {
        Args: never
        Returns: undefined
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
      create_tournament: {
        Args: {
          _admin_elos: number[]
          _admin_ids: string[]
          _game_type: string
          _predetermined_winners: string[]
          _user_elo: number
        }
        Returns: {
          match_durations_seconds: number[]
          tournament_id: string
          user_slot: number
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
      delete_inbox_batch: { Args: { p_batch_id: string }; Returns: number }
      enforce_premium_expiry: { Args: never; Returns: boolean }
      fnv1a: { Args: { s: string }; Returns: number }
      get_admin_credit_actions: {
        Args: never
        Returns: {
          action_label: string
          admin_email: string
          created_at: string
          id: string
          reason: string
          target_user_id: string
        }[]
      }
      get_chattors_conversations: {
        Args: never
        Returns: {
          adminNickname: string
          adminProfileId: string
          lastMessageAt: string
          matchId: string
          unreadCount: number
          userAvatar: string
          userCity: string
          userId: string
          userLatitude: number
          userLongitude: number
          userNickname: string
        }[]
      }
      get_or_create_direct_chat: {
        Args: { _other_user_id: string }
        Returns: {
          match_id: string
          was_created: boolean
        }[]
      }
      get_profile_edits: {
        Args: never
        Returns: {
          admin_email: string
          changes: string
          created_at: string
          id: string
          profile_nickname: string
        }[]
      }
      get_subscription_types: {
        Args: { profile_ids: string[] }
        Returns: {
          subscription_type: string
          user_id: string
        }[]
      }
      get_user_actions: {
        Args: never
        Returns: {
          action_type: string
          admin_email: string
          batch_id: string
          created_at: string
          id: string
          inbox_deleted: boolean
          message: string
          target_nickname: string
        }[]
      }
      has_admin_panel_access: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_game_stat: {
        Args: { p_game: string; p_result: string; p_user_id: string }
        Returns: undefined
      }
      is_user_blocked: {
        Args: { user1_id: string; user2_id: string }
        Returns: boolean
      }
      lc_is_offline_for_email: {
        Args: { _offline_after?: string; _profile_id: string }
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
      log_admin_credit_action: {
        Args: {
          p_action_label: string
          p_reason: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      log_profile_edit: {
        Args: {
          p_changes: string
          p_profile_id: string
          p_profile_nickname: string
        }
        Returns: undefined
      }
      log_user_action: {
        Args: {
          p_action_type: string
          p_batch_id: string
          p_message: string
          p_target_nickname: string
          p_target_user_id: string
        }
        Returns: undefined
      }
      mark_champion_reached: { Args: never; Returns: boolean }
      mark_conversation_read: {
        Args: { p_match_id: string; p_user_id: string }
        Returns: number
      }
      mark_support_messages_read: {
        Args: { p_user_id: string }
        Returns: {
          updated_count: number
        }[]
      }
      refresh_leaderboard_rank_streaks: {
        Args: never
        Returns: {
          current_elo: number
          current_rank: number
          is_admin_profile: boolean
          last_checked_at: string
          profile_id: string
          rank_started_at: string
          top1_streak_seconds: number
          top1_streak_started_at: string
        }[]
      }
      report_user_match_result: {
        Args: { _match_id: string; _user_won: boolean }
        Returns: undefined
      }
      reset_daily_credits: { Args: never; Returns: undefined }
      resolve_npc_match:
        | {
            Args: { _match_id: string }
            Returns: {
              match_id: string
              newly_resolved: boolean
              winner_id: string
            }[]
          }
        | {
            Args: { _force?: boolean; _match_id: string }
            Returns: {
              match_id: string
              newly_resolved: boolean
              winner_id: string
            }[]
          }
      send_inbox_to_all: {
        Args: { p_message: string }
        Returns: {
          batch_id: string
          count: number
        }[]
      }
      send_like: {
        Args: { _to_user_id: string; _use_credits?: boolean }
        Returns: {
          already_exists: boolean
          credits_used: boolean
          likes_remaining: number
          match_created: boolean
          new_balance: number
          success: boolean
        }[]
      }
      start_user_match: { Args: { _match_id: string }; Returns: undefined }
      sync_champion_title_counters: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      sync_elo_milestone_titles: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      tournament_heartbeat: {
        Args: { _tournament_id: string }
        Returns: undefined
      }
      unlock_admin_panels: { Args: { p_password: string }; Returns: boolean }
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
