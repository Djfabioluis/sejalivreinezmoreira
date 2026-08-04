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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      agendamentos_notif: {
        Row: {
          bemp_appointment_id: string | null
          confirmation_sent_at: string | null
          created_at: string
          id: string
          name: string | null
          phone: string
          professional_name: string | null
          reminder_24h_sent_at: string | null
          salon_id: string | null
          sandbox: boolean
          service_id: string | null
          service_name: string | null
          start_at: string
        }
        Insert: {
          bemp_appointment_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          professional_name?: string | null
          reminder_24h_sent_at?: string | null
          salon_id?: string | null
          sandbox?: boolean
          service_id?: string | null
          service_name?: string | null
          start_at: string
        }
        Update: {
          bemp_appointment_id?: string | null
          confirmation_sent_at?: string | null
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          professional_name?: string | null
          reminder_24h_sent_at?: string | null
          salon_id?: string | null
          sandbox?: boolean
          service_id?: string | null
          service_name?: string | null
          start_at?: string
        }
        Relationships: []
      }
      atendimentos_humanos: {
        Row: {
          canal: string
          created_at: string
          id: string
          motivo: string | null
          nome: string | null
          observacoes: string | null
          phone: string | null
          phone_area_code: string | null
          phone_country_code: string | null
          phone_number: string | null
          resolved_at: string | null
          sandbox: boolean
          status: string
          updated_at: string
        }
        Insert: {
          canal?: string
          created_at?: string
          id?: string
          motivo?: string | null
          nome?: string | null
          observacoes?: string | null
          phone?: string | null
          phone_area_code?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          resolved_at?: string | null
          sandbox?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          canal?: string
          created_at?: string
          id?: string
          motivo?: string | null
          nome?: string | null
          observacoes?: string | null
          phone?: string | null
          phone_area_code?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          resolved_at?: string | null
          sandbox?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      base_conhecimento: {
        Row: {
          conteudo: string
          id: number
          updated_at: string
        }
        Insert: {
          conteudo?: string
          id?: number
          updated_at?: string
        }
        Update: {
          conteudo?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      evo_events: {
        Row: {
          created_at: string | null
          id: string
          instance: string
          message_id: string
          processed_at: string | null
          remote_jid: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance: string
          message_id: string
          processed_at?: string | null
          remote_jid?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance?: string
          message_id?: string
          processed_at?: string | null
          remote_jid?: string | null
          status?: string | null
        }
        Relationships: []
      }
      evo_webhook_logs: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          error_detail: string | null
          event: string
          id: string
          instance: string
          message_id: string | null
          payload: Json | null
          status: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          error_detail?: string | null
          event: string
          id?: string
          instance: string
          message_id?: string | null
          payload?: Json | null
          status: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          error_detail?: string | null
          event?: string
          id?: string
          instance?: string
          message_id?: string | null
          payload?: Json | null
          status?: string
        }
        Relationships: []
      }
      leads_assinatura: {
        Row: {
          cpf: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string
          phone_area_code: string | null
          phone_country_code: string | null
          phone_number: string | null
          plano_id: number | null
          plano_nome: string | null
          sandbox: boolean
          status: string
          updated_at: string
        }
        Insert: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string
          phone_area_code?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          plano_id?: number | null
          plano_nome?: string | null
          sandbox?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          cpf?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string
          phone_area_code?: string | null
          phone_country_code?: string | null
          phone_number?: string | null
          plano_id?: number | null
          plano_nome?: string | null
          sandbox?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      operador_permissoes: {
        Row: {
          created_at: string
          permissoes: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permissoes?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          permissoes?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      operador_permissoes_default: {
        Row: {
          id: number
          permissoes: string[]
          updated_at: string
        }
        Insert: {
          id?: number
          permissoes?: string[]
          updated_at?: string
        }
        Update: {
          id?: number
          permissoes?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      operadores: {
        Row: {
          ativo: boolean
          created_at: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          telefone: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reagendamentos_hist: {
        Row: {
          created_at: string
          id: string
          message_sent: boolean
          message_sent_at: string | null
          message_text: string | null
          name: string | null
          new_appointment_id: string | null
          new_start: string
          old_appointment_id: string | null
          old_start: string | null
          phone: string
          professional_id: string | null
          salon_id: string | null
          sandbox: boolean
          service_id: string | null
          service_name: string | null
          status: string
          warning: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message_sent?: boolean
          message_sent_at?: string | null
          message_text?: string | null
          name?: string | null
          new_appointment_id?: string | null
          new_start: string
          old_appointment_id?: string | null
          old_start?: string | null
          phone: string
          professional_id?: string | null
          salon_id?: string | null
          sandbox?: boolean
          service_id?: string | null
          service_name?: string | null
          status: string
          warning?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message_sent?: boolean
          message_sent_at?: string | null
          message_text?: string | null
          name?: string | null
          new_appointment_id?: string | null
          new_start?: string
          old_appointment_id?: string | null
          old_start?: string | null
          phone?: string
          professional_id?: string | null
          salon_id?: string | null
          sandbox?: boolean
          service_id?: string | null
          service_name?: string | null
          status?: string
          warning?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          price_id: string
          product_id: string
          status: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id: string
          product_id: string
          status?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          price_id?: string
          product_id?: string
          status?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sugestoes_cross_sell: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          limite_por_cliente_dia: number | null
          limite_por_conversa: number | null
          limite_por_servico_dia: number | null
          observacoes: string | null
          ordem: number
          salon_id: string | null
          salon_nome: string | null
          suggested_service_id: string
          suggested_service_nome: string | null
          trigger_service_id: string
          trigger_service_nome: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          limite_por_cliente_dia?: number | null
          limite_por_conversa?: number | null
          limite_por_servico_dia?: number | null
          observacoes?: string | null
          ordem?: number
          salon_id?: string | null
          salon_nome?: string | null
          suggested_service_id: string
          suggested_service_nome?: string | null
          trigger_service_id: string
          trigger_service_nome?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          limite_por_cliente_dia?: number | null
          limite_por_conversa?: number | null
          limite_por_servico_dia?: number | null
          observacoes?: string | null
          ordem?: number
          salon_id?: string | null
          salon_nome?: string | null
          suggested_service_id?: string
          suggested_service_nome?: string | null
          trigger_service_id?: string
          trigger_service_nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sugestoes_registros: {
        Row: {
          created_at: string
          id: string
          observacao: string | null
          phone: string | null
          regra_id: string | null
          salon_id: string | null
          sandbox: boolean
          status: string
          suggested_service_id: string
          suggested_service_nome: string | null
          trigger_service_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          observacao?: string | null
          phone?: string | null
          regra_id?: string | null
          salon_id?: string | null
          sandbox?: boolean
          status?: string
          suggested_service_id: string
          suggested_service_nome?: string | null
          trigger_service_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          observacao?: string | null
          phone?: string | null
          regra_id?: string | null
          salon_id?: string | null
          sandbox?: boolean
          status?: string
          suggested_service_id?: string
          suggested_service_nome?: string | null
          trigger_service_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sugestoes_registros_regra_id_fkey"
            columns: ["regra_id"]
            isOneToOne: false
            referencedRelation: "sugestoes_cross_sell"
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
      wa_agentes: {
        Row: {
          atualizado_em: string
          criado_em: string
          criado_por: string | null
          id: string
          instancia: string
          nome: string
          selected_unit_at: string | null
          selected_unit_by: string | null
          status: string
          telefone: string
          tipo: string
          unidade_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          instancia: string
          nome: string
          selected_unit_at?: string | null
          selected_unit_by?: string | null
          status?: string
          telefone: string
          tipo: string
          unidade_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          id?: string
          instancia?: string
          nome?: string
          selected_unit_at?: string | null
          selected_unit_by?: string | null
          status?: string
          telefone?: string
          tipo?: string
          unidade_id?: string | null
        }
        Relationships: []
      }
      wa_conversas: {
        Row: {
          agent_id: string | null
          contact_name: string | null
          instance: string | null
          last_read_at: string | null
          messages: Json
          phone: string
          phone_number: string | null
          status: string
          unidade_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          contact_name?: string | null
          instance?: string | null
          last_read_at?: string | null
          messages?: Json
          phone: string
          phone_number?: string | null
          status?: string
          unidade_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          contact_name?: string | null
          instance?: string | null
          last_read_at?: string | null
          messages?: Json
          phone?: string
          phone_number?: string | null
          status?: string
          unidade_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wa_conversas_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "wa_agentes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      append_wa_message: {
        Args: {
          p_contact_name?: string
          p_increment_unread?: boolean
          p_instance?: string
          p_message: Json
          p_new_status?: string
          p_phone: string
          p_phone_number?: string
        }
        Returns: undefined
      }
      get_my_permissoes: { Args: never; Returns: string[] }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_any_admin: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
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
      app_role: ["admin", "operador"],
    },
  },
} as const
