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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          allergens: string[] | null
          category: string
          category_id: string | null
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean | null
          is_featured: boolean | null
          low_stock_threshold: number | null
          nutritional_info: Json | null
          preparation_time: number | null
          price: number
          profit_margin: number | null
          sku: string | null
          stock_quantity: number | null
          title: string
        }
        Insert: {
          allergens?: string[] | null
          category: string
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          nutritional_info?: Json | null
          preparation_time?: number | null
          price: number
          profit_margin?: number | null
          sku?: string | null
          stock_quantity?: number | null
          title: string
        }
        Update: {
          allergens?: string[] | null
          category?: string
          category_id?: string | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean | null
          is_featured?: boolean | null
          low_stock_threshold?: number | null
          nutritional_info?: Json | null
          preparation_time?: number | null
          price?: number
          profit_margin?: number | null
          sku?: string | null
          stock_quantity?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          notification_type:
            | Database["public"]["Enums"]["notification_type"]
            | null
          order_id: string | null
          recipient_role: Database["public"]["Enums"]["notification_recipient"]
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null
          order_id?: string | null
          recipient_role: Database["public"]["Enums"]["notification_recipient"]
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          notification_type?:
            | Database["public"]["Enums"]["notification_type"]
            | null
          order_id?: string | null
          recipient_role?: Database["public"]["Enums"]["notification_recipient"]
        }
        Relationships: [
          {
            foreignKeyName: "notifications_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          item_title: string
          menu_item_id: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          id?: string
          item_title: string
          menu_item_id?: string | null
          order_id: string
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          id?: string
          item_title?: string
          menu_item_id?: string | null
          order_id?: string
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          status: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_due_cod: number | null
          amount_paid_online: number | null
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          delivery_charges: number | null
          distance_km: number | null
          id: string
          order_number: string
          order_source: string | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: string
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          pin_location: string | null
          special_instructions: string | null
          subtotal: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_due_cod?: number | null
          amount_paid_online?: number | null
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          delivery_charges?: number | null
          distance_km?: number | null
          id?: string
          order_number: string
          order_source?: string | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          order_type: Database["public"]["Enums"]["order_type"]
          payment_method: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pin_location?: string | null
          special_instructions?: string | null
          subtotal: number
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_due_cod?: number | null
          amount_paid_online?: number | null
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          delivery_charges?: number | null
          distance_km?: number | null
          id?: string
          order_number?: string
          order_source?: string | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          order_type?: Database["public"]["Enums"]["order_type"]
          payment_method?: string
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          pin_location?: string | null
          special_instructions?: string | null
          subtotal?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      revenue_analytics: {
        Row: {
          average_order_value: number | null
          cancelled_orders: number | null
          completed_orders: number | null
          created_at: string
          date: string
          id: string
          payment_methods: Json | null
          profit: number | null
          top_selling_items: Json | null
          total_cost: number | null
          total_orders: number | null
          total_revenue: number | null
        }
        Insert: {
          average_order_value?: number | null
          cancelled_orders?: number | null
          completed_orders?: number | null
          created_at?: string
          date: string
          id?: string
          payment_methods?: Json | null
          profit?: number | null
          top_selling_items?: Json | null
          total_cost?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Update: {
          average_order_value?: number | null
          cancelled_orders?: number | null
          completed_orders?: number | null
          created_at?: string
          date?: string
          id?: string
          payment_methods?: Json | null
          profit?: number | null
          top_selling_items?: Json | null
          total_cost?: number | null
          total_orders?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          menu_item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          new_stock: number
          notes: string | null
          performed_by: string | null
          previous_stock: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          menu_item_id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          new_stock: number
          notes?: string | null
          performed_by?: string | null
          previous_stock: number
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          menu_item_id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          new_stock?: number
          notes?: string | null
          performed_by?: string | null
          previous_stock?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_items"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "customer" | "manager" | "admin"
      movement_type: "purchase" | "sale" | "adjustment" | "waste"
      notification_recipient: "admin" | "manager"
      notification_type: "new_order" | "status_update" | "system"
      order_status:
        | "pending"
        | "approved"
        | "preparing"
        | "ready"
        | "completed"
        | "rejected"
      order_type: "delivery" | "collection"
      payment_status: "pending" | "partial" | "completed"
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
      app_role: ["customer", "manager", "admin"],
      movement_type: ["purchase", "sale", "adjustment", "waste"],
      notification_recipient: ["admin", "manager"],
      notification_type: ["new_order", "status_update", "system"],
      order_status: [
        "pending",
        "approved",
        "preparing",
        "ready",
        "completed",
        "rejected",
      ],
      order_type: ["delivery", "collection"],
      payment_status: ["pending", "partial", "completed"],
    },
  },
} as const
