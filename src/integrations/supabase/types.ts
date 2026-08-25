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
      bookings: {
        Row: {
          check_in: string
          check_out: string
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string
          currency: string
          deposit: number
          fees: number
          guest_email: string
          guest_name: string
          guest_phone: string
          guests_count: number
          id: string
          lead_id: string | null
          nightly_price: number
          notes: string
          organization_id: string | null
          property_id: string
          reference: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          check_in: string
          check_out: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          currency?: string
          deposit?: number
          fees?: number
          guest_email?: string
          guest_name: string
          guest_phone?: string
          guests_count?: number
          id?: string
          lead_id?: string | null
          nightly_price?: number
          notes?: string
          organization_id?: string | null
          property_id: string
          reference: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          check_in?: string
          check_out?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string
          currency?: string
          deposit?: number
          fees?: number
          guest_email?: string
          guest_name?: string
          guest_phone?: string
          guests_count?: number
          id?: string
          lead_id?: string | null
          nightly_price?: number
          notes?: string
          organization_id?: string | null
          property_id?: string
          reference?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
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
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
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
      expenses: {
        Row: {
          amount: number
          category: string
          chargeable_to_owner: boolean
          created_at: string
          currency: string
          id: string
          label: string
          maintenance_request_id: string | null
          organization_id: string | null
          owner_id: string | null
          property_id: string | null
          receipt_url: string | null
          spent_at: string
          status: Database["public"]["Enums"]["expense_status"]
        }
        Insert: {
          amount?: number
          category?: string
          chargeable_to_owner?: boolean
          created_at?: string
          currency?: string
          id?: string
          label: string
          maintenance_request_id?: string | null
          organization_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          receipt_url?: string | null
          spent_at?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Update: {
          amount?: number
          category?: string
          chargeable_to_owner?: boolean
          created_at?: string
          currency?: string
          id?: string
          label?: string
          maintenance_request_id?: string | null
          organization_id?: string | null
          owner_id?: string | null
          property_id?: string | null
          receipt_url?: string | null
          spent_at?: string
          status?: Database["public"]["Enums"]["expense_status"]
        }
        Relationships: [
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
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
        ]
      }
      invoices: {
        Row: {
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
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
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
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          budget_max?: number | null
          budget_min?: number | null
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      payments: {
        Row: {
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
          updated_at: string
        }
        Insert: {
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
          updated_at?: string
        }
        Update: {
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
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
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
          available_from: string | null
          bathrooms: number
          bedrooms: number
          building_id: string | null
          charges: number
          city: string
          commune: string
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
          surface: number
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id?: string | null
          charges?: number
          city?: string
          commune?: string
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
          surface?: number
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          amenities?: string[] | null
          available_from?: string | null
          bathrooms?: number
          bedrooms?: number
          building_id?: string | null
          charges?: number
          city?: string
          commune?: string
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
      sales: {
        Row: {
          agreed_price: number
          asking_price: number
          buyer_email: string
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
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_org_member: { Args: { _org: string }; Returns: boolean }
      is_owner_of: { Args: { _owner_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_of: { Args: { _tenant_id: string }; Returns: boolean }
      my_owner_id: { Args: never; Returns: string }
      my_tenant_id: { Args: never; Returns: string }
    }
    Enums: {
      account_kind: "asset" | "liability" | "equity" | "income" | "expense"
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
      expense_status: "draft" | "approved" | "paid" | "rejected"
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
      sale_status:
        | "prospect"
        | "visit"
        | "offer"
        | "negotiation"
        | "reservation"
        | "sold"
        | "closed"
        | "cancelled"
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
      account_kind: ["asset", "liability", "equity", "income", "expense"],
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
      expense_status: ["draft", "approved", "paid", "rejected"],
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
