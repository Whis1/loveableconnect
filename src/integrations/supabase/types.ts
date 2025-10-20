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
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string
          gender: string | null
          id: string
          interests: string[] | null
          is_admin_profile: boolean
          last_active: string | null
          latitude: number | null
          longitude: number | null
          looking_for: string[] | null
          nickname: string
          photos: string[] | null
          relationship_status: string | null
          relationship_type: string | null
          sexual_orientation: string | null
          updated_at: string
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name: string
          gender?: string | null
          id: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string[] | null
          nickname: string
          photos?: string[] | null
          relationship_status?: string | null
          relationship_type?: string | null
          sexual_orientation?: string | null
          updated_at?: string
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          gender?: string | null
          id?: string
          interests?: string[] | null
          is_admin_profile?: boolean
          last_active?: string | null
          latitude?: number | null
          longitude?: number | null
          looking_for?: string[] | null
          nickname?: string
          photos?: string[] | null
          relationship_status?: string | null
          relationship_type?: string | null
          sexual_orientation?: string | null
          updated_at?: string
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
      support_messages: {
        Row: {
          created_at: string
          id: string
          is_admin_response: boolean
          message: string
          read: boolean
          user_email: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_admin_response?: boolean
          message: string
          read?: boolean
          user_email: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_admin_response?: boolean
          message?: string
          read?: boolean
          user_email?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          id: string
          is_premium: boolean
          last_daily_reset: string
          premium_expires_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          is_premium?: boolean
          last_daily_reset?: string
          premium_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          is_premium?: boolean
          last_daily_reset?: string
          premium_expires_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
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
      check_and_reset_user_credits: {
        Args: { _user_id: string }
        Returns: {
          balance: number
          is_premium: boolean
          last_daily_reset: string
        }[]
      }
      deduct_message_credits: {
        Args: { _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_daily_credits: {
        Args: Record<PropertyKey, never>
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
