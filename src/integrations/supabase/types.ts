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
      accounts: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          industry: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          industry?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          industry?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_access: {
        Row: {
          access_count: number
          access_token: string
          attachment_id: string
          attachment_type: string
          created_at: string
          created_by_user_id: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          organization_id: string
          revoked_at: string | null
          revoked_by_user_id: string | null
        }
        Insert: {
          access_count?: number
          access_token?: string
          attachment_id: string
          attachment_type: string
          created_at?: string
          created_by_user_id: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
        }
        Update: {
          access_count?: number
          access_token?: string
          attachment_id?: string
          attachment_type?: string
          created_at?: string
          created_by_user_id?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          organization_id?: string
          revoked_at?: string | null
          revoked_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachment_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      attachment_preview_logs: {
        Row: {
          attachment_id: string
          attachment_type: string
          created_at: string
          id: string
          ip_address: string | null
          organization_id: string
          preview_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          attachment_id: string
          attachment_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id: string
          preview_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          attachment_id?: string
          attachment_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          organization_id?: string
          preview_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachment_preview_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_activities: {
        Row: {
          activity_type: string
          assigned_user_id: string | null
          case_id: string
          completed: boolean | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          event_subtype: string | null
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          organization_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          assigned_user_id?: string | null
          case_id: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_subtype?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          organization_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          assigned_user_id?: string | null
          case_id?: string
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          event_subtype?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          organization_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_activities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_attachments: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          name: string | null
          organization_id: string | null
          preview_generated_at: string | null
          preview_path: string | null
          preview_status: string | null
          tags: string[] | null
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          name?: string | null
          organization_id?: string | null
          preview_generated_at?: string | null
          preview_path?: string | null
          preview_status?: string | null
          tags?: string[] | null
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string | null
          organization_id?: string | null
          preview_generated_at?: string | null
          preview_path?: string | null
          preview_status?: string | null
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_budget_adjustments: {
        Row: {
          adjustment_amount: number | null
          adjustment_type: string
          case_id: string
          created_at: string
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          new_value: number
          organization_id: string
          previous_value: number | null
          reason: string
          user_id: string
        }
        Insert: {
          adjustment_amount?: number | null
          adjustment_type: string
          case_id: string
          created_at?: string
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          new_value: number
          organization_id: string
          previous_value?: number | null
          reason: string
          user_id: string
        }
        Update: {
          adjustment_amount?: number | null
          adjustment_type?: string
          case_id?: string
          created_at?: string
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          new_value?: number
          organization_id?: string
          previous_value?: number | null
          reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_budget_adjustments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_budget_adjustments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_budget_adjustments_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_budget_adjustments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_budget_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_finances: {
        Row: {
          activity_id: string | null
          amount: number
          billing_frequency: string | null
          case_id: string
          category: string | null
          created_at: string
          date: string
          description: string
          due_date: string | null
          end_date: string | null
          external_record_id: string | null
          external_system_name: string | null
          finance_type: string
          hourly_rate: number | null
          hours: number | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          invoice_id: string | null
          invoice_number: string | null
          invoiced: boolean | null
          notes: string | null
          organization_id: string | null
          quantity: number | null
          start_date: string | null
          status: string | null
          subject_id: string | null
          unit_price: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_id?: string | null
          amount: number
          billing_frequency?: string | null
          case_id: string
          category?: string | null
          created_at?: string
          date?: string
          description: string
          due_date?: string | null
          end_date?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          finance_type: string
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoiced?: boolean | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          start_date?: string | null
          status?: string | null
          subject_id?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_id?: string | null
          amount?: number
          billing_frequency?: string | null
          case_id?: string
          category?: string | null
          created_at?: string
          date?: string
          description?: string
          due_date?: string | null
          end_date?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          finance_type?: string
          hourly_rate?: number | null
          hours?: number | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          invoice_id?: string | null
          invoice_number?: string | null
          invoiced?: boolean | null
          notes?: string | null
          organization_id?: string | null
          quantity?: number | null
          start_date?: string | null
          status?: string | null
          subject_id?: string | null
          unit_price?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_finances_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "case_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_finances_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_finances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_finances_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "case_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      case_subjects: {
        Row: {
          case_id: string
          created_at: string
          details: Json | null
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          is_primary: boolean | null
          name: string
          notes: string | null
          organization_id: string
          profile_image_url: string | null
          subject_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          details?: Json | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          is_primary?: boolean | null
          name: string
          notes?: string | null
          organization_id: string
          profile_image_url?: string | null
          subject_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          details?: Json | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          is_primary?: boolean | null
          name?: string
          notes?: string | null
          organization_id?: string
          profile_image_url?: string | null
          subject_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_subjects_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_subjects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_update_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_update_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      case_updates: {
        Row: {
          case_id: string
          created_at: string | null
          description: string | null
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          organization_id: string | null
          title: string
          update_type: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string | null
          description?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          organization_id?: string | null
          title: string
          update_type?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string | null
          description?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          organization_id?: string | null
          title?: string
          update_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_updates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_updates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          account_id: string | null
          budget_dollars: number | null
          budget_hours: number | null
          budget_notes: string | null
          case_manager_id: string | null
          case_number: string
          closed_at: string | null
          closed_by_user_id: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          external_record_id: string | null
          external_system_name: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          instance_number: number
          investigator_ids: string[] | null
          organization_id: string | null
          parent_case_id: string | null
          reference_number: string | null
          status: string
          title: string
          updated_at: string | null
          use_primary_subject_as_title: boolean | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          budget_dollars?: number | null
          budget_hours?: number | null
          budget_notes?: string | null
          case_manager_id?: string | null
          case_number: string
          closed_at?: string | null
          closed_by_user_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          instance_number?: number
          investigator_ids?: string[] | null
          organization_id?: string | null
          parent_case_id?: string | null
          reference_number?: string | null
          status?: string
          title: string
          updated_at?: string | null
          use_primary_subject_as_title?: boolean | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          budget_dollars?: number | null
          budget_hours?: number | null
          budget_notes?: string | null
          case_manager_id?: string | null
          case_number?: string
          closed_at?: string | null
          closed_by_user_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          instance_number?: number
          investigator_ids?: string[] | null
          organization_id?: string | null
          parent_case_id?: string | null
          reference_number?: string | null
          status?: string
          title?: string
          updated_at?: string | null
          use_primary_subject_as_title?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_case_manager_id_fkey"
            columns: ["case_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string | null
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          external_record_id: string | null
          external_system_name: string | null
          first_name: string
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          last_name: string
          notes: string | null
          organization_id: string
          phone: string | null
          state: string | null
          updated_at: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          account_id?: string | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          first_name: string
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          last_name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          account_id?: string | null
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          first_name?: string
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          last_name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_change_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          expires_at: string
          id: string
          new_email: string
          old_email: string
          token: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          new_email: string
          old_email: string
          token: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          new_email?: string
          old_email?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          completed_at: string | null
          created_at: string
          error_log: Json | null
          failed_records: number
          id: string
          mapping_config: Json | null
          normalization_log: Json | null
          organization_id: string
          processed_records: number
          source_system: string
          source_system_name: string | null
          started_at: string | null
          status: string
          total_records: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_records?: number
          id?: string
          mapping_config?: Json | null
          normalization_log?: Json | null
          organization_id: string
          processed_records?: number
          source_system: string
          source_system_name?: string | null
          started_at?: string | null
          status?: string
          total_records?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_log?: Json | null
          failed_records?: number
          id?: string
          mapping_config?: Json | null
          normalization_log?: Json | null
          organization_id?: string
          processed_records?: number
          source_system?: string
          source_system_name?: string | null
          started_at?: string | null
          status?: string
          total_records?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_batches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_errors: {
        Row: {
          batch_id: string
          created_at: string
          entity_type: string
          error_code: string
          error_details: Json | null
          error_message: string
          external_record_id: string | null
          id: string
          record_id: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          entity_type: string
          error_code: string
          error_details?: Json | null
          error_message: string
          external_record_id?: string | null
          id?: string
          record_id?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          entity_type?: string
          error_code?: string
          error_details?: Json | null
          error_message?: string
          external_record_id?: string | null
          id?: string
          record_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_errors_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_errors_record_id_fkey"
            columns: ["record_id"]
            isOneToOne: false
            referencedRelation: "import_records"
            referencedColumns: ["id"]
          },
        ]
      }
      import_logs: {
        Row: {
          batch_id: string
          created_at: string
          details: Json | null
          entity_type: string | null
          event_type: string
          external_record_id: string | null
          id: string
          message: string
        }
        Insert: {
          batch_id: string
          created_at?: string
          details?: Json | null
          entity_type?: string | null
          event_type: string
          external_record_id?: string | null
          id?: string
          message: string
        }
        Update: {
          batch_id?: string
          created_at?: string
          details?: Json | null
          entity_type?: string | null
          event_type?: string
          external_record_id?: string | null
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_logs_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_records: {
        Row: {
          batch_id: string
          casewyze_id: string | null
          created_at: string
          entity_type: string
          error_message: string | null
          external_record_id: string
          id: string
          source_data: Json
          status: string
        }
        Insert: {
          batch_id: string
          casewyze_id?: string | null
          created_at?: string
          entity_type: string
          error_message?: string | null
          external_record_id: string
          id?: string
          source_data: Json
          status?: string
        }
        Update: {
          batch_id?: string
          casewyze_id?: string | null
          created_at?: string
          entity_type?: string
          error_message?: string | null
          external_record_id?: string
          id?: string
          source_data?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      import_type_mappings: {
        Row: {
          created_at: string
          id: string
          is_default: boolean | null
          mapping_type: string
          mappings: Json
          name: string
          organization_id: string
          source_system: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          mapping_type: string
          mappings?: Json
          name: string
          organization_id: string
          source_system: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean | null
          mapping_type?: string
          mappings?: Json
          name?: string
          organization_id?: string
          source_system?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_type_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          notes: string | null
          organization_id: string
          payment_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          notes?: string | null
          organization_id: string
          payment_date?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          notes?: string | null
          organization_id?: string
          payment_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance_due: number | null
          case_id: string
          created_at: string
          date: string
          due_date: string | null
          id: string
          invoice_number: string
          notes: string | null
          organization_id: string | null
          retainer_applied: number | null
          status: string
          total: number
          total_paid: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance_due?: number | null
          case_id: string
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          invoice_number: string
          notes?: string | null
          organization_id?: string | null
          retainer_applied?: number | null
          status?: string
          total: number
          total_paid?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance_due?: number | null
          case_id?: string
          created_at?: string
          date?: string
          due_date?: string | null
          id?: string
          invoice_number?: string
          notes?: string | null
          organization_id?: string | null
          retainer_applied?: number | null
          status?: string
          total?: number
          total_paid?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          link: string | null
          message: string
          organization_id: string
          priority: string | null
          read: boolean
          related_id: string | null
          related_type: string | null
          timestamp: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link?: string | null
          message: string
          organization_id: string
          priority?: string | null
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          timestamp?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          organization_id?: string
          priority?: string | null
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          timestamp?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_invites_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_settings: {
        Row: {
          address: string | null
          agency_license_number: string | null
          billing_email: string | null
          city: string | null
          company_name: string | null
          created_at: string | null
          default_currency: string | null
          email: string | null
          email_signature: string | null
          fein_number: string | null
          id: string
          logo_url: string | null
          organization_id: string
          phone: string | null
          sender_email: string | null
          signature_email: string | null
          signature_name: string | null
          signature_phone: string | null
          signature_title: string | null
          square_logo_url: string | null
          state: string | null
          terms: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
          website_url: string | null
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          agency_license_number?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          email_signature?: string | null
          fein_number?: string | null
          id?: string
          logo_url?: string | null
          organization_id: string
          phone?: string | null
          sender_email?: string | null
          signature_email?: string | null
          signature_name?: string | null
          signature_phone?: string | null
          signature_title?: string | null
          square_logo_url?: string | null
          state?: string | null
          terms?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          agency_license_number?: string | null
          billing_email?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string | null
          default_currency?: string | null
          email?: string | null
          email_signature?: string | null
          fein_number?: string | null
          id?: string
          logo_url?: string | null
          organization_id?: string
          phone?: string | null
          sender_email?: string | null
          signature_email?: string | null
          signature_name?: string | null
          signature_phone?: string | null
          signature_title?: string | null
          square_logo_url?: string | null
          state?: string | null
          terms?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string | null
          created_at: string
          current_users_count: number | null
          id: string
          logo_url: string | null
          max_users: number | null
          name: string
          slug: string | null
          storage_used_gb: number | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_product_id: string | null
          subscription_status: string | null
          subscription_tier: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          current_users_count?: number | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name: string
          slug?: string | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          current_users_count?: number | null
          id?: string
          logo_url?: string | null
          max_users?: number | null
          name?: string
          slug?: string | null
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_product_id?: string | null
          subscription_status?: string | null
          subscription_tier?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      password_reset_requests: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          allowed: boolean
          created_at: string
          feature_key: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          created_at?: string
          feature_key: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          created_at?: string
          feature_key?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      picklists: {
        Row: {
          color: string | null
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          organization_id: string | null
          status_type: string | null
          type: string
          updated_at: string
          user_id: string
          value: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          status_type?: string | null
          type: string
          updated_at?: string
          user_id: string
          value: string
        }
        Update: {
          color?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          organization_id?: string | null
          status_type?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "picklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          color: string | null
          company_name: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          updated_at: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          color?: string | null
          company_name?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          updated_at?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          color?: string | null
          company_name?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      report_instances: {
        Row: {
          case_id: string
          case_variables_snapshot: Json
          created_at: string | null
          export_format: string | null
          exported_at: string | null
          generated_at: string
          id: string
          input_hash: string
          org_profile_snapshot: Json
          organization_id: string
          rendered_html: string
          rendered_sections: Json
          template_id: string
          template_snapshot: Json
          title: string
          user_id: string
        }
        Insert: {
          case_id: string
          case_variables_snapshot: Json
          created_at?: string | null
          export_format?: string | null
          exported_at?: string | null
          generated_at?: string
          id?: string
          input_hash: string
          org_profile_snapshot: Json
          organization_id: string
          rendered_html: string
          rendered_sections: Json
          template_id: string
          template_snapshot: Json
          title: string
          user_id: string
        }
        Update: {
          case_id?: string
          case_variables_snapshot?: Json
          created_at?: string | null
          export_format?: string | null
          exported_at?: string | null
          generated_at?: string
          id?: string
          input_hash?: string
          org_profile_snapshot?: Json
          organization_id?: string
          rendered_html?: string
          rendered_sections?: Json
          template_id?: string
          template_snapshot?: Json
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_instances_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_instances_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      retainer_funds: {
        Row: {
          amount: number
          case_id: string
          created_at: string
          id: string
          invoice_id: string | null
          note: string | null
          organization_id: string
          user_id: string
        }
        Insert: {
          amount: number
          case_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          organization_id: string
          user_id: string
        }
        Update: {
          amount?: number
          case_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          note?: string | null
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "retainer_funds_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_funds_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      security_audit_log: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          organization_id: string | null
          target_user_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          organization_id?: string | null
          target_user_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          name: string | null
          organization_id: string
          subject_id: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id?: string
          name?: string | null
          organization_id: string
          subject_id: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          name?: string | null
          organization_id?: string
          subject_id?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_attachments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_attachments_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "case_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      template_sections: {
        Row: {
          collection_config: Json | null
          content: string | null
          created_at: string | null
          display_order: number
          id: string
          is_visible: boolean | null
          section_type: string
          template_id: string
          title: string
          updated_at: string | null
          variable_config: Json | null
        }
        Insert: {
          collection_config?: Json | null
          content?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean | null
          section_type: string
          template_id: string
          title: string
          updated_at?: string | null
          variable_config?: Json | null
        }
        Update: {
          collection_config?: Json | null
          content?: string | null
          created_at?: string | null
          display_order?: number
          id?: string
          is_visible?: boolean | null
          section_type?: string
          template_id?: string
          title?: string
          updated_at?: string | null
          variable_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "template_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      cases_with_budget_summary: {
        Row: {
          account_id: string | null
          budget_dollars: number | null
          budget_dollars_authorized: number | null
          budget_hours: number | null
          budget_hours_authorized: number | null
          budget_notes: string | null
          case_manager_id: string | null
          case_number: string | null
          closed_at: string | null
          closed_by_user_id: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          dollars_consumed: number | null
          dollars_remaining: number | null
          dollars_utilization_pct: number | null
          due_date: string | null
          external_record_id: string | null
          external_system_name: string | null
          hours_consumed: number | null
          hours_remaining: number | null
          hours_utilization_pct: number | null
          id: string | null
          import_batch_id: string | null
          import_timestamp: string | null
          instance_number: number | null
          investigator_ids: string[] | null
          organization_id: string | null
          parent_case_id: string | null
          reference_number: string | null
          status: string | null
          title: string | null
          updated_at: string | null
          use_primary_subject_as_title: boolean | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_case_manager_id_fkey"
            columns: ["case_manager_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_parent_case_id_fkey"
            columns: ["parent_case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      accept_organization_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      can_access_case_attachment: {
        Args: { file_path: string }
        Returns: boolean
      }
      get_case_budget_summary: {
        Args: { p_case_id: string }
        Returns: {
          budget_dollars_authorized: number
          budget_hours_authorized: number
          dollars_consumed: number
          dollars_remaining: number
          dollars_utilization_pct: number
          hours_consumed: number
          hours_remaining: number
          hours_utilization_pct: number
        }[]
      }
      get_organization_users: {
        Args: { org_id: string }
        Returns: {
          created_at: string
          email: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string
        }[]
      }
      get_related_cases: {
        Args: { case_id: string }
        Returns: {
          case_number: string
          closed_at: string
          created_at: string
          id: string
          instance_number: number
          status: string
          title: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"][]
      }
      has_permission: {
        Args: { _feature_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_of_any_org: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      is_vendor_case_accessible: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_ip_address?: unknown
          p_metadata?: Json
          p_organization_id?: string
          p_target_user_id?: string
          p_user_agent?: string
          p_user_id?: string
        }
        Returns: string
      }
      update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _org_id: string
          _user_id: string
        }
        Returns: undefined
      }
      validate_attachment_access: {
        Args: { p_token: string }
        Returns: {
          attachment_id: string
          attachment_type: string
          denial_reason: string
          file_name: string
          file_path: string
          file_type: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member" | "manager" | "investigator" | "vendor"
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
      app_role: ["admin", "member", "manager", "investigator", "vendor"],
    },
  },
} as const
