export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      brokers: {
        Row: {
          id: string;
          email: string;
          name: string;
          company: string | null;
          commission_rate: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          name: string;
          company?: string | null;
          commission_rate?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          name?: string;
          company?: string | null;
          commission_rate?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          broker_id: string;
          external_id: string | null;
          full_name: string;
          business_name: string | null;
          email: string | null;
          phone: string | null;
          loan_amount: string | null;
          loan_purpose: string | null;
          loan_term: string | null;
          monthly_turnover: string | null;
          money_timeline: string | null;
          lead_date: string | null;
          property_type: string | null;
          status: string;
          sub_status: string | null;
          tags: string[] | null;
          notes: string | null;
          call_count: number;
          source: string | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          external_id?: string | null;
          full_name: string;
          business_name?: string | null;
          email?: string | null;
          phone?: string | null;
          loan_amount?: string | null;
          loan_purpose?: string | null;
          loan_term?: string | null;
          monthly_turnover?: string | null;
          money_timeline?: string | null;
          lead_date?: string | null;
          property_type?: string | null;
          status?: string;
          sub_status?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          call_count?: number;
          source?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          broker_id?: string;
          external_id?: string | null;
          full_name?: string;
          business_name?: string | null;
          email?: string | null;
          phone?: string | null;
          loan_amount?: string | null;
          loan_purpose?: string | null;
          loan_term?: string | null;
          monthly_turnover?: string | null;
          money_timeline?: string | null;
          lead_date?: string | null;
          property_type?: string | null;
          status?: string;
          sub_status?: string | null;
          tags?: string[] | null;
          notes?: string | null;
          call_count?: number;
          source?: string | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "leads_broker_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          }
        ];
      };
      call_logs: {
        Row: {
          id: string;
          lead_id: string;
          broker_id: string;
          user_id: string;
          user_name: string | null;
          duration_seconds: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id: string;
          broker_id: string;
          user_id: string;
          user_name?: string | null;
          duration_seconds?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          broker_id?: string;
          user_id?: string;
          user_name?: string | null;
          duration_seconds?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey";
            columns: ["lead_id"];
            isOneToOne: false;
            referencedRelation: "leads";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "call_logs_broker_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          }
        ];
      };
      csv_imports: {
        Row: {
          id: string;
          broker_id: string;
          filename: string;
          total_rows: number | null;
          imported_count: number | null;
          skipped_count: number | null;
          error_count: number | null;
          errors: Json | null;
          imported_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          filename: string;
          total_rows?: number | null;
          imported_count?: number | null;
          skipped_count?: number | null;
          error_count?: number | null;
          errors?: Json | null;
          imported_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          broker_id?: string;
          filename?: string;
          total_rows?: number | null;
          imported_count?: number | null;
          skipped_count?: number | null;
          error_count?: number | null;
          errors?: Json | null;
          imported_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "csv_imports_broker_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          }
        ];
      };
      team_members: {
        Row: {
          id: string;
          broker_id: string;
          user_id: string;
          email: string;
          name: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          broker_id: string;
          user_id: string;
          email: string;
          name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          broker_id?: string;
          user_id?: string;
          email?: string;
          name?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "team_members_broker_id_fkey";
            columns: ["broker_id"];
            isOneToOne: false;
            referencedRelation: "brokers";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
};

// Convenience type aliases
export type Broker = Database["public"]["Tables"]["brokers"]["Row"];
export type BrokerInsert = Database["public"]["Tables"]["brokers"]["Insert"];
export type Lead = Database["public"]["Tables"]["leads"]["Row"];
export type LeadInsert = Database["public"]["Tables"]["leads"]["Insert"];
export type LeadUpdate = Database["public"]["Tables"]["leads"]["Update"];
export type CsvImport = Database["public"]["Tables"]["csv_imports"]["Row"];
export type CsvImportInsert = Database["public"]["Tables"]["csv_imports"]["Insert"];
export type TeamMember = Database["public"]["Tables"]["team_members"]["Row"];
export type TeamMemberInsert = Database["public"]["Tables"]["team_members"]["Insert"];
export type CallLog = Database["public"]["Tables"]["call_logs"]["Row"];
export type CallLogInsert = Database["public"]["Tables"]["call_logs"]["Insert"];

// Team member option for dropdowns (includes broker as option)
export interface TeamMemberOption {
  id: string;
  user_id: string;
  name: string;
  email: string;
}

// Lead status options
export const LEAD_STATUSES = [
  "new",
  "no_answer",
  "call_back",
  "pending",
  "settled",
  "bad_lead",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

// Status display info
export const STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; color: string }
> = {
  new: { label: "New", color: "bg-blue-500" },
  no_answer: { label: "No Answer", color: "bg-yellow-500" },
  call_back: { label: "Call Back", color: "bg-purple-500" },
  pending: { label: "Pending", color: "bg-orange-500" },
  settled: { label: "Settled", color: "bg-emerald-600" },
  bad_lead: { label: "Bad Lead", color: "bg-red-500" },
};

// Sub-status options for Pending stage
export const PENDING_SUB_STATUSES = [
  "waiting_on_banking",
  "indicative_offer",
  "docs_out",
  "submitted",
  "pending_approval",
  "approved",
] as const;

export type PendingSubStatus = (typeof PENDING_SUB_STATUSES)[number];

export const PENDING_SUB_STATUS_CONFIG: Record<PendingSubStatus, { label: string }> = {
  waiting_on_banking: { label: "Waiting On Banking" },
  indicative_offer: { label: "Indicative Offer" },
  docs_out: { label: "Docs Out" },
  submitted: { label: "Submitted" },
  pending_approval: { label: "Pending Approval" },
  approved: { label: "Approved" },
};

// Sub-status options for Bad Lead stage
export const BAD_LEAD_SUB_STATUSES = [
  "duplicate",
  "invalid_number",
  "below_minimum_deposit",
  "ineligible",
  "excessive_dishonors",
  "not_interested",
] as const;

export type BadLeadSubStatus = (typeof BAD_LEAD_SUB_STATUSES)[number];

export const BAD_LEAD_SUB_STATUS_CONFIG: Record<BadLeadSubStatus, { label: string }> = {
  duplicate: { label: "Duplicate" },
  invalid_number: { label: "Invalid Number" },
  below_minimum_deposit: { label: "Below Minimum Deposit" },
  ineligible: { label: "Ineligible" },
  excessive_dishonors: { label: "Excessive Dishonors" },
  not_interested: { label: "Not Interested" },
};
