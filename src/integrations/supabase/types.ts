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
      access_review_items: {
        Row: {
          action_taken: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          review_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          user_id: string | null
          user_role: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          review_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
          user_role: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          review_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          user_id?: string | null
          user_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_review_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_review_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "access_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      access_reviews: {
        Row: {
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          organization_id: string | null
          review_period_end: string | null
          review_period_start: string | null
          review_type: string | null
          reviewer_id: string | null
          status: string | null
        }
        Insert: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: string | null
          reviewer_id?: string | null
          status?: string | null
        }
        Update: {
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          review_period_end?: string | null
          review_period_start?: string | null
          review_type?: string | null
          reviewer_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      attachment_folders: {
        Row: {
          case_id: string
          color: string | null
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          organization_id: string
          parent_folder_id: string | null
        }
        Insert: {
          case_id: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          parent_folder_id?: string | null
        }
        Update: {
          case_id?: string
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          parent_folder_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attachment_folders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_folders_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_folders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachment_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "attachment_folders"
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
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          metadata: Json | null
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          backup_type: Database["public"]["Enums"]["backup_type"]
          checksum: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          error_message: string | null
          id: string
          location: string
          retention_expires_at: string
          size_bytes: number | null
          started_at: string
          status: Database["public"]["Enums"]["backup_status"]
        }
        Insert: {
          backup_type: Database["public"]["Enums"]["backup_type"]
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          error_message?: string | null
          id?: string
          location: string
          retention_expires_at: string
          size_bytes?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
        }
        Update: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          checksum?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          error_message?: string | null
          id?: string
          location?: string
          retention_expires_at?: string
          size_bytes?: number | null
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
        }
        Relationships: []
      }
      case_activities: {
        Row: {
          activity_type: string
          address: string | null
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
          address?: string | null
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
          address?: string | null
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
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id: string | null
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
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          folder_id?: string | null
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
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          folder_id?: string | null
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
            foreignKeyName: "case_attachments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "attachment_folders"
            referencedColumns: ["id"]
          },
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
      case_updates: {
        Row: {
          activity_timeline: Json | null
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
          activity_timeline?: Json | null
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
          activity_timeline?: Json | null
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
          case_manager_2_id: string | null
          case_manager_id: string | null
          case_number: string
          closed_at: string | null
          closed_by_user_id: string | null
          contact_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          expedited: boolean | null
          expedited_justification: string | null
          external_record_id: string | null
          external_system_name: string | null
          fee_waiver: boolean | null
          fee_waiver_justification: string | null
          id: string
          import_batch_id: string | null
          import_timestamp: string | null
          instance_number: number
          investigator_ids: string[] | null
          organization_id: string | null
          parent_case_id: string | null
          purpose_of_request: string | null
          reference_number: string | null
          retain_until: string | null
          retention_days: number | null
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
          case_manager_2_id?: string | null
          case_manager_id?: string | null
          case_number: string
          closed_at?: string | null
          closed_by_user_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          expedited?: boolean | null
          expedited_justification?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          fee_waiver?: boolean | null
          fee_waiver_justification?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          instance_number?: number
          investigator_ids?: string[] | null
          organization_id?: string | null
          parent_case_id?: string | null
          purpose_of_request?: string | null
          reference_number?: string | null
          retain_until?: string | null
          retention_days?: number | null
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
          case_manager_2_id?: string | null
          case_manager_id?: string | null
          case_number?: string
          closed_at?: string | null
          closed_by_user_id?: string | null
          contact_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          expedited?: boolean | null
          expedited_justification?: string | null
          external_record_id?: string | null
          external_system_name?: string | null
          fee_waiver?: boolean | null
          fee_waiver_justification?: string | null
          id?: string
          import_batch_id?: string | null
          import_timestamp?: string | null
          instance_number?: number
          investigator_ids?: string[] | null
          organization_id?: string | null
          parent_case_id?: string | null
          purpose_of_request?: string | null
          reference_number?: string | null
          retain_until?: string | null
          retention_days?: number | null
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
            foreignKeyName: "cases_case_manager_2_id_fkey"
            columns: ["case_manager_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      change_log: {
        Row: {
          change_type: string
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          impact_level: string | null
          ticket_reference: string | null
          title: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          impact_level?: string | null
          ticket_reference?: string | null
          title: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          impact_level?: string | null
          ticket_reference?: string | null
          title?: string
        }
        Relationships: []
      }
      compliance_exports: {
        Row: {
          created_at: string | null
          expires_at: string | null
          export_type: string
          file_path: string | null
          id: string
          requested_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          export_type: string
          file_path?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          export_type?: string
          file_path?: string | null
          id?: string
          requested_by?: string | null
          status?: string | null
        }
        Relationships: []
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
      control_evidence: {
        Row: {
          collected_at: string | null
          collected_by: string | null
          control_id: string | null
          description: string
          evidence_type: string
          file_path: string | null
          id: string
          metadata: Json | null
          source: string
        }
        Insert: {
          collected_at?: string | null
          collected_by?: string | null
          control_id?: string | null
          description: string
          evidence_type: string
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source?: string
        }
        Update: {
          collected_at?: string | null
          collected_by?: string | null
          control_id?: string | null
          description?: string
          evidence_type?: string
          file_path?: string | null
          id?: string
          metadata?: Json | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "control_evidence_control_id_fkey"
            columns: ["control_id"]
            isOneToOne: false
            referencedRelation: "soc2_controls"
            referencedColumns: ["id"]
          },
        ]
      }
      data_subject_requests: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          export_expires_at: string | null
          export_file_path: string | null
          id: string
          organization_id: string
          reason: string | null
          request_type: string
          requested_by: string
          status: string
          subject_email: string | null
          subject_identifier: string
          updated_at: string
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          export_expires_at?: string | null
          export_file_path?: string | null
          id?: string
          organization_id: string
          reason?: string | null
          request_type: string
          requested_by: string
          status?: string
          subject_email?: string | null
          subject_identifier: string
          updated_at?: string
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          export_expires_at?: string | null
          export_file_path?: string | null
          id?: string
          organization_id?: string
          reason?: string | null
          request_type?: string
          requested_by?: string
          status?: string
          subject_email?: string | null
          subject_identifier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_subject_requests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      disaster_events: {
        Row: {
          created_at: string
          declared_at: string
          declared_by: string
          description: string
          id: string
          incident_id: string | null
          lessons_learned: string | null
          outcome_summary: string | null
          recovery_completed_at: string | null
          recovery_started_at: string | null
          severity: Database["public"]["Enums"]["disaster_severity"]
        }
        Insert: {
          created_at?: string
          declared_at?: string
          declared_by: string
          description: string
          id?: string
          incident_id?: string | null
          lessons_learned?: string | null
          outcome_summary?: string | null
          recovery_completed_at?: string | null
          recovery_started_at?: string | null
          severity: Database["public"]["Enums"]["disaster_severity"]
        }
        Update: {
          created_at?: string
          declared_at?: string
          declared_by?: string
          description?: string
          id?: string
          incident_id?: string | null
          lessons_learned?: string | null
          outcome_summary?: string | null
          recovery_completed_at?: string | null
          recovery_started_at?: string | null
          severity?: Database["public"]["Enums"]["disaster_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "disaster_events_declared_by_fkey"
            columns: ["declared_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disaster_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "security_incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_exports: {
        Row: {
          content_hash: string | null
          document_instance_id: string
          export_format: string
          exported_at: string
          exported_by_ip: string | null
          file_size_bytes: number | null
          filename: string
          id: string
          organization_id: string
          storage_path: string | null
          user_id: string
        }
        Insert: {
          content_hash?: string | null
          document_instance_id: string
          export_format: string
          exported_at?: string
          exported_by_ip?: string | null
          file_size_bytes?: number | null
          filename: string
          id?: string
          organization_id: string
          storage_path?: string | null
          user_id: string
        }
        Update: {
          content_hash?: string | null
          document_instance_id?: string
          export_format?: string
          exported_at?: string
          exported_by_ip?: string | null
          file_size_bytes?: number | null
          filename?: string
          id?: string
          organization_id?: string
          storage_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_exports_document_instance_id_fkey"
            columns: ["document_instance_id"]
            isOneToOne: false
            referencedRelation: "document_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_exports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_instances: {
        Row: {
          case_id: string
          case_variables_snapshot: Json | null
          created_at: string | null
          document_type: string
          export_format: string | null
          exported_at: string | null
          generated_at: string | null
          id: string
          org_profile_snapshot: Json | null
          organization_id: string
          rendered_html: string
          state_code: string | null
          template_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          case_id: string
          case_variables_snapshot?: Json | null
          created_at?: string | null
          document_type: string
          export_format?: string | null
          exported_at?: string | null
          generated_at?: string | null
          id?: string
          org_profile_snapshot?: Json | null
          organization_id: string
          rendered_html: string
          state_code?: string | null
          template_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          case_id?: string
          case_variables_snapshot?: Json | null
          created_at?: string | null
          document_type?: string
          export_format?: string | null
          exported_at?: string | null
          generated_at?: string | null
          id?: string
          org_profile_snapshot?: Json | null
          organization_id?: string
          rendered_html?: string
          state_code?: string | null
          template_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_instances_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_instances_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          body: string
          created_at: string | null
          description: string | null
          document_type: string
          id: string
          is_active: boolean | null
          letter_category: string | null
          name: string
          organization_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          letter_category?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          description?: string | null
          document_type?: string
          id?: string
          is_active?: boolean | null
          letter_category?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      docx_templates: {
        Row: {
          case_types: string[] | null
          created_at: string
          description: string | null
          detected_variables: string[] | null
          file_path: string
          filename_template: string | null
          id: string
          is_active: boolean | null
          name: string
          organization_id: string
          role_restriction: string | null
          updated_at: string
          user_id: string
          uses_merge_fields: boolean | null
        }
        Insert: {
          case_types?: string[] | null
          created_at?: string
          description?: string | null
          detected_variables?: string[] | null
          file_path: string
          filename_template?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          organization_id: string
          role_restriction?: string | null
          updated_at?: string
          user_id: string
          uses_merge_fields?: boolean | null
        }
        Update: {
          case_types?: string[] | null
          created_at?: string
          description?: string | null
          detected_variables?: string[] | null
          file_path?: string
          filename_template?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          organization_id?: string
          role_restriction?: string | null
          updated_at?: string
          user_id?: string
          uses_merge_fields?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "docx_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "docx_templates_user_id_fkey"
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
      generated_reports: {
        Row: {
          case_id: string
          generated_at: string
          id: string
          organization_id: string
          output_file_path: string
          template_id: string | null
          title: string
          user_id: string
          variables_used: Json | null
        }
        Insert: {
          case_id: string
          generated_at?: string
          id?: string
          organization_id: string
          output_file_path: string
          template_id?: string | null
          title: string
          user_id: string
          variables_used?: Json | null
        }
        Update: {
          case_id?: string
          generated_at?: string
          id?: string
          organization_id?: string
          output_file_path?: string
          template_id?: string | null
          title?: string
          user_id?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases_with_budget_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "docx_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          related_feature: string | null
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          related_feature?: string | null
          slug: string
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          related_feature?: string | null
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "help_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      help_categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          actor_user_id: string
          created_at: string
          ended_at: string | null
          expires_at: string
          id: string
          reason: string
          session_token: string
          started_at: string
          status: string
          target_organization_id: string
          target_organization_name: string
          target_user_email: string
          target_user_id: string
          target_user_name: string | null
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason: string
          session_token?: string
          started_at?: string
          status?: string
          target_organization_id: string
          target_organization_name: string
          target_user_email: string
          target_user_id: string
          target_user_name?: string | null
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          ended_at?: string | null
          expires_at?: string
          id?: string
          reason?: string
          session_token?: string
          started_at?: string
          status?: string
          target_organization_id?: string
          target_organization_name?: string
          target_user_email?: string
          target_user_id?: string
          target_user_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "impersonation_sessions_target_organization_id_fkey"
            columns: ["target_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      letter_templates: {
        Row: {
          available_bindings: Json
          branding_config_id: string | null
          category: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_system_template: boolean | null
          name: string
          organization_id: string | null
          print_config: Json
          sections: Json
          statutory_injection: Json | null
          updated_at: string | null
          user_id: string
          version: number | null
        }
        Insert: {
          available_bindings?: Json
          branding_config_id?: string | null
          category: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name: string
          organization_id?: string | null
          print_config?: Json
          sections?: Json
          statutory_injection?: Json | null
          updated_at?: string | null
          user_id: string
          version?: number | null
        }
        Update: {
          available_bindings?: Json
          branding_config_id?: string | null
          category?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_system_template?: boolean | null
          name?: string
          organization_id?: string | null
          print_config?: Json
          sections?: Json
          statutory_injection?: Json | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "letter_templates_organization_id_fkey"
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
      organization_deletions: {
        Row: {
          canceled_at: string | null
          canceled_by: string | null
          created_at: string
          id: string
          organization_id: string
          purged_at: string | null
          reason: string
          requested_by: string
          scheduled_for: string | null
          status: string
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          purged_at?: string | null
          reason: string
          requested_by: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          canceled_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          purged_at?: string | null
          reason?: string
          requested_by?: string
          scheduled_for?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_deletions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_domains: {
        Row: {
          created_at: string
          domain: string
          domain_type: string
          id: string
          last_checked_at: string | null
          organization_id: string
          status: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain: string
          domain_type: string
          id?: string
          last_checked_at?: string | null
          organization_id: string
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          domain_type?: string
          id?: string
          last_checked_at?: string | null
          organization_id?: string
          status?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_entitlements_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string | null
          organization_id: string
          overrides: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id: string
          overrides?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string | null
          organization_id?: string
          overrides?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_entitlements_overrides_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_exports: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          expires_at: string | null
          export_type: string
          file_path: string | null
          file_size_bytes: number | null
          id: string
          organization_id: string
          requested_by: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          organization_id: string
          requested_by: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          expires_at?: string | null
          export_type?: string
          file_path?: string | null
          file_size_bytes?: number | null
          id?: string
          organization_id?: string
          requested_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_exports_organization_id_fkey"
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
          revoked_at: string | null
          revoked_by: string | null
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
          revoked_at?: string | null
          revoked_by?: string | null
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
          revoked_at?: string | null
          revoked_by?: string | null
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
      organization_usage: {
        Row: {
          cases_count: number
          organization_id: string
          seats_used: number
          storage_bytes: number
          updated_at: string
        }
        Insert: {
          cases_count?: number
          organization_id: string
          seats_used?: number
          storage_bytes?: number
          updated_at?: string
        }
        Update: {
          cases_count?: number
          organization_id?: string
          seats_used?: number
          storage_bytes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_usage_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
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
          default_retention_days: number
          deleted_at: string | null
          deletion_scheduled_for: string | null
          gdpr_enabled: boolean
          id: string
          is_active: boolean | null
          legal_hold: boolean
          legal_hold_reason: string | null
          legal_hold_set_at: string | null
          legal_hold_set_by: string | null
          logo_url: string | null
          max_users: number | null
          name: string
          retention_days: number
          slug: string | null
          status: string
          storage_used_gb: number | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_subscription_id: string | null
          subdomain: string
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
          default_retention_days?: number
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          gdpr_enabled?: boolean
          id?: string
          is_active?: boolean | null
          legal_hold?: boolean
          legal_hold_reason?: string | null
          legal_hold_set_at?: string | null
          legal_hold_set_by?: string | null
          logo_url?: string | null
          max_users?: number | null
          name: string
          retention_days?: number
          slug?: string | null
          status?: string
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subdomain: string
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
          default_retention_days?: number
          deleted_at?: string | null
          deletion_scheduled_for?: string | null
          gdpr_enabled?: boolean
          id?: string
          is_active?: boolean | null
          legal_hold?: boolean
          legal_hold_reason?: string | null
          legal_hold_set_at?: string | null
          legal_hold_set_by?: string | null
          logo_url?: string | null
          max_users?: number | null
          name?: string
          retention_days?: number
          slug?: string | null
          status?: string
          storage_used_gb?: number | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_subscription_id?: string | null
          subdomain?: string
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
      penetration_tests: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          end_date: string | null
          findings_count_critical: number | null
          findings_count_high: number | null
          findings_count_info: number | null
          findings_count_low: number | null
          findings_count_medium: number | null
          id: string
          notes: string | null
          overall_risk: Database["public"]["Enums"]["risk_level"] | null
          report_file_path: string | null
          scope: string
          start_date: string
          status: Database["public"]["Enums"]["pentest_status"]
          test_type: Database["public"]["Enums"]["pentest_type"]
          vendor_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          findings_count_critical?: number | null
          findings_count_high?: number | null
          findings_count_info?: number | null
          findings_count_low?: number | null
          findings_count_medium?: number | null
          id?: string
          notes?: string | null
          overall_risk?: Database["public"]["Enums"]["risk_level"] | null
          report_file_path?: string | null
          scope: string
          start_date: string
          status?: Database["public"]["Enums"]["pentest_status"]
          test_type: Database["public"]["Enums"]["pentest_type"]
          vendor_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          findings_count_critical?: number | null
          findings_count_high?: number | null
          findings_count_info?: number | null
          findings_count_low?: number | null
          findings_count_medium?: number | null
          id?: string
          notes?: string | null
          overall_risk?: Database["public"]["Enums"]["risk_level"] | null
          report_file_path?: string | null
          scope?: string
          start_date?: string
          status?: Database["public"]["Enums"]["pentest_status"]
          test_type?: Database["public"]["Enums"]["pentest_type"]
          vendor_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "penetration_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      platform_staff: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          role: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      platform_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          platform_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          platform_role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          platform_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          city: string | null
          color: string | null
          company_name: string | null
          created_at: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          department: string | null
          email: string
          full_name: string | null
          id: string
          is_active: boolean | null
          mobile_phone: string | null
          notification_email: boolean | null
          notification_push: boolean | null
          notification_sms: boolean | null
          office_phone: string | null
          state: string | null
          updated_at: string | null
          username: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          color?: string | null
          company_name?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean | null
          mobile_phone?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          office_phone?: string | null
          state?: string | null
          updated_at?: string | null
          username: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          city?: string | null
          color?: string | null
          company_name?: string | null
          created_at?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          mobile_phone?: string | null
          notification_email?: boolean | null
          notification_push?: boolean | null
          notification_sms?: boolean | null
          office_phone?: string | null
          state?: string | null
          updated_at?: string | null
          username?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      recovery_objectives: {
        Row: {
          backup_retention_days: number
          id: string
          restore_test_frequency_days: number
          rpo_hours: number
          rto_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          backup_retention_days?: number
          id?: string
          restore_test_frequency_days?: number
          rpo_hours?: number
          rto_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          backup_retention_days?: number
          id?: string
          restore_test_frequency_days?: number
          rpo_hours?: number
          rto_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_objectives_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_subdomains: {
        Row: {
          created_at: string
          reason: string | null
          subdomain: string
        }
        Insert: {
          created_at?: string
          reason?: string | null
          subdomain: string
        }
        Update: {
          created_at?: string
          reason?: string | null
          subdomain?: string
        }
        Relationships: []
      }
      restore_tests: {
        Row: {
          backup_id: string | null
          completed_at: string | null
          created_at: string
          environment: Database["public"]["Enums"]["restore_environment"]
          id: string
          notes: string | null
          restore_type: Database["public"]["Enums"]["backup_type"]
          started_at: string
          status: Database["public"]["Enums"]["backup_status"]
          validated_by: string | null
          validation_checklist: Json | null
        }
        Insert: {
          backup_id?: string | null
          completed_at?: string | null
          created_at?: string
          environment?: Database["public"]["Enums"]["restore_environment"]
          id?: string
          notes?: string | null
          restore_type: Database["public"]["Enums"]["backup_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          validated_by?: string | null
          validation_checklist?: Json | null
        }
        Update: {
          backup_id?: string | null
          completed_at?: string | null
          created_at?: string
          environment?: Database["public"]["Enums"]["restore_environment"]
          id?: string
          notes?: string | null
          restore_type?: Database["public"]["Enums"]["backup_type"]
          started_at?: string
          status?: Database["public"]["Enums"]["backup_status"]
          validated_by?: string | null
          validation_checklist?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "restore_tests_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_tests_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      security_incidents: {
        Row: {
          created_at: string | null
          description: string
          detected_at: string | null
          id: string
          incident_number: string | null
          reported_by: string | null
          resolution_summary: string | null
          resolved_at: string | null
          severity: string
          status: string | null
          title: string
        }
        Insert: {
          created_at?: string | null
          description: string
          detected_at?: string | null
          id?: string
          incident_number?: string | null
          reported_by?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title: string
        }
        Update: {
          created_at?: string | null
          description?: string
          detected_at?: string | null
          id?: string
          incident_number?: string | null
          reported_by?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          severity?: string
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      security_reports: {
        Row: {
          description: string
          id: string
          impact_assessment: string | null
          internal_notes: string | null
          linked_vulnerability_id: string | null
          reporter_email: string
          reporter_name: string | null
          status: Database["public"]["Enums"]["security_report_status"]
          steps_to_reproduce: string | null
          submitted_at: string
          triaged_at: string | null
          triaged_by: string | null
        }
        Insert: {
          description: string
          id?: string
          impact_assessment?: string | null
          internal_notes?: string | null
          linked_vulnerability_id?: string | null
          reporter_email: string
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["security_report_status"]
          steps_to_reproduce?: string | null
          submitted_at?: string
          triaged_at?: string | null
          triaged_by?: string | null
        }
        Update: {
          description?: string
          id?: string
          impact_assessment?: string | null
          internal_notes?: string | null
          linked_vulnerability_id?: string | null
          reporter_email?: string
          reporter_name?: string | null
          status?: Database["public"]["Enums"]["security_report_status"]
          steps_to_reproduce?: string | null
          submitted_at?: string
          triaged_at?: string | null
          triaged_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_reports_linked_vulnerability_id_fkey"
            columns: ["linked_vulnerability_id"]
            isOneToOne: false
            referencedRelation: "vulnerabilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "security_reports_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      soc2_controls: {
        Row: {
          category: string
          control_code: string
          created_at: string | null
          description: string
          frequency: string | null
          id: string
          implementation_notes: string | null
          is_active: boolean | null
          owner_role: string | null
          title: string
        }
        Insert: {
          category: string
          control_code: string
          created_at?: string | null
          description: string
          frequency?: string | null
          id?: string
          implementation_notes?: string | null
          is_active?: boolean | null
          owner_role?: string | null
          title: string
        }
        Update: {
          category?: string
          control_code?: string
          created_at?: string | null
          description?: string
          frequency?: string | null
          id?: string
          implementation_notes?: string | null
          is_active?: boolean | null
          owner_role?: string | null
          title?: string
        }
        Relationships: []
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
      template_header_footer_config: {
        Row: {
          created_at: string | null
          footer_confidentiality_text: string | null
          footer_show_confidentiality: boolean | null
          footer_show_generated_date: boolean | null
          footer_show_org_name: boolean | null
          footer_show_page_number: boolean | null
          footer_show_phone: boolean | null
          footer_show_website: boolean | null
          header_show_case_number: boolean | null
          header_show_logo: boolean | null
          header_show_org_address: boolean | null
          header_show_org_email: boolean | null
          header_show_org_name: boolean | null
          header_show_org_phone: boolean | null
          header_show_report_date: boolean | null
          header_show_report_title: boolean | null
          id: string
          organization_id: string
          template_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          footer_confidentiality_text?: string | null
          footer_show_confidentiality?: boolean | null
          footer_show_generated_date?: boolean | null
          footer_show_org_name?: boolean | null
          footer_show_page_number?: boolean | null
          footer_show_phone?: boolean | null
          footer_show_website?: boolean | null
          header_show_case_number?: boolean | null
          header_show_logo?: boolean | null
          header_show_org_address?: boolean | null
          header_show_org_email?: boolean | null
          header_show_org_name?: boolean | null
          header_show_org_phone?: boolean | null
          header_show_report_date?: boolean | null
          header_show_report_title?: boolean | null
          id?: string
          organization_id: string
          template_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          footer_confidentiality_text?: string | null
          footer_show_confidentiality?: boolean | null
          footer_show_generated_date?: boolean | null
          footer_show_org_name?: boolean | null
          footer_show_page_number?: boolean | null
          footer_show_phone?: boolean | null
          footer_show_website?: boolean | null
          header_show_case_number?: boolean | null
          header_show_logo?: boolean | null
          header_show_org_address?: boolean | null
          header_show_org_email?: boolean | null
          header_show_org_name?: boolean | null
          header_show_org_phone?: boolean | null
          header_show_report_date?: boolean | null
          header_show_report_title?: boolean | null
          id?: string
          organization_id?: string
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "template_header_footer_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_center_config: {
        Row: {
          content_markdown: string
          created_at: string
          display_order: number
          id: string
          is_visible: boolean
          last_reviewed_at: string | null
          reviewed_by: string | null
          section: string
          title: string
          updated_at: string
        }
        Insert: {
          content_markdown: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          last_reviewed_at?: string | null
          reviewed_by?: string | null
          section: string
          title: string
          updated_at?: string
        }
        Update: {
          content_markdown?: string
          created_at?: string
          display_order?: number
          id?: string
          is_visible?: boolean
          last_reviewed_at?: string | null
          reviewed_by?: string | null
          section?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_center_config_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      update_attachment_links: {
        Row: {
          attachment_id: string
          id: string
          linked_at: string
          linked_by_user_id: string | null
          organization_id: string
          update_id: string
        }
        Insert: {
          attachment_id: string
          id?: string
          linked_at?: string
          linked_by_user_id?: string | null
          organization_id: string
          update_id: string
        }
        Update: {
          attachment_id?: string
          id?: string
          linked_at?: string
          linked_by_user_id?: string | null
          organization_id?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_attachment_links_attachment_id_fkey"
            columns: ["attachment_id"]
            isOneToOne: false
            referencedRelation: "case_attachments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_attachment_links_linked_by_user_id_fkey"
            columns: ["linked_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_attachment_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "update_attachment_links_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "case_updates"
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
      vulnerabilities: {
        Row: {
          accepted_risk_justification: string | null
          affected_component: string
          closed_at: string | null
          created_at: string
          created_by: string
          cvss_score: number | null
          description: string
          discovered_at: string
          evidence_file_path: string | null
          id: string
          owner_user_id: string | null
          pen_test_id: string | null
          resolution_summary: string | null
          severity: Database["public"]["Enums"]["risk_level"]
          sla_due_at: string | null
          source: Database["public"]["Enums"]["vulnerability_source"]
          status: Database["public"]["Enums"]["vulnerability_status"]
          title: string
          updated_at: string
        }
        Insert: {
          accepted_risk_justification?: string | null
          affected_component: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          cvss_score?: number | null
          description: string
          discovered_at?: string
          evidence_file_path?: string | null
          id?: string
          owner_user_id?: string | null
          pen_test_id?: string | null
          resolution_summary?: string | null
          severity: Database["public"]["Enums"]["risk_level"]
          sla_due_at?: string | null
          source: Database["public"]["Enums"]["vulnerability_source"]
          status?: Database["public"]["Enums"]["vulnerability_status"]
          title: string
          updated_at?: string
        }
        Update: {
          accepted_risk_justification?: string | null
          affected_component?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          cvss_score?: number | null
          description?: string
          discovered_at?: string
          evidence_file_path?: string | null
          id?: string
          owner_user_id?: string | null
          pen_test_id?: string | null
          resolution_summary?: string | null
          severity?: Database["public"]["Enums"]["risk_level"]
          sla_due_at?: string | null
          source?: Database["public"]["Enums"]["vulnerability_source"]
          status?: Database["public"]["Enums"]["vulnerability_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vulnerabilities_pen_test_id_fkey"
            columns: ["pen_test_id"]
            isOneToOne: false
            referencedRelation: "penetration_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      vulnerability_sla_config: {
        Row: {
          id: string
          severity: Database["public"]["Enums"]["risk_level"]
          sla_days: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          severity: Database["public"]["Enums"]["risk_level"]
          sla_days: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          severity?: Database["public"]["Enums"]["risk_level"]
          sla_days?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vulnerability_sla_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      accept_invitation: { Args: { p_token: string }; Returns: Json }
      accept_organization_invite: {
        Args: { invite_token: string }
        Returns: Json
      }
      calculate_vulnerability_sla: {
        Args: { p_severity: string }
        Returns: string
      }
      can_access_case_attachment: {
        Args: { file_path: string }
        Returns: boolean
      }
      can_access_subject_profile_image: {
        Args: { file_path: string }
        Returns: boolean
      }
      can_erase_subject: {
        Args: { p_organization_id: string; p_subject_identifier: string }
        Returns: Json
      }
      cancel_org_deletion: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      check_subdomain_availability: {
        Args: { p_subdomain: string }
        Returns: Json
      }
      collect_audit_evidence: { Args: { p_days?: number }; Returns: Json }
      collect_rls_evidence: { Args: never; Returns: Json }
      complete_access_review: { Args: { p_review_id: string }; Returns: Json }
      complete_disaster_recovery: {
        Args: {
          p_event_id: string
          p_lessons_learned?: string
          p_outcome_summary: string
        }
        Returns: undefined
      }
      complete_pentest: {
        Args: {
          p_findings_critical?: number
          p_findings_high?: number
          p_findings_info?: number
          p_findings_low?: number
          p_findings_medium?: number
          p_overall_risk: string
          p_pentest_id: string
          p_report_file_path?: string
        }
        Returns: undefined
      }
      complete_review_item: {
        Args: { p_action: string; p_item_id: string; p_notes?: string }
        Returns: Json
      }
      create_pentest: {
        Args: {
          p_end_date?: string
          p_notes?: string
          p_scope: string
          p_start_date: string
          p_test_type: string
          p_vendor_name: string
        }
        Returns: string
      }
      create_vulnerability: {
        Args: {
          p_affected_component: string
          p_cvss_score?: number
          p_description: string
          p_owner_user_id?: string
          p_pen_test_id?: string
          p_severity: string
          p_source: string
          p_title: string
        }
        Returns: string
      }
      declare_disaster: {
        Args: {
          p_description: string
          p_incident_id?: string
          p_severity: string
        }
        Returns: string
      }
      end_impersonation: { Args: { p_session_token?: string }; Returns: Json }
      enforce_entitlement: {
        Args: { p_action: string; p_organization_id: string; p_payload?: Json }
        Returns: Json
      }
      get_active_impersonation: { Args: never; Returns: Json }
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
      get_case_retention_days: { Args: { p_case_id: string }; Returns: number }
      get_cases_due_for_retention_purge: {
        Args: never
        Returns: {
          case_id: string
          case_number: string
          organization_id: string
          retain_until: string
          title: string
        }[]
      }
      get_compliance_dashboard: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_disaster_events: {
        Args: { p_limit?: number }
        Returns: {
          declared_at: string
          declared_by_name: string
          description: string
          id: string
          incident_id: string
          outcome_summary: string
          recovery_completed_at: string
          recovery_started_at: string
          severity: string
        }[]
      }
      get_dr_dashboard: { Args: never; Returns: Json }
      get_my_email_change_requests: {
        Args: never
        Returns: {
          completed_at: string
          created_at: string
          expires_at: string
          id: string
          new_email: string
          old_email: string
        }[]
      }
      get_my_password_reset_requests: {
        Args: never
        Returns: {
          completed_at: string
          created_at: string
          email: string
          expires_at: string
          id: string
        }[]
      }
      get_org_offboarding_status: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_organization_entitlements: {
        Args: { p_organization_id: string }
        Returns: Json
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
      get_organizations_due_for_purge: {
        Args: never
        Returns: {
          organization_id: string
          organization_name: string
          scheduled_for: string
        }[]
      }
      get_pending_invites: {
        Args: { p_organization_id: string }
        Returns: {
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by_name: string
          role: string
        }[]
      }
      get_plan_entitlements: { Args: { p_product_id: string }; Returns: Json }
      get_platform_role: { Args: { p_user_id: string }; Returns: string }
      get_recent_backups: {
        Args: { p_limit?: number }
        Returns: {
          backup_type: string
          completed_at: string
          description: string
          id: string
          location: string
          retention_expires_at: string
          size_bytes: number
          started_at: string
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
      get_restore_tests: {
        Args: { p_limit?: number }
        Returns: {
          backup_id: string
          completed_at: string
          environment: string
          id: string
          notes: string
          restore_type: string
          started_at: string
          status: string
          validated_by_name: string
        }[]
      }
      get_security_metrics: { Args: never; Returns: Json }
      get_soc2_dashboard: { Args: never; Returns: Json }
      get_trust_center_admin: {
        Args: never
        Returns: {
          content_markdown: string
          display_order: number
          id: string
          is_visible: boolean
          last_reviewed_at: string
          reviewed_by_name: string
          section: string
          title: string
          updated_at: string
        }[]
      }
      get_user_organization: { Args: { _user_id: string }; Returns: string }
      get_user_organizations: {
        Args: never
        Returns: {
          id: string
          is_current: boolean
          logo_url: string
          name: string
          primary_domain: string
          subdomain: string
        }[]
      }
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
      is_org_active: { Args: { p_organization_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_platform_staff:
        | { Args: never; Returns: boolean }
        | { Args: { p_user_id: string }; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      is_vendor_case_accessible: {
        Args: { _case_id: string; _user_id: string }
        Returns: boolean
      }
      log_backup: {
        Args: {
          p_backup_type: string
          p_checksum?: string
          p_description?: string
          p_location: string
          p_retention_days?: number
          p_size_bytes?: number
          p_status?: string
        }
        Returns: string
      }
      log_platform_change: {
        Args: {
          p_description: string
          p_impact?: string
          p_ticket?: string
          p_title: string
          p_type: string
        }
        Returns: Json
      }
      log_restore_test: {
        Args: {
          p_backup_id?: string
          p_environment?: string
          p_notes?: string
          p_restore_type?: string
          p_status?: string
          p_validation_checklist?: Json
        }
        Returns: string
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
      log_security_incident: {
        Args: { p_description: string; p_severity: string; p_title: string }
        Returns: Json
      }
      process_subject_erasure: { Args: { p_dsr_id: string }; Returns: Json }
      process_subject_export: { Args: { p_dsr_id: string }; Returns: Json }
      provision_tenant: {
        Args: { p_org_name: string; p_subdomain: string }
        Returns: Json
      }
      purge_case_by_retention: { Args: { p_case_id: string }; Returns: Json }
      purge_organization: { Args: { p_organization_id: string }; Returns: Json }
      request_custom_domain: {
        Args: {
          p_domain: string
          p_domain_type?: string
          p_organization_id: string
        }
        Returns: Json
      }
      request_org_deletion: {
        Args: { p_organization_id: string; p_reason: string }
        Returns: Json
      }
      request_org_export: {
        Args: { p_export_type?: string; p_organization_id: string }
        Returns: Json
      }
      resolve_security_incident: {
        Args: { p_id: string; p_resolution: string }
        Returns: Json
      }
      resolve_tenant_by_domain: { Args: { p_hostname: string }; Returns: Json }
      revoke_invitation: { Args: { p_invite_id: string }; Returns: Json }
      set_org_legal_hold: {
        Args: {
          p_enable: boolean
          p_organization_id: string
          p_reason?: string
        }
        Returns: Json
      }
      start_access_review: {
        Args: { p_org_id?: string; p_type?: string }
        Returns: Json
      }
      start_disaster_recovery: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      start_impersonation: {
        Args: {
          p_reason: string
          p_target_org_id: string
          p_target_user_id: string
        }
        Returns: Json
      }
      submit_dsr: {
        Args: {
          p_organization_id: string
          p_reason?: string
          p_request_type: string
          p_subject_email: string
          p_subject_identifier: string
        }
        Returns: Json
      }
      submit_security_report: {
        Args: {
          p_description: string
          p_impact_assessment?: string
          p_reporter_email: string
          p_reporter_name?: string
          p_steps_to_reproduce?: string
        }
        Returns: string
      }
      support_search_users: {
        Args: { p_limit?: number; p_query: string }
        Returns: Json
      }
      triage_security_report: {
        Args: {
          p_internal_notes?: string
          p_linked_vulnerability_id?: string
          p_report_id: string
          p_status: string
        }
        Returns: undefined
      }
      update_org_retention_settings: {
        Args: {
          p_default_retention_days: number
          p_gdpr_enabled: boolean
          p_organization_id: string
        }
        Returns: Json
      }
      update_organization_subscription: {
        Args: {
          p_price_id: string
          p_status: string
          p_stripe_customer_id: string
          p_subscription_id: string
        }
        Returns: Json
      }
      update_recovery_objectives: {
        Args: {
          p_backup_retention_days?: number
          p_restore_test_frequency_days?: number
          p_rpo_hours?: number
          p_rto_hours?: number
        }
        Returns: undefined
      }
      update_trust_center_section: {
        Args: {
          p_content_markdown?: string
          p_is_visible?: boolean
          p_section: string
          p_title?: string
        }
        Returns: undefined
      }
      update_user_role: {
        Args: {
          _new_role: Database["public"]["Enums"]["app_role"]
          _org_id: string
          _user_id: string
        }
        Returns: undefined
      }
      update_vulnerability_status: {
        Args: {
          p_accepted_risk_justification?: string
          p_evidence_file_path?: string
          p_new_status: string
          p_resolution_summary?: string
          p_vulnerability_id: string
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
      verify_tenant_isolation: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "member" | "manager" | "investigator" | "vendor"
      backup_status: "pending" | "running" | "success" | "failed"
      backup_type: "database" | "storage" | "config"
      disaster_severity: "minor" | "major" | "critical"
      pentest_status: "planned" | "in_progress" | "completed" | "cancelled"
      pentest_type:
        | "external"
        | "internal"
        | "web_app"
        | "api"
        | "mobile"
        | "social_engineering"
      restore_environment: "staging" | "isolated" | "production"
      risk_level: "informational" | "low" | "medium" | "high" | "critical"
      security_report_status:
        | "new"
        | "triaged"
        | "accepted"
        | "rejected"
        | "duplicate"
      vulnerability_source:
        | "pentest"
        | "scanner"
        | "responsible_disclosure"
        | "internal"
        | "customer_report"
      vulnerability_status:
        | "open"
        | "in_progress"
        | "mitigated"
        | "accepted_risk"
        | "closed"
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
      backup_status: ["pending", "running", "success", "failed"],
      backup_type: ["database", "storage", "config"],
      disaster_severity: ["minor", "major", "critical"],
      pentest_status: ["planned", "in_progress", "completed", "cancelled"],
      pentest_type: [
        "external",
        "internal",
        "web_app",
        "api",
        "mobile",
        "social_engineering",
      ],
      restore_environment: ["staging", "isolated", "production"],
      risk_level: ["informational", "low", "medium", "high", "critical"],
      security_report_status: [
        "new",
        "triaged",
        "accepted",
        "rejected",
        "duplicate",
      ],
      vulnerability_source: [
        "pentest",
        "scanner",
        "responsible_disclosure",
        "internal",
        "customer_report",
      ],
      vulnerability_status: [
        "open",
        "in_progress",
        "mitigated",
        "accepted_risk",
        "closed",
      ],
    },
  },
} as const
