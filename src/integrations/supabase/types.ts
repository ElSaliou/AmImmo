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
      accounting_accounts: {
        Row: {
          account_type: string
          active: boolean
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_type: string
          active?: boolean
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_type?: string
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      accounting_entries: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          entry_date: string
          finance_transaction_id: string | null
          id: string
          journal_id: string
          label: string
          notes: string
          reference: string
          sale_id: string | null
          status: Database["public"]["Enums"]["accounting_entry_status"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          finance_transaction_id?: string | null
          id?: string
          journal_id: string
          label: string
          notes?: string
          reference: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["accounting_entry_status"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          entry_date?: string
          finance_transaction_id?: string | null
          id?: string
          journal_id?: string
          label?: string
          notes?: string
          reference?: string
          sale_id?: string | null
          status?: Database["public"]["Enums"]["accounting_entry_status"]
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entries_finance_transaction_id_fkey"
            columns: ["finance_transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_finance_transaction_id_fkey"
            columns: ["finance_transaction_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["finance_transaction_id"]
          },
          {
            foreignKeyName: "accounting_entries_finance_transaction_id_fkey"
            columns: ["finance_transaction_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["finance_transaction_id"]
          },
          {
            foreignKeyName: "accounting_entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "accounting_journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_entry_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          label: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          label: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_entry_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "accounting_entry_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
        ]
      }
      accounting_journals: {
        Row: {
          active: boolean
          code: string
          created_at: string
          id: string
          journal_type: string
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          id?: string
          journal_type?: string
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          id?: string
          journal_type?: string
          name?: string
        }
        Relationships: []
      }
      accounts: {
        Row: {
          code: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          organization_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["account_kind"]
          name: string
          organization_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["account_kind"]
          name?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          changes: Json
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          organization_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          organization_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          changes?: Json
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          organization_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_extensions: {
        Row: {
          accommodation_amount: number
          additional_nights: number
          approved_at: string | null
          booking_id: string
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          fees_amount: number
          id: string
          new_check_out: string
          notes: string
          old_check_out: string
          organization_id: string | null
          payment_percent: number
          requested_at: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          accommodation_amount?: number
          additional_nights: number
          approved_at?: string | null
          booking_id: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fees_amount?: number
          id?: string
          new_check_out: string
          notes?: string
          old_check_out: string
          organization_id?: string | null
          payment_percent?: number
          requested_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          accommodation_amount?: number
          additional_nights?: number
          approved_at?: string | null
          booking_id?: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          fees_amount?: number
          id?: string
          new_check_out?: string
          notes?: string
          old_check_out?: string
          organization_id?: string | null
          payment_percent?: number
          requested_at?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_extensions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_extensions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_nights: {
        Row: {
          adjustment_amount: number
          base_rate: number
          booking_id: string
          created_at: string
          id: string
          nightly_rate: number
          rate_period_id: string | null
          stay_date: string
        }
        Insert: {
          adjustment_amount?: number
          base_rate?: number
          booking_id: string
          created_at?: string
          id?: string
          nightly_rate?: number
          rate_period_id?: string | null
          stay_date: string
        }
        Update: {
          adjustment_amount?: number
          base_rate?: number
          booking_id?: string
          created_at?: string
          id?: string
          nightly_rate?: number
          rate_period_id?: string | null
          stay_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_nights_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_nights_rate_period_id_fkey"
            columns: ["rate_period_id"]
            isOneToOne: false
            referencedRelation: "property_rate_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          accommodation_amount: number
          cancellation_policy_text: string | null
          cancellation_policy_version: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          cleaning_fee: number
          conditions_accepted_at: string | null
          conditions_accepted_by: string | null
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          deposit: number
          discount_amount: number
          external_reference: string | null
          fees: number
          free_cancellation_hours: number | null
          guest_country_of_residence: string | null
          guest_email: string
          guest_id: string | null
          guest_name: string
          guest_phone: string
          guest_special_request: string | null
          guests_count: number
          id: string
          initial_payment_percent: number | null
          late_cancellation_penalty_rate: number | null
          lead_id: string | null
          nightly_price: number
          notes: string
          option_expires_at: string | null
          organization_id: string | null
          payment_due_at: string | null
          payment_plan:
            | Database["public"]["Enums"]["short_rental_payment_plan"]
            | null
          payment_policy_text: string | null
          payment_policy_version: string | null
          property_id: string
          reference: string
          service_fee: number
          source: string
          status: Database["public"]["Enums"]["booking_status"]
          tax_amount: number
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          accommodation_amount?: number
          cancellation_policy_text?: string | null
          cancellation_policy_version?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          cleaning_fee?: number
          conditions_accepted_at?: string | null
          conditions_accepted_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit?: number
          discount_amount?: number
          external_reference?: string | null
          fees?: number
          free_cancellation_hours?: number | null
          guest_country_of_residence?: string | null
          guest_email?: string
          guest_id?: string | null
          guest_name: string
          guest_phone?: string
          guest_special_request?: string | null
          guests_count?: number
          id?: string
          initial_payment_percent?: number | null
          late_cancellation_penalty_rate?: number | null
          lead_id?: string | null
          nightly_price?: number
          notes?: string
          option_expires_at?: string | null
          organization_id?: string | null
          payment_due_at?: string | null
          payment_plan?:
            | Database["public"]["Enums"]["short_rental_payment_plan"]
            | null
          payment_policy_text?: string | null
          payment_policy_version?: string | null
          property_id: string
          reference: string
          service_fee?: number
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          accommodation_amount?: number
          cancellation_policy_text?: string | null
          cancellation_policy_version?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          cleaning_fee?: number
          conditions_accepted_at?: string | null
          conditions_accepted_by?: string | null
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          deposit?: number
          discount_amount?: number
          external_reference?: string | null
          fees?: number
          free_cancellation_hours?: number | null
          guest_country_of_residence?: string | null
          guest_email?: string
          guest_id?: string | null
          guest_name?: string
          guest_phone?: string
          guest_special_request?: string | null
          guests_count?: number
          id?: string
          initial_payment_percent?: number | null
          late_cancellation_penalty_rate?: number | null
          lead_id?: string | null
          nightly_price?: number
          notes?: string
          option_expires_at?: string | null
          organization_id?: string | null
          payment_due_at?: string | null
          payment_plan?:
            | Database["public"]["Enums"]["short_rental_payment_plan"]
            | null
          payment_policy_text?: string | null
          payment_policy_version?: string | null
          property_id?: string
          reference?: string
          service_fee?: number
          source?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tax_amount?: number
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_guest_id_fkey"
            columns: ["guest_id"]
            isOneToOne: false
            referencedRelation: "guests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          city: string
          commune: string
          country: string
          created_at: string
          district: string
          floors: number
          id: string
          latitude: number | null
          longitude: number | null
          name: string
          notes: string
          owner_id: string | null
          total_units: number
          updated_at: string
          zip_code: string
        }
        Insert: {
          address?: string
          city?: string
          commune?: string
          country?: string
          created_at?: string
          district?: string
          floors?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name: string
          notes?: string
          owner_id?: string | null
          total_units?: number
          updated_at?: string
          zip_code?: string
        }
        Update: {
          address?: string
          city?: string
          commune?: string
          country?: string
          created_at?: string
          district?: string
          floors?: number
          id?: string
          latitude?: number | null
          longitude?: number | null
          name?: string
          notes?: string
          owner_id?: string | null
          total_units?: number
          updated_at?: string
          zip_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "buildings_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      buyers: {
        Row: {
          address: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          notes: string
          phone: string | null
          profession: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          notes?: string
          phone?: string | null
          profession?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          notes?: string
          phone?: string | null
          profession?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      commissions: {
        Row: {
          amount: number
          base_amount: number
          booking_id: string | null
          created_at: string
          id: string
          invoice_id: string | null
          kind: Database["public"]["Enums"]["commission_kind"]
          lease_id: string | null
          notes: string
          organization_id: string | null
          owner_id: string | null
          period_end: string | null
          period_start: string | null
          property_id: string | null
          rate: number
          sale_id: string | null
        }
        Insert: {
          amount?: number
          base_amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["commission_kind"]
          lease_id?: string | null
          notes?: string
          organization_id?: string | null
          owner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          property_id?: string | null
          rate?: number
          sale_id?: string | null
        }
        Update: {
          amount?: number
          base_amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          invoice_id?: string | null
          kind?: Database["public"]["Enums"]["commission_kind"]
          lease_id?: string | null
          notes?: string
          organization_id?: string | null
          owner_id?: string | null
          period_end?: string | null
          period_start?: string | null
          property_id?: string | null
          rate?: number
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "commissions_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "commissions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          entity_id: string
          entity_type: string
          file_type: string
          file_url: string
          id: string
          name: string
          uploaded_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          file_type?: string
          file_url: string
          id?: string
          name: string
          uploaded_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          uploaded_at?: string
        }
        Relationships: []
      }
      expense_documents: {
        Row: {
          created_at: string
          document_type: string
          expense_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          document_type?: string
          expense_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          expense_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_payables"
            referencedColumns: ["expense_id"]
          },
          {
            foreignKeyName: "expense_documents_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_parties: {
        Row: {
          active: boolean
          address: string | null
          bank_details: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          mobile_money_details: string | null
          name: string
          notes: string
          party_type: Database["public"]["Enums"]["expense_party_type"]
          phone: string | null
          tax_number: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          mobile_money_details?: string | null
          name: string
          notes?: string
          party_type?: Database["public"]["Enums"]["expense_party_type"]
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string | null
          bank_details?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          mobile_money_details?: string | null
          name?: string
          notes?: string
          party_type?: Database["public"]["Enums"]["expense_party_type"]
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expense_payments: {
        Row: {
          accounting_entry_id: string
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          expense_id: string
          external_reference: string | null
          id: string
          notes: string
          payment_date: string
          payment_method: string
          reference: string
          treasury_account_id: string
        }
        Insert: {
          accounting_entry_id: string
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_id: string
          external_reference?: string | null
          id?: string
          notes?: string
          payment_date?: string
          payment_method: string
          reference: string
          treasury_account_id: string
        }
        Update: {
          accounting_entry_id?: string
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_id?: string
          external_reference?: string | null
          id?: string
          notes?: string
          payment_date?: string
          payment_method?: string
          reference?: string
          treasury_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expense_payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expense_payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_payables"
            referencedColumns: ["expense_id"]
          },
          {
            foreignKeyName: "expense_payments_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "expense_payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
        ]
      }
      expense_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          expense_id: string
          id: string
          new_status: Database["public"]["Enums"]["expense_status"]
          note: string | null
          old_status: Database["public"]["Enums"]["expense_status"] | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          expense_id: string
          id?: string
          new_status: Database["public"]["Enums"]["expense_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["expense_status"] | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          expense_id?: string
          id?: string
          new_status?: Database["public"]["Enums"]["expense_status"]
          note?: string | null
          old_status?: Database["public"]["Enums"]["expense_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_status_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expense_payables"
            referencedColumns: ["expense_id"]
          },
          {
            foreignKeyName: "expense_status_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          amount_paid: number | null
          approved_at: string | null
          approved_by: string | null
          balance_due: number | null
          beneficiary_name: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          category: string
          category_id: string | null
          chargeable_to_owner: boolean
          contract_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          document_number: string | null
          due_date: string | null
          expense_date: string | null
          id: string
          label: string
          maintenance_id: string | null
          maintenance_request_id: string | null
          notes: string | null
          organization_id: string | null
          owner_id: string | null
          party_id: string | null
          property_id: string | null
          receipt_url: string | null
          reference: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          sale_id: string | null
          spent_at: string
          status: Database["public"]["Enums"]["expense_status"]
          updated_at: string | null
        }
        Insert: {
          accounting_entry_id?: string | null
          amount?: number
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          balance_due?: number | null
          beneficiary_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          category_id?: string | null
          chargeable_to_owner?: boolean
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          expense_date?: string | null
          id?: string
          label: string
          maintenance_id?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          party_id?: string | null
          property_id?: string | null
          receipt_url?: string | null
          reference?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          sale_id?: string | null
          spent_at?: string
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string | null
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          balance_due?: number | null
          beneficiary_name?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          category?: string
          category_id?: string | null
          chargeable_to_owner?: boolean
          contract_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          document_number?: string | null
          due_date?: string | null
          expense_date?: string | null
          id?: string
          label?: string
          maintenance_id?: string | null
          maintenance_request_id?: string | null
          notes?: string | null
          organization_id?: string | null
          owner_id?: string | null
          party_id?: string | null
          property_id?: string | null
          receipt_url?: string | null
          reference?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          sale_id?: string | null
          spent_at?: string
          status?: Database["public"]["Enums"]["expense_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expenses_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expenses_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "expense_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_expense_categories: {
        Row: {
          accounting_account_id: string
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          accounting_account_id: string
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          accounting_account_id?: string
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_expense_categories_accounting_account_id_fkey"
            columns: ["accounting_account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          expense_category_id: string | null
          external_reference: string | null
          id: string
          label: string
          notes: string
          organization_id: string | null
          payment_method: string | null
          reference: string
          sale_commission_id: string | null
          sale_id: string | null
          sale_payment_id: string | null
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_category_id?: string | null
          external_reference?: string | null
          id?: string
          label: string
          notes?: string
          organization_id?: string | null
          payment_method?: string | null
          reference: string
          sale_commission_id?: string | null
          sale_id?: string | null
          sale_payment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date?: string
          transaction_type: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          expense_category_id?: string | null
          external_reference?: string | null
          id?: string
          label?: string
          notes?: string
          organization_id?: string | null
          payment_method?: string | null
          reference?: string
          sale_commission_id?: string | null
          sale_id?: string | null
          sale_payment_id?: string | null
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["finance_transaction_status"]
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["finance_transaction_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_expense_category_id_fkey"
            columns: ["expense_category_id"]
            isOneToOne: false
            referencedRelation: "finance_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_sale_commission_id_fkey"
            columns: ["sale_commission_id"]
            isOneToOne: false
            referencedRelation: "sale_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_sale_payment_id_fkey"
            columns: ["sale_payment_id"]
            isOneToOne: false
            referencedRelation: "sale_commission_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      guests: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          id_expiry_date: string | null
          id_number: string | null
          id_type: string | null
          nationality: string | null
          notes: string
          organization_id: string | null
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          id_expiry_date?: string | null
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          notes?: string
          organization_id?: string | null
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          id_expiry_date?: string | null
          id_number?: string | null
          id_type?: string | null
          nationality?: string | null
          notes?: string
          organization_id?: string | null
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guests_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          agent_signature: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["inspection_kind"]
          lease_id: string | null
          meters: Json
          observations: string
          performed_at: string
          photos: string[]
          property_id: string | null
          rooms: Json
          tenant_signature: string | null
        }
        Insert: {
          agent_signature?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["inspection_kind"]
          lease_id?: string | null
          meters?: Json
          observations?: string
          performed_at?: string
          photos?: string[]
          property_id?: string | null
          rooms?: Json
          tenant_signature?: string | null
        }
        Update: {
          agent_signature?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["inspection_kind"]
          lease_id?: string | null
          meters?: Json
          observations?: string
          performed_at?: string
          photos?: string[]
          property_id?: string | null
          rooms?: Json
          tenant_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inspections_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inspections_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          label: string
          quantity: number
          unit_price: number
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id: string
          label: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          label?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_lines_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
        ]
      }
      invoices: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          due_date: string
          id: string
          issue_date: string
          kind: Database["public"]["Enums"]["invoice_kind"]
          lease_id: string | null
          notes: string
          number: string
          organization_id: string | null
          owner_id: string | null
          paid_amount: number
          period_end: string | null
          period_start: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          accounting_entry_id?: string | null
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          issue_date?: string
          kind?: Database["public"]["Enums"]["invoice_kind"]
          lease_id?: string | null
          notes?: string
          number: string
          organization_id?: string | null
          owner_id?: string | null
          paid_amount?: number
          period_end?: string | null
          period_start?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          due_date?: string
          id?: string
          issue_date?: string
          kind?: Database["public"]["Enums"]["invoice_kind"]
          lease_id?: string | null
          notes?: string
          number?: string
          organization_id?: string | null
          owner_id?: string | null
          paid_amount?: number
          period_end?: string | null
          period_start?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "invoices_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "invoices_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          journal: string
          label: string
          organization_id: string | null
          source_id: string | null
          source_table: string | null
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          journal?: string
          label: string
          organization_id?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          journal?: string
          label?: string
          organization_id?: string | null
          source_id?: string | null
          source_table?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string | null
          created_at: string
          credit: number
          debit: number
          entry_id: string
          id: string
          label: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id: string
          id?: string
          label?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          credit?: number
          debit?: number
          entry_id?: string
          id?: string
          label?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          author_id: string | null
          content: string
          created_at: string
          id: string
          kind: string
          lead_id: string
        }
        Insert: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id: string
        }
        Update: {
          author_id?: string | null
          content?: string
          created_at?: string
          id?: string
          kind?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string | null
          budget_max: number | null
          budget_min: number | null
          buyer_id: string | null
          conversion_kind: string | null
          conversion_status: string
          converted_at: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          last_contact_at: string | null
          message: string
          phone: string | null
          property_id: string | null
          search_criteria: string
          source: string
          status: Database["public"]["Enums"]["lead_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          conversion_kind?: string | null
          conversion_status?: string
          converted_at?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          last_contact_at?: string | null
          message?: string
          phone?: string | null
          property_id?: string | null
          search_criteria?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          conversion_kind?: string | null
          conversion_status?: string
          converted_at?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          last_contact_at?: string | null
          message?: string
          phone?: string | null
          property_id?: string | null
          search_criteria?: string
          source?: string
          status?: Database["public"]["Enums"]["lead_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leases: {
        Row: {
          charges: number
          contract_kind: string
          created_at: string
          deposit: number
          document_url: string | null
          due_day: number
          end_date: string | null
          id: string
          management_commission_rate: number
          monthly_rent: number
          notes: string | null
          owner_id: string | null
          periodicity: string
          property_id: string
          reference: string | null
          start_date: string
          status: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          charges?: number
          contract_kind?: string
          created_at?: string
          deposit?: number
          document_url?: string | null
          due_day?: number
          end_date?: string | null
          id?: string
          management_commission_rate?: number
          monthly_rent?: number
          notes?: string | null
          owner_id?: string | null
          periodicity?: string
          property_id: string
          reference?: string | null
          start_date: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          charges?: number
          contract_kind?: string
          created_at?: string
          deposit?: number
          document_url?: string | null
          due_day?: number
          end_date?: string | null
          id?: string
          management_commission_rate?: number
          monthly_rent?: number
          notes?: string | null
          owner_id?: string | null
          periodicity?: string
          property_id?: string
          reference?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["lease_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "leases_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          category: string
          cost: number
          created_at: string
          description: string
          id: string
          payer: string
          photos: string[]
          priority: Database["public"]["Enums"]["maintenance_priority"]
          property_id: string
          resolved_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["maintenance_status"]
          tenant_id: string | null
          title: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          category?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          payer?: string
          photos?: string[]
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id: string
          resolved_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id?: string | null
          title: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          category?: string
          cost?: number
          created_at?: string
          description?: string
          id?: string
          payer?: string
          photos?: string[]
          priority?: Database["public"]["Enums"]["maintenance_priority"]
          property_id?: string
          resolved_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["maintenance_status"]
          tenant_id?: string | null
          title?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      management_settings: {
        Row: {
          created_at: string
          default_management_commission_rate: number
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_management_commission_rate?: number
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_management_commission_rate?: number
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "management_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mandate_properties: {
        Row: {
          created_at: string
          id: string
          mandate_id: string
          property_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          mandate_id: string
          property_id: string
        }
        Update: {
          created_at?: string
          id?: string
          mandate_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandate_properties_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandate_properties_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["mandate_id"]
          },
          {
            foreignKeyName: "mandate_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      mandates: {
        Row: {
          commission_fixed: number
          commission_rate: number
          conditions: string
          created_at: string
          document_url: string | null
          end_date: string | null
          exclusive: boolean
          id: string
          mandate_type: Database["public"]["Enums"]["mandate_type"]
          organization_id: string | null
          owner_id: string
          reference: string
          start_date: string
          status: Database["public"]["Enums"]["mandate_status"]
          updated_at: string
        }
        Insert: {
          commission_fixed?: number
          commission_rate?: number
          conditions?: string
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          exclusive?: boolean
          id?: string
          mandate_type?: Database["public"]["Enums"]["mandate_type"]
          organization_id?: string | null
          owner_id: string
          reference: string
          start_date?: string
          status?: Database["public"]["Enums"]["mandate_status"]
          updated_at?: string
        }
        Update: {
          commission_fixed?: number
          commission_rate?: number
          conditions?: string
          created_at?: string
          document_url?: string | null
          end_date?: string | null
          exclusive?: boolean
          id?: string
          mandate_type?: Database["public"]["Enums"]["mandate_type"]
          organization_id?: string | null
          owner_id?: string
          reference?: string
          start_date?: string
          status?: Database["public"]["Enums"]["mandate_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mandates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "mandates_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_listings: {
        Row: {
          amenities: string[] | null
          available_from: string | null
          bathrooms: number
          bedrooms: number
          charges: number
          city: string
          commune: string
          cover_image: string | null
          currency: string
          description: string
          district: string
          expires_at: string | null
          featured: boolean
          floor: number | null
          furnished: boolean
          id: string
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          price: number
          property_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          published_at: string
          rooms: number
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          surface: number
          title: string
        }
        Insert: {
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          charges?: number
          city?: string
          commune?: string
          cover_image?: string | null
          currency?: string
          description?: string
          district?: string
          expires_at?: string | null
          featured?: boolean
          floor?: number | null
          furnished?: boolean
          id?: string
          latitude?: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          price?: number
          property_id: string
          property_type: Database["public"]["Enums"]["property_type"]
          published_at?: string
          rooms?: number
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          surface?: number
          title: string
        }
        Update: {
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          charges?: number
          city?: string
          commune?: string
          cover_image?: string | null
          currency?: string
          description?: string
          district?: string
          expires_at?: string | null
          featured?: boolean
          floor?: number | null
          furnished?: boolean
          id?: string
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          price?: number
          property_id?: string
          property_type?: Database["public"]["Enums"]["property_type"]
          published_at?: string
          rooms?: number
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          surface?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_listings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      mobile_money_transactions: {
        Row: {
          amount: number
          callback_payload: Json
          created_at: string
          currency: string
          error_message: string | null
          id: string
          payment_id: string | null
          phone: string
          provider: string
          provider_reference: string | null
          status: Database["public"]["Enums"]["mm_status"]
          updated_at: string
        }
        Insert: {
          amount?: number
          callback_payload?: Json
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          payment_id?: string | null
          phone?: string
          provider: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["mm_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          callback_payload?: Json
          created_at?: string
          currency?: string
          error_message?: string | null
          id?: string
          payment_id?: string | null
          phone?: string
          provider?: string
          provider_reference?: string | null
          status?: Database["public"]["Enums"]["mm_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mobile_money_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
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
      organizations: {
        Row: {
          address: string
          created_at: string
          currency: string
          email: string | null
          id: string
          locale: string
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          address?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          currency?: string
          email?: string | null
          id?: string
          locale?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_payout_lines: {
        Row: {
          amount: number
          created_at: string
          id: string
          label: string
          line_kind: string
          payout_id: string
          property_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          label: string
          line_kind?: string
          payout_id: string
          property_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          label?: string
          line_kind?: string
          payout_id?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_payout_lines_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "owner_payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_payout_lines_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_payouts: {
        Row: {
          commission_total: number
          created_at: string
          currency: string
          expense_total: number
          gross_collected: number
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          net_amount: number
          notes: string
          organization_id: string | null
          owner_id: string
          paid_at: string | null
          period_end: string
          period_start: string
          receipt_url: string | null
          reference: string
          status: Database["public"]["Enums"]["payout_status"]
          updated_at: string
        }
        Insert: {
          commission_total?: number
          created_at?: string
          currency?: string
          expense_total?: number
          gross_collected?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          net_amount?: number
          notes?: string
          organization_id?: string | null
          owner_id: string
          paid_at?: string | null
          period_end: string
          period_start: string
          receipt_url?: string | null
          reference: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Update: {
          commission_total?: number
          created_at?: string
          currency?: string
          expense_total?: number
          gross_collected?: number
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          net_amount?: number
          notes?: string
          organization_id?: string | null
          owner_id?: string
          paid_at?: string | null
          period_end?: string
          period_start?: string
          receipt_url?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["payout_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_payouts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_payouts_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_rent_ledger: {
        Row: {
          collected_at: string
          commission_accounting_entry_id: string | null
          commission_amount: number
          commission_rate: number
          commission_source: string | null
          created_at: string
          created_by: string | null
          currency: string
          gross_collected: number
          id: string
          invoice_id: string
          lease_id: string | null
          mandate_id: string | null
          net_owner_amount: number
          organization_id: string | null
          owner_id: string
          payment_id: string
          property_id: string | null
          settled_amount: number
        }
        Insert: {
          collected_at?: string
          commission_accounting_entry_id?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_source?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_collected?: number
          id?: string
          invoice_id: string
          lease_id?: string | null
          mandate_id?: string | null
          net_owner_amount?: number
          organization_id?: string | null
          owner_id: string
          payment_id: string
          property_id?: string | null
          settled_amount?: number
        }
        Update: {
          collected_at?: string
          commission_accounting_entry_id?: string | null
          commission_amount?: number
          commission_rate?: number
          commission_source?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_collected?: number
          id?: string
          invoice_id?: string
          lease_id?: string | null
          mandate_id?: string | null
          net_owner_amount?: number
          organization_id?: string | null
          owner_id?: string
          payment_id?: string
          property_id?: string | null
          settled_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["mandate_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_settlement_items: {
        Row: {
          amount: number
          created_at: string
          id: string
          ledger_id: string
          settlement_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          ledger_id: string
          settlement_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          ledger_id?: string
          settlement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_settlement_items_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "owner_rent_ledger"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlement_items_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "owner_rent_ledger_view"
            referencedColumns: ["ledger_id"]
          },
          {
            foreignKeyName: "owner_settlement_items_ledger_id_fkey"
            columns: ["ledger_id"]
            isOneToOne: false
            referencedRelation: "owner_statement_lines"
            referencedColumns: ["ledger_id"]
          },
          {
            foreignKeyName: "owner_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "owner_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "owner_settlements_view"
            referencedColumns: ["settlement_id"]
          },
          {
            foreignKeyName: "owner_settlement_items_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "owner_statement_settlements"
            referencedColumns: ["settlement_id"]
          },
        ]
      }
      owner_settlements: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          external_reference: string | null
          id: string
          notes: string
          organization_id: string | null
          owner_id: string
          reference: string
          settlement_date: string
          status: string
          treasury_account_id: string
          treasury_movement_id: string | null
        }
        Insert: {
          accounting_entry_id?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          owner_id: string
          reference: string
          settlement_date?: string
          status?: string
          treasury_account_id: string
          treasury_movement_id?: string | null
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          owner_id?: string
          reference?: string
          settlement_date?: string
          status?: string
          treasury_account_id?: string
          treasury_movement_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statement_collection_lines: {
        Row: {
          balance_to_settle: number
          collected_at: string
          commission_amount: number
          commission_rate: number
          commission_source: string | null
          created_at: string
          currency: string
          gross_collected: number
          id: string
          invoice_number: string | null
          ledger_id: string
          net_owner_amount: number
          payment_reference: string | null
          property_id: string | null
          property_title: string | null
          settled_amount: number
          statement_id: string
        }
        Insert: {
          balance_to_settle?: number
          collected_at: string
          commission_amount?: number
          commission_rate?: number
          commission_source?: string | null
          created_at?: string
          currency?: string
          gross_collected?: number
          id?: string
          invoice_number?: string | null
          ledger_id: string
          net_owner_amount?: number
          payment_reference?: string | null
          property_id?: string | null
          property_title?: string | null
          settled_amount?: number
          statement_id: string
        }
        Update: {
          balance_to_settle?: number
          collected_at?: string
          commission_amount?: number
          commission_rate?: number
          commission_source?: string | null
          created_at?: string
          currency?: string
          gross_collected?: number
          id?: string
          invoice_number?: string | null
          ledger_id?: string
          net_owner_amount?: number
          payment_reference?: string | null
          property_id?: string | null
          property_title?: string | null
          settled_amount?: number
          statement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_statement_collection_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "owner_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statement_settlement_lines: {
        Row: {
          amount: number
          created_at: string
          currency: string
          external_reference: string | null
          id: string
          notes: string
          reference: string
          settlement_date: string
          settlement_id: string
          statement_id: string
          treasury_account_name: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string
          reference: string
          settlement_date: string
          settlement_id: string
          statement_id: string
          treasury_account_name?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          external_reference?: string | null
          id?: string
          notes?: string
          reference?: string
          settlement_date?: string
          settlement_id?: string
          statement_id?: string
          treasury_account_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_statement_settlement_lines_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "owner_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statements: {
        Row: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closing_balance: number
          commission_amount: number
          created_at: string
          created_by: string | null
          currency: string
          gross_collected: number
          id: string
          issued_at: string | null
          net_owner_amount: number
          notes: string
          opening_balance: number
          organization_id: string | null
          owner_address: string | null
          owner_city: string | null
          owner_company: string | null
          owner_email: string | null
          owner_id: string
          owner_name: string | null
          owner_phone: string | null
          period_end: string
          period_start: string
          reference: string
          sent_at: string | null
          sent_channel: string | null
          sent_reference: string | null
          sent_to: string | null
          settlements_amount: number
          status: string
          updated_at: string
        }
        Insert: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          closing_balance?: number
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_collected?: number
          id?: string
          issued_at?: string | null
          net_owner_amount?: number
          notes?: string
          opening_balance?: number
          organization_id?: string | null
          owner_address?: string | null
          owner_city?: string | null
          owner_company?: string | null
          owner_email?: string | null
          owner_id: string
          owner_name?: string | null
          owner_phone?: string | null
          period_end: string
          period_start: string
          reference: string
          sent_at?: string | null
          sent_channel?: string | null
          sent_reference?: string | null
          sent_to?: string | null
          settlements_amount?: number
          status?: string
          updated_at?: string
        }
        Update: {
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          closing_balance?: number
          commission_amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          gross_collected?: number
          id?: string
          issued_at?: string | null
          net_owner_amount?: number
          notes?: string
          opening_balance?: number
          organization_id?: string | null
          owner_address?: string | null
          owner_city?: string | null
          owner_company?: string | null
          owner_email?: string | null
          owner_id?: string
          owner_name?: string | null
          owner_phone?: string | null
          period_end?: string
          period_start?: string
          reference?: string
          sent_at?: string | null
          sent_channel?: string | null
          sent_reference?: string | null
          sent_to?: string | null
          settlements_amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_statements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_statements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_statements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          address: string
          bank_account: string | null
          bank_name: string | null
          city: string
          company: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          id_number: string | null
          id_type: string | null
          kind: Database["public"]["Enums"]["owner_kind"]
          management_commission_rate: number | null
          mobile_money_number: string | null
          mobile_money_provider: string | null
          notes: string | null
          phone: string | null
          rccm: string | null
          tax_number: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          bank_account?: string | null
          bank_name?: string | null
          city?: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          kind?: Database["public"]["Enums"]["owner_kind"]
          management_commission_rate?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          notes?: string | null
          phone?: string | null
          rccm?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          bank_account?: string | null
          bank_name?: string | null
          city?: string
          company?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          id_type?: string | null
          kind?: Database["public"]["Enums"]["owner_kind"]
          management_commission_rate?: number | null
          mobile_money_number?: string | null
          mobile_money_provider?: string | null
          notes?: string | null
          phone?: string | null
          rccm?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payment_provider_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          processed_at: string | null
          processing_error: string | null
          processing_status: string
          provider: string
          provider_event_id: string | null
          provider_transaction_id: string | null
          received_at: string
          signature_valid: boolean | null
          transaction_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider: string
          provider_event_id?: string | null
          provider_transaction_id?: string | null
          received_at?: string
          signature_valid?: boolean | null
          transaction_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          processed_at?: string | null
          processing_error?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string | null
          provider_transaction_id?: string | null
          received_at?: string
          signature_valid?: boolean | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_events_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "payment_provider_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_provider_transactions: {
        Row: {
          amount: number
          booking_id: string
          cancelled_at: string | null
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          currency: string
          failed_at: string | null
          failure_code: string | null
          failure_message: string | null
          id: string
          initiated_at: string
          invoice_id: string
          payment_id: string | null
          payment_method: string | null
          provider: string
          provider_reference: string | null
          provider_transaction_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id: string
          cancelled_at?: string | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          initiated_at?: string
          invoice_id: string
          payment_id?: string | null
          payment_method?: string | null
          provider: string
          provider_reference?: string | null
          provider_transaction_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string
          cancelled_at?: string | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          initiated_at?: string
          invoice_id?: string
          payment_id?: string | null
          payment_method?: string | null
          provider?: string
          provider_reference?: string | null
          provider_transaction_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_provider_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_provider_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_provider_transactions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payment_provider_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_id: string | null
          is_refund: boolean
          method: Database["public"]["Enums"]["payment_method"]
          notes: string
          organization_id: string | null
          owner_id: string | null
          paid_at: string
          reference: string
          status: Database["public"]["Enums"]["payment_status"]
          tenant_id: string | null
          treasury_account_id: string | null
          updated_at: string
        }
        Insert: {
          accounting_entry_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string
          organization_id?: string | null
          owner_id?: string | null
          paid_at?: string
          reference: string
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          treasury_account_id?: string | null
          updated_at?: string
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string
          organization_id?: string | null
          owner_id?: string | null
          paid_at?: string
          reference?: string
          status?: Database["public"]["Enums"]["payment_status"]
          tenant_id?: string | null
          treasury_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "payments_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "payments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "payments_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          amenities: string[] | null
          availability_note: string
          availability_reason: string | null
          available_from: string | null
          bathrooms: number
          bedrooms: number
          building_id: string | null
          charges: number
          city: string
          commune: string
          control_required: boolean
          created_at: string
          currency: string
          description: string
          district: string
          featured: boolean
          floor: number | null
          furnished: boolean
          id: string
          internal_notes: string
          latitude: number | null
          listing_type: Database["public"]["Enums"]["listing_type"]
          longitude: number | null
          owner_id: string | null
          price: number
          property_type: Database["public"]["Enums"]["property_type"]
          published: boolean
          published_at: string | null
          reference: string | null
          rooms: number
          slug: string
          status: Database["public"]["Enums"]["property_status"]
          status_changed_at: string
          surface: number
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          amenities?: string[] | null
          availability_note?: string
          availability_reason?: string | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id?: string | null
          charges?: number
          city?: string
          commune?: string
          control_required?: boolean
          created_at?: string
          currency?: string
          description?: string
          district?: string
          featured?: boolean
          floor?: number | null
          furnished?: boolean
          id?: string
          internal_notes?: string
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          owner_id?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          published?: boolean
          published_at?: string | null
          reference?: string | null
          rooms?: number
          slug: string
          status?: Database["public"]["Enums"]["property_status"]
          status_changed_at?: string
          surface?: number
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[] | null
          availability_note?: string
          availability_reason?: string | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id?: string | null
          charges?: number
          city?: string
          commune?: string
          control_required?: boolean
          created_at?: string
          currency?: string
          description?: string
          district?: string
          featured?: boolean
          floor?: number | null
          furnished?: boolean
          id?: string
          internal_notes?: string
          latitude?: number | null
          listing_type?: Database["public"]["Enums"]["listing_type"]
          longitude?: number | null
          owner_id?: string | null
          price?: number
          property_type?: Database["public"]["Enums"]["property_type"]
          published?: boolean
          published_at?: string | null
          reference?: string | null
          rooms?: number
          slug?: string
          status?: Database["public"]["Enums"]["property_status"]
          status_changed_at?: string
          surface?: number
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "properties_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      property_blocks: {
        Row: {
          block_type: string
          created_at: string
          created_by: string | null
          end_date: string
          external_reference: string | null
          id: string
          notes: string
          organization_id: string | null
          property_id: string
          reason: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          end_date: string
          external_reference?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          property_id: string
          reason?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          created_by?: string | null
          end_date?: string
          external_reference?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          property_id?: string
          reason?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_blocks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_blocks_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_panorama: boolean
          position: number
          property_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_panorama?: boolean
          position?: number
          property_id: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_panorama?: boolean
          position?: number
          property_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_images_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_rate_periods: {
        Row: {
          active: boolean
          created_at: string
          end_date: string
          id: string
          minimum_stay: number | null
          name: string
          nightly_rate: number
          priority: number
          property_id: string
          start_date: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          end_date: string
          id?: string
          minimum_stay?: number | null
          name: string
          nightly_rate: number
          priority?: number
          property_id: string
          start_date: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          end_date?: string
          id?: string
          minimum_stay?: number | null
          name?: string
          nightly_rate?: number
          priority?: number
          property_id?: string
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_rate_periods_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          lease_id: string | null
          new_status: Database["public"]["Enums"]["property_status"]
          note: string
          old_status: Database["public"]["Enums"]["property_status"] | null
          property_id: string
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lease_id?: string | null
          new_status: Database["public"]["Enums"]["property_status"]
          note?: string
          old_status?: Database["public"]["Enums"]["property_status"] | null
          property_id: string
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          lease_id?: string | null
          new_status?: Database["public"]["Enums"]["property_status"]
          note?: string
          old_status?: Database["public"]["Enums"]["property_status"] | null
          property_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_status_history_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_status_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_videos: {
        Row: {
          created_at: string
          id: string
          position: number
          property_id: string
          title: string | null
          url: string
          video_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          property_id: string
          title?: string | null
          url: string
          video_type?: string
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          property_id?: string
          title?: string | null
          url?: string
          video_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_videos_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_applications: {
        Row: {
          created_at: string
          email: string
          employer: string | null
          full_name: string
          guarantor_income: number
          guarantor_name: string | null
          guarantor_phone: string | null
          id: string
          id_number: string | null
          lead_id: string | null
          monthly_income: number
          notes: string
          phone: string
          profession: string | null
          property_id: string | null
          status: Database["public"]["Enums"]["application_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          employer?: string | null
          full_name: string
          guarantor_income?: number
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_number?: string | null
          lead_id?: string | null
          monthly_income?: number
          notes?: string
          phone?: string
          profession?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employer?: string | null
          full_name?: string
          guarantor_income?: number
          guarantor_name?: string | null
          guarantor_phone?: string | null
          id?: string
          id_number?: string | null
          lead_id?: string | null
          monthly_income?: number
          notes?: string
          phone?: string
          profession?: string | null
          property_id?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_commission_payments: {
        Row: {
          amount: number
          commission_id: string
          created_at: string
          created_by: string | null
          currency: string
          id: string
          notes: string
          payment_date: string
          payment_method: string | null
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          commission_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          commission_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          notes?: string
          payment_date?: string
          payment_method?: string | null
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_commission_payments_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "sale_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_commission_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_commissions: {
        Row: {
          amount_due: number
          amount_paid: number
          balance_due: number | null
          created_at: string
          currency: string
          due_date: string | null
          id: string
          notes: string
          organization_id: string | null
          paid_at: string | null
          sale_id: string
          status: Database["public"]["Enums"]["sale_commission_status"]
          updated_at: string
        }
        Insert: {
          amount_due?: number
          amount_paid?: number
          balance_due?: number | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          paid_at?: string | null
          sale_id: string
          status?: Database["public"]["Enums"]["sale_commission_status"]
          updated_at?: string
        }
        Update: {
          amount_due?: number
          amount_paid?: number
          balance_due?: number | null
          created_at?: string
          currency?: string
          due_date?: string | null
          id?: string
          notes?: string
          organization_id?: string | null
          paid_at?: string | null
          sale_id?: string
          status?: Database["public"]["Enums"]["sale_commission_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_commissions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_financial_events: {
        Row: {
          accounting_posted: boolean
          accounting_reference: string | null
          amount: number
          commission_id: string | null
          created_at: string
          currency: string
          event_type: string
          id: string
          payload: Json
          payment_id: string | null
          sale_id: string
        }
        Insert: {
          accounting_posted?: boolean
          accounting_reference?: string | null
          amount?: number
          commission_id?: string | null
          created_at?: string
          currency?: string
          event_type: string
          id?: string
          payload?: Json
          payment_id?: string | null
          sale_id: string
        }
        Update: {
          accounting_posted?: boolean
          accounting_reference?: string | null
          amount?: number
          commission_id?: string | null
          created_at?: string
          currency?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_id?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_financial_events_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "sale_commissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_financial_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "sale_commission_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_financial_events_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["sale_status"]
          note: string
          old_status: Database["public"]["Enums"]["sale_status"] | null
          sale_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["sale_status"]
          note?: string
          old_status?: Database["public"]["Enums"]["sale_status"] | null
          sale_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["sale_status"]
          note?: string
          old_status?: Database["public"]["Enums"]["sale_status"] | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_status_history_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          agreed_price: number
          asking_price: number
          buyer_email: string
          buyer_id: string | null
          buyer_name: string
          buyer_phone: string
          closed_at: string | null
          commission_amount: number
          commission_rate: number
          created_at: string
          currency: string
          id: string
          lead_id: string | null
          notes: string
          offered_price: number
          organization_id: string | null
          owner_id: string | null
          property_id: string
          reference: string
          status: Database["public"]["Enums"]["sale_status"]
          updated_at: string
        }
        Insert: {
          agreed_price?: number
          asking_price?: number
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string
          closed_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          notes?: string
          offered_price?: number
          organization_id?: string | null
          owner_id?: string | null
          property_id: string
          reference: string
          status?: Database["public"]["Enums"]["sale_status"]
          updated_at?: string
        }
        Update: {
          agreed_price?: number
          asking_price?: number
          buyer_email?: string
          buyer_id?: string | null
          buyer_name?: string
          buyer_phone?: string
          closed_at?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          id?: string
          lead_id?: string | null
          notes?: string
          offered_price?: number
          organization_id?: string | null
          owner_id?: string | null
          property_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["sale_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "sales_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_transactions: {
        Row: {
          agreement_date: string | null
          buyer_email: string | null
          buyer_id: string | null
          buyer_name: string | null
          buyer_phone: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          currency: string
          document_url: string | null
          id: string
          lead_id: string | null
          notes: string
          owner_id: string | null
          payment_method: string | null
          property_id: string
          reference: string | null
          reservation_date: string | null
          sale_price: number
          status: string
          updated_at: string
        }
        Insert: {
          agreement_date?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          document_url?: string | null
          id?: string
          lead_id?: string | null
          notes?: string
          owner_id?: string | null
          payment_method?: string | null
          property_id: string
          reference?: string | null
          reservation_date?: string | null
          sale_price?: number
          status?: string
          updated_at?: string
        }
        Update: {
          agreement_date?: string | null
          buyer_email?: string | null
          buyer_id?: string | null
          buyer_name?: string | null
          buyer_phone?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          document_url?: string | null
          id?: string
          lead_id?: string | null
          notes?: string
          owner_id?: string | null
          payment_method?: string | null
          property_id?: string
          reference?: string | null
          reservation_date?: string | null
          sale_price?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "buyers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "sales_transactions_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      short_rental_management_terms: {
        Row: {
          active: boolean
          commission_rate: number | null
          created_at: string
          currency: string
          effective_from: string
          effective_to: string | null
          fee_per_booking: number | null
          fixed_monthly_fee: number | null
          id: string
          notes: string
          owner_id: string | null
          pricing_model: string
          property_id: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          commission_rate?: number | null
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          fee_per_booking?: number | null
          fixed_monthly_fee?: number | null
          id?: string
          notes?: string
          owner_id?: string | null
          pricing_model?: string
          property_id: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          commission_rate?: number | null
          created_at?: string
          currency?: string
          effective_from?: string
          effective_to?: string | null
          fee_per_booking?: number | null
          fixed_monthly_fee?: number | null
          id?: string
          notes?: string
          owner_id?: string | null
          pricing_model?: string
          property_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_rental_management_terms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "short_rental_management_terms_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_rental_management_terms_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      short_rental_payment_access: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          last_accessed_at: string | null
          revoked_at: string | null
          token_hash: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          last_accessed_at?: string | null
          revoked_at?: string | null
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_rental_payment_access_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      short_rental_settings: {
        Row: {
          active: boolean
          allow_full_payment: boolean
          balance_required_before_checkin: boolean
          base_nightly_rate: number
          cancellation_policy_version: string
          cleaning_fee: number
          created_at: string
          currency: string
          default_check_in_time: string
          default_check_out_time: string
          extension_allowed: boolean
          extension_payment_percent: number
          free_cancellation_hours: number
          id: string
          instant_booking: boolean
          late_cancellation_penalty_rate: number
          max_guests: number
          maximum_stay: number | null
          minimum_payment_percent: number
          minimum_stay: number
          payment_deadline_hours: number
          payment_policy_version: string
          property_id: string
          security_deposit: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          allow_full_payment?: boolean
          balance_required_before_checkin?: boolean
          base_nightly_rate?: number
          cancellation_policy_version?: string
          cleaning_fee?: number
          created_at?: string
          currency?: string
          default_check_in_time?: string
          default_check_out_time?: string
          extension_allowed?: boolean
          extension_payment_percent?: number
          free_cancellation_hours?: number
          id?: string
          instant_booking?: boolean
          late_cancellation_penalty_rate?: number
          max_guests?: number
          maximum_stay?: number | null
          minimum_payment_percent?: number
          minimum_stay?: number
          payment_deadline_hours?: number
          payment_policy_version?: string
          property_id: string
          security_deposit?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          allow_full_payment?: boolean
          balance_required_before_checkin?: boolean
          base_nightly_rate?: number
          cancellation_policy_version?: string
          cleaning_fee?: number
          created_at?: string
          currency?: string
          default_check_in_time?: string
          default_check_out_time?: string
          extension_allowed?: boolean
          extension_payment_percent?: number
          free_cancellation_hours?: number
          id?: string
          instant_booking?: boolean
          late_cancellation_penalty_rate?: number
          max_guests?: number
          maximum_stay?: number | null
          minimum_payment_percent?: number
          minimum_stay?: number
          payment_deadline_hours?: number
          payment_policy_version?: string
          property_id?: string
          security_deposit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_rental_settings_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          address: string
          created_at: string
          email: string | null
          emergency_contact: string | null
          employer: string | null
          full_name: string
          id: string
          id_number: string | null
          monthly_income: number
          notes: string | null
          phone: string | null
          profession: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          address?: string
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employer?: string | null
          full_name: string
          id?: string
          id_number?: string | null
          monthly_income?: number
          notes?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          address?: string
          created_at?: string
          email?: string | null
          emergency_contact?: string | null
          employer?: string | null
          full_name?: string
          id?: string
          id_number?: string | null
          monthly_income?: number
          notes?: string | null
          phone?: string | null
          profession?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      treasury_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["treasury_account_type"]
          accounting_account_id: string
          active: boolean
          code: string
          created_at: string
          currency: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["treasury_account_type"]
          accounting_account_id: string
          active?: boolean
          code: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["treasury_account_type"]
          accounting_account_id?: string
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_accounts_accounting_account_id_fkey"
            columns: ["accounting_account_id"]
            isOneToOne: false
            referencedRelation: "accounting_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_movements: {
        Row: {
          accounting_entry_id: string | null
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          destination_account_id: string | null
          external_reference: string | null
          id: string
          label: string
          movement_date: string
          movement_type: Database["public"]["Enums"]["treasury_movement_type"]
          notes: string
          reference: string
          source_account_id: string | null
        }
        Insert: {
          accounting_entry_id?: string | null
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_account_id?: string | null
          external_reference?: string | null
          id?: string
          label: string
          movement_date?: string
          movement_type: Database["public"]["Enums"]["treasury_movement_type"]
          notes?: string
          reference: string
          source_account_id?: string | null
        }
        Update: {
          accounting_entry_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          destination_account_id?: string | null
          external_reference?: string | null
          id?: string
          label?: string
          movement_date?: string
          movement_type?: Database["public"]["Enums"]["treasury_movement_type"]
          notes?: string
          reference?: string
          source_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "treasury_movements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "treasury_movements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "treasury_movements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "treasury_movements_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "treasury_movements_destination_account_id_fkey"
            columns: ["destination_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "treasury_movements_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_movements_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "treasury_movements_source_account_id_fkey"
            columns: ["source_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
        ]
      }
      units: {
        Row: {
          amenities: string[]
          area_sqm: number
          available_from: string | null
          bathrooms: number
          bedrooms: number
          building_id: string
          created_at: string
          floor: number
          furnished: boolean
          id: string
          kind: Database["public"]["Enums"]["unit_kind"]
          label: string
          notes: string
          price: number
          rooms: number
          status: Database["public"]["Enums"]["unit_status"]
        }
        Insert: {
          amenities?: string[]
          area_sqm?: number
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id: string
          created_at?: string
          floor?: number
          furnished?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["unit_kind"]
          label: string
          notes?: string
          price?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
        }
        Update: {
          amenities?: string[]
          area_sqm?: number
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id?: string
          created_at?: string
          floor?: number
          furnished?: boolean
          id?: string
          kind?: Database["public"]["Enums"]["unit_kind"]
          label?: string
          notes?: string
          price?: number
          rooms?: number
          status?: Database["public"]["Enums"]["unit_status"]
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          active: boolean
          address: string
          category: string
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          address?: string
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          address?: string
          category?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          lead_id: string | null
          notes: string
          outcome: string
          property_id: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["visit_status"]
          updated_at: string
          visitor_email: string
          visitor_name: string
          visitor_phone: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string
          outcome?: string
          property_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visitor_email?: string
          visitor_name: string
          visitor_phone?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string | null
          notes?: string
          outcome?: string
          property_id?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["visit_status"]
          updated_at?: string
          visitor_email?: string
          visitor_name?: string
          visitor_phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      accounting_entry_balance_check: {
        Row: {
          accounting_entry_id: string | null
          balanced: boolean | null
          currency: string | null
          difference: number | null
          entry_date: string | null
          label: string | null
          reference: string | null
          status: Database["public"]["Enums"]["accounting_entry_status"] | null
          total_credit: number | null
          total_debit: number | null
        }
        Relationships: []
      }
      expense_payables: {
        Row: {
          amount: number | null
          amount_paid: number | null
          balance_due: number | null
          category_id: string | null
          category_name: string | null
          category_slug: string | null
          chargeable_to_owner: boolean | null
          contract_id: string | null
          created_at: string | null
          currency: string | null
          days_until_due: number | null
          description: string | null
          document_number: string | null
          due_date: string | null
          due_state: string | null
          due_state_label: string | null
          expense_date: string | null
          expense_id: string | null
          expense_reference: string | null
          label: string | null
          maintenance_request_id: string | null
          organization_id: string | null
          overdue_days: number | null
          owner_id: string | null
          owner_name: string | null
          party_id: string | null
          property_id: string | null
          property_title: string | null
          sale_id: string | null
          sale_reference: string | null
          status: Database["public"]["Enums"]["expense_status"] | null
          supplier_company_name: string | null
          supplier_contact_name: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_phone: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_maintenance_request_id_fkey"
            columns: ["maintenance_request_id"]
            isOneToOne: false
            referencedRelation: "maintenance_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "expenses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "expense_parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_payables_kpis: {
        Row: {
          due_soon_amount: number | null
          due_soon_expense_count: number | null
          open_expense_count: number | null
          overdue_amount: number | null
          overdue_expense_count: number | null
          supplier_count: number | null
          total_payables: number | null
        }
        Relationships: []
      }
      expense_supplier_balances: {
        Row: {
          currency: string | null
          due_soon_balance: number | null
          due_soon_expense_count: number | null
          max_overdue_days: number | null
          next_due_date: string | null
          oldest_due_date: string | null
          open_expense_count: number | null
          overdue_balance: number | null
          overdue_expense_count: number | null
          party_id: string | null
          supplier_email: string | null
          supplier_name: string | null
          supplier_phone: string | null
          total_balance_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "expense_parties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_management_commission_configuration: {
        Row: {
          commission_source: string | null
          effective_commission_rate: number | null
          mandate_commission_rate: number | null
          mandate_end_date: string | null
          mandate_id: string | null
          mandate_reference: string | null
          mandate_start_date: string | null
          mandate_status: string | null
          owner_commission_rate: number | null
          owner_id: string | null
          owner_name: string | null
        }
        Relationships: []
      }
      owner_rent_balances: {
        Row: {
          balance_to_settle: number | null
          collection_count: number | null
          commission_amount: number | null
          currency: string | null
          gross_collected: number | null
          net_owner_amount: number | null
          owner_email: string | null
          owner_id: string | null
          owner_name: string | null
          owner_phone: string | null
          settled_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_rent_ledger_view: {
        Row: {
          balance_to_settle: number | null
          collected_at: string | null
          commission_accounting_entry_id: string | null
          commission_amount: number | null
          commission_rate: number | null
          created_at: string | null
          currency: string | null
          gross_collected: number | null
          invoice_id: string | null
          invoice_number: string | null
          lease_id: string | null
          lease_reference: string | null
          ledger_id: string | null
          net_owner_amount: number | null
          owner_id: string | null
          owner_name: string | null
          payment_id: string | null
          payment_reference: string | null
          property_id: string | null
          property_title: string | null
          settled_amount: number | null
          settlement_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_commission_accounting_entry_id_fkey"
            columns: ["commission_accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_settlements_kpis: {
        Row: {
          balance_to_settle: number | null
          commission_amount: number | null
          gross_collected: number | null
          net_owner_amount: number | null
          owner_count_to_settle: number | null
          settled_amount: number | null
        }
        Relationships: []
      }
      owner_settlements_view: {
        Row: {
          accounting_entry_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          external_reference: string | null
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          reference: string | null
          settlement_date: string | null
          settlement_id: string | null
          status: string | null
          treasury_account_id: string | null
          treasury_code: string | null
          treasury_movement_id: string | null
          treasury_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statement_lines: {
        Row: {
          balance_to_settle: number | null
          collected_at: string | null
          commission_amount: number | null
          commission_rate: number | null
          commission_source: string | null
          currency: string | null
          gross_collected: number | null
          invoice_id: string | null
          invoice_number: string | null
          lease_id: string | null
          ledger_id: string | null
          mandate_id: string | null
          net_owner_amount: number | null
          owner_id: string | null
          owner_name: string | null
          payment_id: string | null
          payment_reference: string | null
          property_id: string | null
          property_title: string | null
          settled_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "tenant_receivables"
            referencedColumns: ["invoice_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "mandates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_mandate_id_fkey"
            columns: ["mandate_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["mandate_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statement_monthly: {
        Row: {
          balance_to_settle: number | null
          collections_count: number | null
          commission_amount: number | null
          currency: string | null
          gross_collected: number | null
          net_owner_amount: number | null
          owner_id: string | null
          owner_name: string | null
          period_month: string | null
          settled_amount: number | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_rent_ledger_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      owner_statement_settlements: {
        Row: {
          accounting_entry_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          external_reference: string | null
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          reference: string | null
          settlement_date: string | null
          settlement_id: string | null
          status: string | null
          treasury_account_id: string | null
          treasury_account_name: string | null
          treasury_movement_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "accounting_entry_balance_check"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_accounting_entry_id_fkey"
            columns: ["accounting_entry_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["accounting_entry_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "owner_settlements_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_account_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_account_id_fkey"
            columns: ["treasury_account_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_account_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_entries"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_journal_with_balance"
            referencedColumns: ["treasury_movement_id"]
          },
          {
            foreignKeyName: "owner_settlements_treasury_movement_id_fkey"
            columns: ["treasury_movement_id"]
            isOneToOne: false
            referencedRelation: "treasury_movements"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_collections_monthly: {
        Row: {
          collected_amount: number | null
          currency: string | null
          month: string | null
          payment_count: number | null
        }
        Relationships: []
      }
      tenant_receivable_balances: {
        Row: {
          currency: string | null
          oldest_open_due_date: string | null
          open_invoice_count: number | null
          overdue_balance: number | null
          overdue_invoice_count: number | null
          tenant_id: string | null
          tenant_name: string | null
          total_balance_due: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_receivables: {
        Row: {
          amount: number | null
          balance_due: number | null
          created_at: string | null
          currency: string | null
          days_from_due_date: number | null
          due_date: string | null
          due_state: string | null
          due_state_label: string | null
          invoice_id: string | null
          invoice_number: string | null
          issue_date: string | null
          lease_id: string | null
          lease_reference: string | null
          organization_id: string | null
          owner_id: string | null
          owner_name: string | null
          paid_amount: number | null
          period_end: string | null
          period_start: string | null
          property_id: string | null
          property_title: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          tenant_id: string | null
          tenant_name: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owner_management_commission_configuration"
            referencedColumns: ["owner_id"]
          },
          {
            foreignKeyName: "invoices_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_receivables_kpis: {
        Row: {
          due_soon_amount: number | null
          open_invoice_count: number | null
          overdue_amount: number | null
          overdue_invoice_count: number | null
          tenant_count: number | null
          total_receivables: number | null
        }
        Relationships: []
      }
      treasury_account_balances: {
        Row: {
          account_type:
            | Database["public"]["Enums"]["treasury_account_type"]
            | null
          balance: number | null
          code: string | null
          currency: string | null
          id: string | null
          name: string | null
        }
        Insert: {
          account_type?:
            | Database["public"]["Enums"]["treasury_account_type"]
            | null
          balance?: never
          code?: string | null
          currency?: string | null
          id?: string | null
          name?: string | null
        }
        Update: {
          account_type?:
            | Database["public"]["Enums"]["treasury_account_type"]
            | null
          balance?: never
          code?: string | null
          currency?: string | null
          id?: string | null
          name?: string | null
        }
        Relationships: []
      }
      treasury_journal_entries: {
        Row: {
          account_type:
            | Database["public"]["Enums"]["treasury_account_type"]
            | null
          accounting_entry_id: string | null
          accounting_reference: string | null
          accounting_status:
            | Database["public"]["Enums"]["accounting_entry_status"]
            | null
          created_at: string | null
          created_by: string | null
          credit: number | null
          currency: string | null
          debit: number | null
          direction: string | null
          entry_date: string | null
          entry_label: string | null
          external_reference: string | null
          finance_reference: string | null
          finance_source_type: string | null
          finance_transaction_id: string | null
          finance_transaction_type:
            | Database["public"]["Enums"]["finance_transaction_type"]
            | null
          line_id: string | null
          movement_type:
            | Database["public"]["Enums"]["treasury_movement_type"]
            | null
          notes: string | null
          sale_id: string | null
          signed_amount: number | null
          treasury_account_code: string | null
          treasury_account_id: string | null
          treasury_account_name: string | null
          treasury_movement_id: string | null
          treasury_reference: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_journal_with_balance: {
        Row: {
          account_type:
            | Database["public"]["Enums"]["treasury_account_type"]
            | null
          accounting_entry_id: string | null
          accounting_reference: string | null
          accounting_status:
            | Database["public"]["Enums"]["accounting_entry_status"]
            | null
          balance_after: number | null
          created_at: string | null
          created_by: string | null
          credit: number | null
          currency: string | null
          debit: number | null
          direction: string | null
          entry_date: string | null
          entry_label: string | null
          external_reference: string | null
          finance_reference: string | null
          finance_source_type: string | null
          finance_transaction_id: string | null
          finance_transaction_type:
            | Database["public"]["Enums"]["finance_transaction_type"]
            | null
          line_id: string | null
          movement_type:
            | Database["public"]["Enums"]["treasury_movement_type"]
            | null
          notes: string | null
          sale_id: string | null
          signed_amount: number | null
          treasury_account_code: string | null
          treasury_account_id: string | null
          treasury_account_name: string | null
          treasury_movement_id: string | null
          treasury_reference: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      approve_expense: {
        Args: { p_expense_id: string; p_note?: string }
        Returns: Json
      }
      approve_property_reavailability: {
        Args: { p_note?: string; p_property_id: string }
        Returns: Json
      }
      calculate_short_rental_cancellation_penalty: {
        Args: { p_booking_id: string; p_cancelled_at?: string }
        Returns: {
          booking_id: string
          free_cancellation: boolean
          free_cancellation_deadline: string
          penalty_amount: number
          penalty_rate: number
          total_booking_amount: number
        }[]
      }
      cancel_expense: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: Json
      }
      cancel_owner_statement: {
        Args: { p_reason: string; p_statement_id: string }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closing_balance: number
          commission_amount: number
          created_at: string
          created_by: string | null
          currency: string
          gross_collected: number
          id: string
          issued_at: string | null
          net_owner_amount: number
          notes: string
          opening_balance: number
          organization_id: string | null
          owner_address: string | null
          owner_city: string | null
          owner_company: string | null
          owner_email: string | null
          owner_id: string
          owner_name: string | null
          owner_phone: string | null
          period_end: string
          period_start: string
          reference: string
          sent_at: string | null
          sent_channel: string | null
          sent_reference: string | null
          sent_to: string | null
          settlements_amount: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "owner_statements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_short_rental_booking: {
        Args: {
          p_booking_id: string
          p_cancelled_at?: string
          p_reason: string
          p_refund_method?: string
        }
        Returns: {
          booking_id: string
          cancelled_at: string
          contractual_penalty_amount: number
          effective_penalty_amount: number
          free_cancellation: boolean
          free_cancellation_deadline: string
          net_collected_before_refund: number
          reference: string
          refund_amount: number
          refund_payment_id: string
          status: Database["public"]["Enums"]["booking_status"]
          total_booking_amount: number
        }[]
      }
      check_in_short_rental_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          checked_in_at: string
          reference: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      check_out_short_rental_booking: {
        Args: { p_booking_id: string }
        Returns: {
          booking_id: string
          checked_out_at: string
          reference: string
          status: Database["public"]["Enums"]["booking_status"]
        }[]
      }
      confirm_short_rental_booking: {
        Args: { p_booking_id: string }
        Returns: {
          accommodation_amount: number
          booking_id: string
          check_in: string
          check_out: string
          cleaning_fee: number
          confirmed_at: string
          currency: string
          deposit: number
          discount_amount: number
          fees: number
          nightly_price: number
          nights_count: number
          property_id: string
          reference: string
          service_fee: number
          status: Database["public"]["Enums"]["booking_status"]
          tax_amount: number
          total_amount: number
        }[]
      }
      convert_lead_to_buyer: { Args: { p_lead_id: string }; Returns: Json }
      convert_lead_to_tenant: { Args: { p_lead_id: string }; Returns: Json }
      convert_rental_lead: { Args: { p_lead_id: string }; Returns: Json }
      create_expense: {
        Args: {
          p_amount?: number
          p_beneficiary_name?: string
          p_category_id: string
          p_contract_id?: string
          p_currency?: string
          p_description?: string
          p_document_number?: string
          p_due_date?: string
          p_expense_date?: string
          p_label?: string
          p_maintenance_request_id?: string
          p_notes?: string
          p_owner_id?: string
          p_party_id?: string
          p_property_id?: string
          p_sale_id?: string
        }
        Returns: Json
      }
      create_owner_statement: {
        Args: {
          p_end_date: string
          p_notes?: string
          p_owner_id: string
          p_start_date: string
        }
        Returns: string
      }
      create_public_short_rental_booking: {
        Args: {
          p_check_in?: string
          p_check_out?: string
          p_conditions_accepted?: boolean
          p_guest_country_of_residence?: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone?: string
          p_guest_special_request?: string
          p_guests_count?: number
          p_notes?: string
          p_payment_plan?: Database["public"]["Enums"]["short_rental_payment_plan"]
          p_property_id: string
        }
        Returns: {
          accommodation_amount: number
          check_in: string
          check_out: string
          cleaning_fee: number
          conditions_accepted_at: string
          created_at: string
          currency: string
          deposit: number
          guest_country_of_residence: string
          guest_email: string
          guest_name: string
          guest_phone: string
          guest_special_request: string
          guests_count: number
          id: string
          initial_payment_percent: number
          payment_plan: Database["public"]["Enums"]["short_rental_payment_plan"]
          property_id: string
          reference: string
          status: Database["public"]["Enums"]["booking_status"]
          total_amount: number
        }[]
      }
      create_short_rental_invoice: {
        Args: { p_booking_id: string }
        Returns: {
          invoice_amount: number
          invoice_currency: string
          invoice_id: string
          invoice_number: string
          invoice_status: Database["public"]["Enums"]["invoice_status"]
        }[]
      }
      create_short_rental_payment_access: {
        Args: { p_booking_id: string }
        Returns: {
          access_id: string
          booking_id: string
          expires_at: string
          payment_due_at: string
          payment_token: string
        }[]
      }
      create_short_rental_provider_transaction: {
        Args: { p_payment_method: string; p_provider: string; p_token: string }
        Returns: {
          amount: number
          booking_id: string
          booking_reference: string
          created_at: string
          currency: string
          invoice_id: string
          invoice_number: string
          payment_method: string
          provider: string
          provider_transaction_id: string
          reused: boolean
          status: string
          transaction_id: string
        }[]
      }
      current_org_id: { Args: never; Returns: string }
      finalize_short_rental_provider_payment: {
        Args: {
          p_paid_at?: string
          p_provider_reference?: string
          p_provider_transaction_id: string
        }
        Returns: {
          amount: number
          booking_id: string
          completed_at: string
          currency: string
          invoice_id: string
          payment_id: string
          payment_method: string
          payment_reference: string
          provider_status: string
          provider_transaction_id: string
          reused: boolean
        }[]
      }
      finance_report_cashflow_daily: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          cash_in: number
          cash_out: number
          net_cash_flow: number
          report_date: string
        }[]
      }
      finance_report_expenses_by_category: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          amount: number
          amount_paid: number
          balance_due: number
          category_id: string
          category_name: string
          expense_count: number
        }[]
      }
      finance_report_expenses_by_owner: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          amount: number
          amount_paid: number
          balance_due: number
          expense_count: number
          owner_chargeable_amount: number
          owner_id: string
          owner_name: string
        }[]
      }
      finance_report_expenses_by_property: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          amount: number
          amount_paid: number
          balance_due: number
          expense_count: number
          property_id: string
          property_title: string
        }[]
      }
      finance_report_payables: { Args: never; Returns: Json }
      finance_report_receivables: {
        Args: { p_end_date: string }
        Returns: {
          account_code: string
          account_id: string
          account_name: string
          balance: number
          credit: number
          debit: number
        }[]
      }
      finance_report_sales_commissions: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      finance_report_summary: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      finance_report_treasury_accounts: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          cash_in: number
          cash_out: number
          closing_balance: number
          currency: string
          net_cash_flow: number
          treasury_account_code: string
          treasury_account_id: string
          treasury_account_name: string
        }[]
      }
      generate_all_rent_invoices: {
        Args: { p_through_date?: string }
        Returns: {
          invoices_created: number
          lease_id: string
        }[]
      }
      generate_lease_rent_invoices: {
        Args: { p_lease_id: string; p_through_date?: string }
        Returns: number
      }
      generate_owner_statement_reference: { Args: never; Returns: string }
      get_finance_report: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: Json
      }
      get_management_commission_rate: {
        Args: {
          p_effective_date?: string
          p_organization_id?: string
          p_owner_id: string
        }
        Returns: number
      }
      get_my_owner_dashboard: {
        Args: never
        Returns: {
          available_properties_count: number
          commissions: number
          gross_collected: number
          net_owner_amount: number
          outstanding_balance: number
          owner_id: string
          properties_count: number
          rented_properties_count: number
          settlements_amount: number
        }[]
      }
      get_my_owner_id: { Args: never; Returns: string }
      get_my_owner_profile: {
        Args: never
        Returns: {
          address: string
          bank_account: string
          bank_name: string
          city: string
          company: string
          email: string
          full_name: string
          id: string
          kind: string
          management_commission_rate: number
          mobile_money_number: string
          mobile_money_provider: string
          phone: string
        }[]
      }
      get_my_owner_revenues: {
        Args: never
        Returns: {
          collected_at: string
          commission_amount: number
          commission_rate: number
          commission_source: string
          created_at: string
          currency: string
          gross_collected: number
          id: string
          invoice_id: string
          lease_id: string
          lease_reference: string
          mandate_id: string
          net_owner_amount: number
          payment_id: string
          property_id: string
          property_reference: string
          property_title: string
          settled_amount: number
        }[]
      }
      get_my_owner_settlements: {
        Args: never
        Returns: {
          amount: number
          created_at: string
          currency: string
          external_reference: string
          id: string
          notes: string
          reference: string
          settlement_date: string
          status: string
          treasury_account_id: string
          treasury_account_name: string
        }[]
      }
      get_my_owner_statement_collections: {
        Args: { p_statement_id: string }
        Returns: {
          balance_to_settle: number
          collected_at: string
          commission_amount: number
          commission_rate: number
          commission_source: string
          created_at: string
          currency: string
          gross_collected: number
          id: string
          invoice_number: string
          ledger_id: string
          net_owner_amount: number
          payment_reference: string
          property_id: string
          property_title: string
          settled_amount: number
          statement_id: string
        }[]
      }
      get_my_owner_statement_settlements: {
        Args: { p_statement_id: string }
        Returns: {
          amount: number
          created_at: string
          currency: string
          external_reference: string
          id: string
          notes: string
          reference: string
          settlement_date: string
          settlement_id: string
          statement_id: string
          treasury_account_name: string
        }[]
      }
      get_my_owner_statements: {
        Args: never
        Returns: {
          cancellation_reason: string
          cancelled_at: string
          closing_balance: number
          commission_amount: number
          created_at: string
          currency: string
          gross_collected: number
          id: string
          issued_at: string
          net_owner_amount: number
          notes: string
          opening_balance: number
          owner_address: string
          owner_city: string
          owner_email: string
          owner_name: string
          owner_phone: string
          period_end: string
          period_start: string
          reference: string
          sent_at: string
          sent_channel: string
          sent_reference: string
          sent_to: string
          settlements_amount: number
          status: string
        }[]
      }
      get_owner_statement_lines: {
        Args: { p_end_date: string; p_owner_id: string; p_start_date: string }
        Returns: {
          balance_to_settle: number | null
          collected_at: string | null
          commission_amount: number | null
          commission_rate: number | null
          commission_source: string | null
          currency: string | null
          gross_collected: number | null
          invoice_id: string | null
          invoice_number: string | null
          lease_id: string | null
          ledger_id: string | null
          mandate_id: string | null
          net_owner_amount: number | null
          owner_id: string | null
          owner_name: string | null
          payment_id: string | null
          payment_reference: string | null
          property_id: string | null
          property_title: string | null
          settled_amount: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "owner_statement_lines"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_owner_statement_settlements: {
        Args: { p_end_date: string; p_owner_id: string; p_start_date: string }
        Returns: {
          accounting_entry_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          external_reference: string | null
          notes: string | null
          owner_id: string | null
          owner_name: string | null
          reference: string | null
          settlement_date: string | null
          settlement_id: string | null
          status: string | null
          treasury_account_id: string | null
          treasury_account_name: string | null
          treasury_movement_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "owner_statement_settlements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_owner_statement_summary: {
        Args: { p_end_date: string; p_owner_id: string; p_start_date: string }
        Returns: {
          closing_balance: number
          collections_count: number
          commission_amount: number
          currency: string
          gross_collected: number
          net_owner_amount: number
          opening_balance: number
          owner_id: string
          owner_name: string
          period_end: string
          period_start: string
          settlements_amount: number
          settlements_count: number
        }[]
      }
      get_public_short_rental_context: {
        Args: { p_property_id: string }
        Returns: Json
      }
      get_public_short_rental_payment_context: {
        Args: { p_token: string }
        Returns: {
          access_expires_at: string
          amount_due_now: number
          booking_reference: string
          booking_status: string
          can_pay: boolean
          check_in: string
          check_out: string
          currency: string
          guests_count: number
          initial_payment_percent: number
          invoice_number: string
          invoice_status: string
          paid_amount: number
          payment_block_reason: string
          payment_deadline_passed: boolean
          payment_due_at: string
          payment_plan: string
          remaining_amount: number
          total_amount: number
        }[]
      }
      get_short_rental_policy_text: {
        Args: { p_property_id: string }
        Returns: {
          cancellation_policy_text: string
          cancellation_policy_version: string
          payment_policy_text: string
          payment_policy_version: string
        }[]
      }
      get_treasury_account_balance: {
        Args: { p_account_id: string }
        Returns: number
      }
      get_treasury_account_for_payment_method: {
        Args: { p_payment_method: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_short_rental_payment_token: {
        Args: { p_token: string }
        Returns: string
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_owner_of: { Args: { _owner_id: string }; Returns: boolean }
      is_owner_user: { Args: never; Returns: boolean }
      is_short_rental_property_available: {
        Args: {
          p_check_in: string
          p_check_out: string
          p_exclude_booking_id?: string
          p_property_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_of: { Args: { _tenant_id: string }; Returns: boolean }
      link_owner_user: {
        Args: { p_owner_id: string; p_user_id: string }
        Returns: undefined
      }
      mark_owner_statement_sent: {
        Args: {
          p_channel: string
          p_sent_reference?: string
          p_sent_to: string
          p_statement_id: string
        }
        Returns: {
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          closing_balance: number
          commission_amount: number
          created_at: string
          created_by: string | null
          currency: string
          gross_collected: number
          id: string
          issued_at: string | null
          net_owner_amount: number
          notes: string
          opening_balance: number
          organization_id: string | null
          owner_address: string | null
          owner_city: string | null
          owner_company: string | null
          owner_email: string | null
          owner_id: string
          owner_name: string | null
          owner_phone: string | null
          period_end: string
          period_start: string
          reference: string
          sent_at: string | null
          sent_channel: string | null
          sent_reference: string | null
          sent_to: string | null
          settlements_amount: number
          status: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "owner_statements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      my_owner_id: { Args: never; Returns: string }
      my_tenant_id: { Args: never; Returns: string }
      pay_expense: {
        Args: {
          p_amount: number
          p_expense_id: string
          p_external_reference?: string
          p_notes?: string
          p_payment_date?: string
          p_payment_method?: string
          p_treasury_account_id: string
        }
        Returns: Json
      }
      post_owner_rent_payment: {
        Args: { p_payment_id: string }
        Returns: string
      }
      post_rent_invoice_to_accounting: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      post_short_rental_invoice_to_accounting: {
        Args: { p_invoice_id: string }
        Returns: string
      }
      record_finance_expense: {
        Args: {
          p_amount: number
          p_category_id: string
          p_currency?: string
          p_external_reference?: string
          p_label?: string
          p_notes?: string
          p_payment_method?: string
          p_transaction_date?: string
        }
        Returns: Json
      }
      record_owner_settlement: {
        Args: {
          p_amount: number
          p_notes?: string
          p_owner_id: string
          p_paid_at?: string
          p_reference?: string
          p_treasury_account_id: string
        }
        Returns: string
      }
      record_sale_commission_payment: {
        Args: {
          p_amount: number
          p_notes?: string
          p_payment_method?: string
          p_reference?: string
          p_sale_id: string
        }
        Returns: Json
      }
      record_short_rental_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_notes?: string
          p_paid_at?: string
          p_payment_method: string
          p_reference?: string
        }
        Returns: string
      }
      record_short_rental_refund: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_notes?: string
          p_payment_method: string
          p_reference?: string
          p_refunded_at?: string
        }
        Returns: string
      }
      record_tenant_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_notes?: string
          p_paid_at?: string
          p_payment_method: string
          p_reference?: string
        }
        Returns: string
      }
      record_treasury_deposit: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date?: string
          p_external_reference?: string
          p_label?: string
          p_notes?: string
        }
        Returns: Json
      }
      record_treasury_opening_balance: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date?: string
          p_notes?: string
        }
        Returns: Json
      }
      record_treasury_transfer: {
        Args: {
          p_amount: number
          p_date?: string
          p_destination_account_id: string
          p_external_reference?: string
          p_label?: string
          p_notes?: string
          p_source_account_id: string
        }
        Returns: Json
      }
      record_treasury_withdrawal: {
        Args: {
          p_account_id: string
          p_amount: number
          p_date?: string
          p_external_reference?: string
          p_label?: string
          p_notes?: string
        }
        Returns: Json
      }
      refresh_invoice_payment_status: {
        Args: { p_invoice_id: string }
        Returns: undefined
      }
      refresh_overdue_rent_invoices: { Args: never; Returns: number }
      reject_expense: {
        Args: { p_expense_id: string; p_reason: string }
        Returns: Json
      }
      rent_due_date: {
        Args: { p_due_day: number; p_month: number; p_year: number }
        Returns: string
      }
      resolve_management_commission: {
        Args: {
          p_effective_date?: string
          p_organization_id?: string
          p_owner_id: string
        }
        Returns: {
          commission_rate: number
          commission_source: string
          mandate_id: string
        }[]
      }
      revoke_short_rental_payment_access: {
        Args: { p_access_id: string }
        Returns: boolean
      }
      submit_expense_for_approval: {
        Args: { p_expense_id: string }
        Returns: Json
      }
      sync_existing_owner_rent_ledgers: { Args: never; Returns: number }
      unlink_owner_user: { Args: { p_owner_id: string }; Returns: undefined }
    }
    Enums: {
      account_kind: "asset" | "liability" | "equity" | "income" | "expense"
      accounting_entry_status: "draft" | "posted" | "reversed"
      app_role:
        | "admin"
        | "agent"
        | "manager"
        | "super_admin"
        | "accountant"
        | "maintenance"
        | "owner"
        | "tenant"
      application_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "accepted"
        | "rejected"
        | "converted"
      booking_status:
        | "request"
        | "option"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "cancelled"
      commission_kind:
        | "rent_percentage"
        | "fixed"
        | "letting_fee"
        | "monthly_management"
        | "sale_percentage"
        | "file_fee"
      expense_party_type: "supplier" | "beneficiary" | "both"
      expense_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "partially_paid"
        | "paid"
        | "rejected"
        | "cancelled"
      finance_transaction_status: "draft" | "posted" | "cancelled"
      finance_transaction_type: "income" | "expense"
      inspection_kind: "checkin" | "checkout"
      invoice_kind:
        | "rent"
        | "charges"
        | "deposit"
        | "booking"
        | "penalty"
        | "service"
        | "commission"
        | "other"
      invoice_status:
        | "draft"
        | "issued"
        | "partially_paid"
        | "paid"
        | "overdue"
        | "cancelled"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "converted"
        | "lost"
        | "visit_scheduled"
        | "visit_done"
        | "application_received"
        | "negotiation"
      lease_status: "active" | "expired" | "terminated" | "pending"
      listing_type: "short_rental" | "long_rental" | "sale"
      maintenance_priority: "low" | "medium" | "high" | "urgent"
      maintenance_status: "open" | "in_progress" | "resolved" | "closed"
      mandate_status: "draft" | "active" | "expired" | "terminated"
      mandate_type: "management" | "rental" | "sale"
      mm_status: "initiated" | "pending" | "success" | "failed" | "refunded"
      notification_channel: "internal" | "email" | "sms" | "whatsapp" | "push"
      owner_kind: "individual" | "company"
      payment_method:
        | "cash"
        | "transfer"
        | "mobile_money"
        | "card"
        | "cheque"
        | "other"
      payment_status: "pending" | "completed" | "failed" | "refunded"
      payout_status: "draft" | "validated" | "paid" | "cancelled"
      property_status:
        | "draft"
        | "published"
        | "archived"
        | "rented"
        | "sold"
        | "reserved"
        | "maintenance"
        | "unavailable"
      property_type:
        | "apartment"
        | "house"
        | "villa"
        | "studio"
        | "commercial"
        | "land"
        | "other"
        | "office"
        | "shop"
        | "warehouse"
        | "parking"
      sale_commission_status: "pending" | "partial" | "paid" | "cancelled"
      sale_status:
        | "prospect"
        | "visit"
        | "offer"
        | "negotiation"
        | "reservation"
        | "sold"
        | "closed"
        | "cancelled"
      short_rental_payment_plan: "half" | "full"
      treasury_account_type: "cash" | "bank" | "mobile_money"
      treasury_movement_type:
        | "opening_balance"
        | "deposit"
        | "withdrawal"
        | "transfer"
      unit_kind:
        | "apartment"
        | "studio"
        | "office"
        | "shop"
        | "parking"
        | "other"
        | "warehouse"
        | "villa"
        | "house"
        | "land"
      unit_status:
        | "available"
        | "reserved"
        | "occupied"
        | "maintenance"
        | "unavailable"
      visit_status:
        | "requested"
        | "confirmed"
        | "done"
        | "cancelled"
        | "postponed"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_kind: ["asset", "liability", "equity", "income", "expense"],
      accounting_entry_status: ["draft", "posted", "reversed"],
      app_role: [
        "admin",
        "agent",
        "manager",
        "super_admin",
        "accountant",
        "maintenance",
        "owner",
        "tenant",
      ],
      application_status: [
        "draft",
        "submitted",
        "under_review",
        "accepted",
        "rejected",
        "converted",
      ],
      booking_status: [
        "request",
        "option",
        "confirmed",
        "in_progress",
        "completed",
        "cancelled",
      ],
      commission_kind: [
        "rent_percentage",
        "fixed",
        "letting_fee",
        "monthly_management",
        "sale_percentage",
        "file_fee",
      ],
      expense_party_type: ["supplier", "beneficiary", "both"],
      expense_status: [
        "draft",
        "pending_approval",
        "approved",
        "partially_paid",
        "paid",
        "rejected",
        "cancelled",
      ],
      finance_transaction_status: ["draft", "posted", "cancelled"],
      finance_transaction_type: ["income", "expense"],
      inspection_kind: ["checkin", "checkout"],
      invoice_kind: [
        "rent",
        "charges",
        "deposit",
        "booking",
        "penalty",
        "service",
        "commission",
        "other",
      ],
      invoice_status: [
        "draft",
        "issued",
        "partially_paid",
        "paid",
        "overdue",
        "cancelled",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "converted",
        "lost",
        "visit_scheduled",
        "visit_done",
        "application_received",
        "negotiation",
      ],
      lease_status: ["active", "expired", "terminated", "pending"],
      listing_type: ["short_rental", "long_rental", "sale"],
      maintenance_priority: ["low", "medium", "high", "urgent"],
      maintenance_status: ["open", "in_progress", "resolved", "closed"],
      mandate_status: ["draft", "active", "expired", "terminated"],
      mandate_type: ["management", "rental", "sale"],
      mm_status: ["initiated", "pending", "success", "failed", "refunded"],
      notification_channel: ["internal", "email", "sms", "whatsapp", "push"],
      owner_kind: ["individual", "company"],
      payment_method: [
        "cash",
        "transfer",
        "mobile_money",
        "card",
        "cheque",
        "other",
      ],
      payment_status: ["pending", "completed", "failed", "refunded"],
      payout_status: ["draft", "validated", "paid", "cancelled"],
      property_status: [
        "draft",
        "published",
        "archived",
        "rented",
        "sold",
        "reserved",
        "maintenance",
        "unavailable",
      ],
      property_type: [
        "apartment",
        "house",
        "villa",
        "studio",
        "commercial",
        "land",
        "other",
        "office",
        "shop",
        "warehouse",
        "parking",
      ],
      sale_commission_status: ["pending", "partial", "paid", "cancelled"],
      sale_status: [
        "prospect",
        "visit",
        "offer",
        "negotiation",
        "reservation",
        "sold",
        "closed",
        "cancelled",
      ],
      short_rental_payment_plan: ["half", "full"],
      treasury_account_type: ["cash", "bank", "mobile_money"],
      treasury_movement_type: [
        "opening_balance",
        "deposit",
        "withdrawal",
        "transfer",
      ],
      unit_kind: [
        "apartment",
        "studio",
        "office",
        "shop",
        "parking",
        "other",
        "warehouse",
        "villa",
        "house",
        "land",
      ],
      unit_status: [
        "available",
        "reserved",
        "occupied",
        "maintenance",
        "unavailable",
      ],
      visit_status: [
        "requested",
        "confirmed",
        "done",
        "cancelled",
        "postponed",
        "no_show",
      ],
    },
  },
} as const
