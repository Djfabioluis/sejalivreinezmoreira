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
      wa_conversas: {
        Row: {
          messages: Json
          phone: string
          updated_at: string
        }
        Insert: {
          messages?: Json
          phone: string
          updated_at?: string
        }
        Update: {
          messages?: Json
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
