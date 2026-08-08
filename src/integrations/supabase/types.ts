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
      ai_response_feedback: {
        Row: {
          conversation_id: string | null
          corrected_answer: string | null
          created_at: string
          created_by: string | null
          feedback_type: string
          id: string
          message_id: string | null
          operator_notes: string | null
          rating: number | null
          response_id: string | null
        }
        Insert: {
          conversation_id?: string | null
          corrected_answer?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          id?: string
          message_id?: string | null
          operator_notes?: string | null
          rating?: number | null
          response_id?: string | null
        }
        Update: {
          conversation_id?: string | null
          corrected_answer?: string | null
          created_at?: string
          created_by?: string | null
          feedback_type?: string
          id?: string
          message_id?: string | null
          operator_notes?: string | null
          rating?: number | null
          response_id?: string | null
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
      bemp_idempotency: {
        Row: {
          appointment_id: string
          conversation_id: string | null
          created_at: string | null
          idempotency_key: string
          payload: Json | null
          response: Json | null
        }
        Insert: {
          appointment_id: string
          conversation_id?: string | null
          created_at?: string | null
          idempotency_key: string
          payload?: Json | null
          response?: Json | null
        }
        Update: {
          appointment_id?: string
          conversation_id?: string | null
          created_at?: string | null
          idempotency_key?: string
          payload?: Json | null
          response?: Json | null
        }
        Relationships: []
      }
      crm_customer_pipeline: {
        Row: {
          abandonment_reason: string | null
          assigned_operator: string | null
          conversation_id: string | null
          conversion_score: number | null
          created_at: string | null
          current_stage:
            | Database["public"]["Enums"]["crm_pipeline_stage"]
            | null
          customer_id: string | null
          customer_name: string | null
          followup_attempts: number | null
          followup_status: string | null
          health_recommendation: string | null
          health_score: number
          health_status: string
          id: string
          last_interaction_at: string | null
          last_stage: Database["public"]["Enums"]["crm_pipeline_stage"] | null
          lost_reason: string | null
          next_action: string | null
          next_action_at: string | null
          phone: string
          stage_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          abandonment_reason?: string | null
          assigned_operator?: string | null
          conversation_id?: string | null
          conversion_score?: number | null
          created_at?: string | null
          current_stage?:
            | Database["public"]["Enums"]["crm_pipeline_stage"]
            | null
          customer_id?: string | null
          customer_name?: string | null
          followup_attempts?: number | null
          followup_status?: string | null
          health_recommendation?: string | null
          health_score?: number
          health_status?: string
          id?: string
          last_interaction_at?: string | null
          last_stage?: Database["public"]["Enums"]["crm_pipeline_stage"] | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_at?: string | null
          phone: string
          stage_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          abandonment_reason?: string | null
          assigned_operator?: string | null
          conversation_id?: string | null
          conversion_score?: number | null
          created_at?: string | null
          current_stage?:
            | Database["public"]["Enums"]["crm_pipeline_stage"]
            | null
          customer_id?: string | null
          customer_name?: string | null
          followup_attempts?: number | null
          followup_status?: string | null
          health_recommendation?: string | null
          health_score?: number
          health_status?: string
          id?: string
          last_interaction_at?: string | null
          last_stage?: Database["public"]["Enums"]["crm_pipeline_stage"] | null
          lost_reason?: string | null
          next_action?: string | null
          next_action_at?: string | null
          phone?: string
          stage_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_financial_logs: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          phone: string | null
          professional_name: string | null
          service_name: string | null
          source: string
          unit_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          phone?: string | null
          professional_name?: string | null
          service_name?: string | null
          source: string
          unit_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          phone?: string | null
          professional_name?: string | null
          service_name?: string | null
          source?: string
          unit_name?: string | null
        }
        Relationships: []
      }
      crm_followup_rules: {
        Row: {
          agent_id: string | null
          ai_goal: string | null
          ai_tone: string | null
          allow_promotions: boolean | null
          allowed_days: string[] | null
          conditions_to_stop: string[] | null
          created_at: string
          delay_amount: number
          delay_unit: string
          enabled: boolean
          end_time: string | null
          fixed_message: string | null
          id: string
          max_attempts: number
          message_mode: string
          metadata: Json
          min_interval_minutes: number | null
          name: string
          recipients: string[] | null
          start_time: string | null
          type: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          ai_goal?: string | null
          ai_tone?: string | null
          allow_promotions?: boolean | null
          allowed_days?: string[] | null
          conditions_to_stop?: string[] | null
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          enabled?: boolean
          end_time?: string | null
          fixed_message?: string | null
          id?: string
          max_attempts?: number
          message_mode?: string
          metadata?: Json
          min_interval_minutes?: number | null
          name: string
          recipients?: string[] | null
          start_time?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          ai_goal?: string | null
          ai_tone?: string | null
          allow_promotions?: boolean | null
          allowed_days?: string[] | null
          conditions_to_stop?: string[] | null
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          enabled?: boolean
          end_time?: string | null
          fixed_message?: string | null
          id?: string
          max_attempts?: number
          message_mode?: string
          metadata?: Json
          min_interval_minutes?: number | null
          name?: string
          recipients?: string[] | null
          start_time?: string | null
          type?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_rules_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "wa_agentes"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followup_steps: {
        Row: {
          created_at: string
          delay_amount: number
          delay_unit: string
          fixed_message: string | null
          id: string
          message_mode: string
          rule_id: string
          step_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          fixed_message?: string | null
          id?: string
          message_mode?: string
          rule_id: string
          step_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delay_amount?: number
          delay_unit?: string
          fixed_message?: string | null
          id?: string
          message_mode?: string
          rule_id?: string
          step_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_followup_steps_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_followup_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_followups: {
        Row: {
          attempts: number | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          message_id: string | null
          message_template: string | null
          metadata: Json | null
          next_attempt_at: string | null
          phone: string
          priority: number | null
          reason: string | null
          rule_id: string | null
          scheduled_at: string
          sent_at: string | null
          stage: string
          status: string | null
          step_id: string | null
          updated_at: string | null
        }
        Insert: {
          attempts?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message_id?: string | null
          message_template?: string | null
          metadata?: Json | null
          next_attempt_at?: string | null
          phone: string
          priority?: number | null
          reason?: string | null
          rule_id?: string | null
          scheduled_at: string
          sent_at?: string | null
          stage: string
          status?: string | null
          step_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attempts?: number | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          message_id?: string | null
          message_template?: string | null
          metadata?: Json | null
          next_attempt_at?: string | null
          phone?: string
          priority?: number | null
          reason?: string | null
          rule_id?: string | null
          scheduled_at?: string
          sent_at?: string | null
          stage?: string
          status?: string | null
          step_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_followups_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "crm_followup_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_followups_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "crm_followup_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_opportunities: {
        Row: {
          conversation_id: string | null
          created_at: string
          customer_id: string
          id: string
          metadata: Json
          opportunity_type: string
          priority: number
          recommended_action: string | null
          score: number
          status: string
          trigger: string | null
          updated_at: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          customer_id: string
          id?: string
          metadata?: Json
          opportunity_type: string
          priority?: number
          recommended_action?: string | null
          score?: number
          status?: string
          trigger?: string | null
          updated_at?: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          metadata?: Json
          opportunity_type?: string
          priority?: number
          recommended_action?: string | null
          score?: number
          status?: string
          trigger?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      crm_recommendations: {
        Row: {
          campaign_name: string | null
          confidence: number
          created_at: string | null
          customer_id: string | null
          id: string
          metadata: Json | null
          reason: string
          recommendation_type: string
          service_focus: string | null
          status: string
          suggested_message: string | null
          target_audience: string | null
          unit_id: string | null
        }
        Insert: {
          campaign_name?: string | null
          confidence?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          reason: string
          recommendation_type: string
          service_focus?: string | null
          status?: string
          suggested_message?: string | null
          target_audience?: string | null
          unit_id?: string | null
        }
        Update: {
          campaign_name?: string | null
          confidence?: number
          created_at?: string | null
          customer_id?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          recommendation_type?: string
          service_focus?: string | null
          status?: string
          suggested_message?: string | null
          target_audience?: string | null
          unit_id?: string | null
        }
        Relationships: []
      }
      crm_recoveries: {
        Row: {
          conversation_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          phone: string
          reason: string
          scheduled_at: string | null
          sent_at: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          phone: string
          reason: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          phone?: string
          reason?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      crm_slot_opportunities: {
        Row: {
          created_at: string | null
          end_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          offer_sent_at: string | null
          offered_to_phone: string | null
          professional_id: string | null
          ranking_data: Json | null
          service_id: string | null
          start_at: string
          status: string
          unidade_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          end_at: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          offer_sent_at?: string | null
          offered_to_phone?: string | null
          professional_id?: string | null
          ranking_data?: Json | null
          service_id?: string | null
          start_at: string
          status: string
          unidade_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          end_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          offer_sent_at?: string | null
          offered_to_phone?: string | null
          professional_id?: string | null
          ranking_data?: Json | null
          service_id?: string | null
          start_at?: string
          status?: string
          unidade_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_ai_memory: {
        Row: {
          anonymized_at: string | null
          appointment_summary: Json
          bemp_customer_id: string | null
          communication_preferences: Json
          confidence_score: number
          contact_name: string | null
          created_at: string
          field_sources: Json
          id: string
          important_notes: Json
          last_interaction_at: string | null
          memory_summary: string | null
          memory_version: number
          org_key: string
          pending_topics: Json
          phone_normalized: string
          phone_number: string | null
          preferred_days: Json
          preferred_name: string | null
          preferred_professionals: Json
          preferred_services: Json
          preferred_times: Json
          preferred_unit_id: string | null
          restrictions: Json
          subscription_summary: Json
          updated_at: string
        }
        Insert: {
          anonymized_at?: string | null
          appointment_summary?: Json
          bemp_customer_id?: string | null
          communication_preferences?: Json
          confidence_score?: number
          contact_name?: string | null
          created_at?: string
          field_sources?: Json
          id?: string
          important_notes?: Json
          last_interaction_at?: string | null
          memory_summary?: string | null
          memory_version?: number
          org_key?: string
          pending_topics?: Json
          phone_normalized: string
          phone_number?: string | null
          preferred_days?: Json
          preferred_name?: string | null
          preferred_professionals?: Json
          preferred_services?: Json
          preferred_times?: Json
          preferred_unit_id?: string | null
          restrictions?: Json
          subscription_summary?: Json
          updated_at?: string
        }
        Update: {
          anonymized_at?: string | null
          appointment_summary?: Json
          bemp_customer_id?: string | null
          communication_preferences?: Json
          confidence_score?: number
          contact_name?: string | null
          created_at?: string
          field_sources?: Json
          id?: string
          important_notes?: Json
          last_interaction_at?: string | null
          memory_summary?: string | null
          memory_version?: number
          org_key?: string
          pending_topics?: Json
          phone_normalized?: string
          phone_number?: string | null
          preferred_days?: Json
          preferred_name?: string | null
          preferred_professionals?: Json
          preferred_services?: Json
          preferred_times?: Json
          preferred_unit_id?: string | null
          restrictions?: Json
          subscription_summary?: Json
          updated_at?: string
        }
        Relationships: []
      }
      customer_ai_memory_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          changed_by_source: string | null
          created_at: string
          id: string
          memory_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          changed_by_source?: string | null
          created_at?: string
          id?: string
          memory_id: string
          snapshot: Json
          version: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          changed_by_source?: string | null
          created_at?: string
          id?: string
          memory_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "customer_ai_memory_versions_memory_id_fkey"
            columns: ["memory_id"]
            isOneToOne: false
            referencedRelation: "customer_ai_memory"
            referencedColumns: ["id"]
          },
        ]
      }
      evo_events: {
        Row: {
          assistant_response_id: string | null
          assistant_response_status: string | null
          created_at: string | null
          error_detail: string | null
          id: string
          instance: string
          message_id: string
          payload: Json | null
          processed_at: string | null
          processing_started_at: string | null
          remote_jid: string | null
          status: string | null
          trace_id: string | null
        }
        Insert: {
          assistant_response_id?: string | null
          assistant_response_status?: string | null
          created_at?: string | null
          error_detail?: string | null
          id?: string
          instance: string
          message_id: string
          payload?: Json | null
          processed_at?: string | null
          processing_started_at?: string | null
          remote_jid?: string | null
          status?: string | null
          trace_id?: string | null
        }
        Update: {
          assistant_response_id?: string | null
          assistant_response_status?: string | null
          created_at?: string | null
          error_detail?: string | null
          id?: string
          instance?: string
          message_id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_started_at?: string | null
          remote_jid?: string | null
          status?: string | null
          trace_id?: string | null
        }
        Relationships: []
      }
      evo_media_analysis: {
        Row: {
          created_at: string
          error_detail: string | null
          id: string
          instance: string
          media_hash: string
          message_id: string
          source_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_detail?: string | null
          id?: string
          instance: string
          media_hash?: string
          message_id: string
          source_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_detail?: string | null
          id?: string
          instance?: string
          media_hash?: string
          message_id?: string
          source_type?: string | null
          status?: string
          updated_at?: string
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
      knowledge_suggestions: {
        Row: {
          category: string
          confidence_score: number
          created_at: string
          evidence_summary: string | null
          id: string
          occurrence_count: number
          reviewed_at: string | null
          reviewed_by: string | null
          source_conversation_id: string | null
          status: string
          suggested_content: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          confidence_score?: number
          created_at?: string
          evidence_summary?: string | null
          id?: string
          occurrence_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_conversation_id?: string | null
          status?: string
          suggested_content: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          confidence_score?: number
          created_at?: string
          evidence_summary?: string | null
          id?: string
          occurrence_count?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_conversation_id?: string | null
          status?: string
          suggested_content?: string
          title?: string
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
      promotions: {
        Row: {
          channels: string[] | null
          code: string
          created_at: string | null
          description: string | null
          end_at: string
          id: string
          metadata: Json | null
          organization_id: string | null
          original_price: number | null
          priority: number | null
          promotional_price: number | null
          service_category: string | null
          service_name: string | null
          start_at: string
          status: string | null
          title: string
          unit_id: string | null
          updated_at: string | null
        }
        Insert: {
          channels?: string[] | null
          code: string
          created_at?: string | null
          description?: string | null
          end_at: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          original_price?: number | null
          priority?: number | null
          promotional_price?: number | null
          service_category?: string | null
          service_name?: string | null
          start_at: string
          status?: string | null
          title: string
          unit_id?: string | null
          updated_at?: string | null
        }
        Update: {
          channels?: string[] | null
          code?: string
          created_at?: string | null
          description?: string | null
          end_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
          original_price?: number | null
          priority?: number | null
          promotional_price?: number | null
          service_category?: string | null
          service_name?: string | null
          start_at?: string
          status?: string | null
          title?: string
          unit_id?: string | null
          updated_at?: string | null
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
          ia_ativa: boolean
          id: string
          instancia: string
          last_connection_at: string | null
          nome: string
          selected_unit_at: string | null
          selected_unit_by: string | null
          status: string
          status_conexao: string | null
          telefone: string
          tipo: string
          unidade_id: string | null
        }
        Insert: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          ia_ativa?: boolean
          id?: string
          instancia: string
          last_connection_at?: string | null
          nome: string
          selected_unit_at?: string | null
          selected_unit_by?: string | null
          status?: string
          status_conexao?: string | null
          telefone: string
          tipo: string
          unidade_id?: string | null
        }
        Update: {
          atualizado_em?: string
          criado_em?: string
          criado_por?: string | null
          ia_ativa?: boolean
          id?: string
          instancia?: string
          last_connection_at?: string | null
          nome?: string
          selected_unit_at?: string | null
          selected_unit_by?: string | null
          status?: string
          status_conexao?: string | null
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
          customer_context: Json | null
          instance: string | null
          last_read_at: string | null
          messages: Json
          origin_unit_id: string | null
          phone: string
          phone_number: string | null
          previous_unit_id: string | null
          status: string
          transfer_reason: string | null
          transferred_at: string | null
          transferred_by: string | null
          unidade_id: string | null
          unread_count: number
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          contact_name?: string | null
          customer_context?: Json | null
          instance?: string | null
          last_read_at?: string | null
          messages?: Json
          origin_unit_id?: string | null
          phone: string
          phone_number?: string | null
          previous_unit_id?: string | null
          status?: string
          transfer_reason?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
          unidade_id?: string | null
          unread_count?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          contact_name?: string | null
          customer_context?: Json | null
          instance?: string | null
          last_read_at?: string | null
          messages?: Json
          origin_unit_id?: string | null
          phone?: string
          phone_number?: string | null
          previous_unit_id?: string | null
          status?: string
          transfer_reason?: string | null
          transferred_at?: string | null
          transferred_by?: string | null
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
      wa_conversation_locks: {
        Row: {
          acquired_at: string
          conversation_key: string
          expires_at: string
          trace_id: string
        }
        Insert: {
          acquired_at?: string
          conversation_key: string
          expires_at?: string
          trace_id: string
        }
        Update: {
          acquired_at?: string
          conversation_key?: string
          expires_at?: string
          trace_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acquire_conversation_lock: {
        Args: { p_conversation_key: string; p_trace_id: string }
        Returns: boolean
      }
      append_wa_message: {
        Args: {
          p_contact_name?: string
          p_customer_context?: Json
          p_increment_unread?: boolean
          p_instance?: string
          p_message: Json
          p_new_status?: string
          p_phone: string
          p_phone_number?: string
        }
        Returns: Json
      }
      evo_claim_event: {
        Args: {
          p_instance: string
          p_message_id: string
          p_remote_jid: string
          p_trace_id: string
        }
        Returns: Json
      }
      evo_claim_media: {
        Args: {
          p_instance: string
          p_media_hash: string
          p_message_id: string
          p_source_type: string
        }
        Returns: boolean
      }
      evo_finish_media: {
        Args: {
          p_error: string
          p_instance: string
          p_media_hash: string
          p_message_id: string
          p_status: string
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
      release_conversation_lock: {
        Args: { p_conversation_key: string; p_trace_id: string }
        Returns: undefined
      }
      schedule_customer_followup: {
        Args: {
          p_metadata?: Json
          p_phone: string
          p_reason: string
          p_scheduled_at: string
          p_stage: string
        }
        Returns: string
      }
      transfer_conversation_unit: {
        Args: {
          p_conversation_phone: string
          p_reason?: string
          p_target_unit_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      update_customer_pipeline: {
        Args: {
          p_abandonment_reason?: string
          p_conversation_id?: string
          p_customer_name?: string
          p_next_action?: string
          p_next_action_at?: string
          p_phone: string
          p_stage?: Database["public"]["Enums"]["crm_pipeline_stage"]
        }
        Returns: undefined
      }
      update_wa_message_metadata: {
        Args: {
          p_message_id: string
          p_metadata: Json
          p_phone: string
          p_text: string
        }
        Returns: undefined
      }
      user_has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "operador"
      crm_pipeline_stage:
        | "NOVO_CONTATO"
        | "IDENTIFICANDO_SERVICO"
        | "ESCOLHENDO_UNIDADE"
        | "ESCOLHENDO_PROFISSIONAL"
        | "ESCOLHENDO_DATA"
        | "ESCOLHENDO_HORARIO"
        | "AGUARDANDO_CONFIRMACAO"
        | "AGENDADO"
        | "ATENDIDO"
        | "CANCELADO"
        | "ABANDONADO"
        | "CONVERTIDO"
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
      crm_pipeline_stage: [
        "NOVO_CONTATO",
        "IDENTIFICANDO_SERVICO",
        "ESCOLHENDO_UNIDADE",
        "ESCOLHENDO_PROFISSIONAL",
        "ESCOLHENDO_DATA",
        "ESCOLHENDO_HORARIO",
        "AGUARDANDO_CONFIRMACAO",
        "AGENDADO",
        "ATENDIDO",
        "CANCELADO",
        "ABANDONADO",
        "CONVERTIDO",
      ],
    },
  },
} as const
