
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_events": {
                  Row: {
                    "actor_kind": Database["public"]['Enums']["actor_kind"],"actor_user_id": string | null,"case_id": string | null,"case_version": number | null,"decision_id": string | null,"event_type": string,"id": string,"import_batch_id": string | null,"occurred_at": string,"payload": NonNullable<Json>,"request_id": string | null,"run_id": string | null,"submission_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_kind": Database["public"]['Enums']["actor_kind"],"actor_user_id"?: string | null,"case_id"?: string | null,"case_version"?: number | null,"decision_id"?: string | null,"event_type": string,"id"?: string,"import_batch_id"?: string | null,"occurred_at"?: string,"payload": NonNullable<Json>,"request_id"?: string | null,"run_id"?: string | null,"submission_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "actor_kind"?: Database["public"]['Enums']["actor_kind"],"actor_user_id"?: string | null,"case_id"?: string | null,"case_version"?: number | null,"decision_id"?: string | null,"event_type"?: string,"id"?: string,"import_batch_id"?: string | null,"occurred_at"?: string,"payload"?: NonNullable<Json>,"request_id"?: string | null,"run_id"?: string | null,"submission_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_events_workspace_id_actor_user_id_fkey"
      columns: ["workspace_id","actor_user_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "audit_events_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "audit_events_workspace_id_decision_id_fkey"
      columns: ["workspace_id","decision_id"]
isOneToOne: false
      referencedRelation: "decisions"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "audit_events_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_events_workspace_id_import_batch_id_fkey"
      columns: ["workspace_id","import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "audit_events_workspace_id_run_id_fkey"
      columns: ["workspace_id","run_id"]
isOneToOne: false
      referencedRelation: "reconciliation_runs"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "audit_events_workspace_id_submission_id_fkey"
      columns: ["workspace_id","submission_id"]
isOneToOne: false
      referencedRelation: "submission_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "audit_events_workspace_id_submission_id_fkey"
      columns: ["workspace_id","submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"case_drafts": {
                  Row: {
                    "author_id": string,"case_id": string,"evidence_ids": (string)[],"findings": string,"proposed_ledger_id": string | null,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id": string,"case_id": string,"evidence_ids"?: (string)[],"findings"?: string,"proposed_ledger_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "author_id"?: string,"case_id"?: string,"evidence_ids"?: (string)[],"findings"?: string,"proposed_ledger_id"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_drafts_workspace_id_author_id_fkey"
      columns: ["workspace_id","author_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "case_drafts_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "case_drafts_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_posting_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "case_drafts_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_postings"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"cases": {
                  Row: {
                    "assigned_analyst_id": string | null,"category": string | null,"collection_id": string,"created_at": string,"creator_id": string | null,"id": string,"last_submission_id": string | null,"needs_revalidation": boolean,"queue_entered_at": string | null,"version": number,"workflow_status": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "assigned_analyst_id"?: string | null,"category"?: string | null,"collection_id": string,"created_at"?: string,"creator_id"?: string | null,"id"?: string,"last_submission_id"?: string | null,"needs_revalidation"?: boolean,"queue_entered_at"?: string | null,"version"?: number,"workflow_status"?: string,"workspace_id": string
                  }
                  Update: {
                    "assigned_analyst_id"?: string | null,"category"?: string | null,"collection_id"?: string,"created_at"?: string,"creator_id"?: string | null,"id"?: string,"last_submission_id"?: string | null,"needs_revalidation"?: boolean,"queue_entered_at"?: string | null,"version"?: number,"workflow_status"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cases_last_submission_fk"
      columns: ["workspace_id","last_submission_id"]
isOneToOne: false
      referencedRelation: "submission_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "cases_last_submission_fk"
      columns: ["workspace_id","last_submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "cases_workspace_id_assigned_analyst_id_fkey"
      columns: ["workspace_id","assigned_analyst_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "cases_workspace_id_collection_id_fkey"
      columns: ["workspace_id","collection_id"]
isOneToOne: false
      referencedRelation: "collection_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "cases_workspace_id_collection_id_fkey"
      columns: ["workspace_id","collection_id"]
isOneToOne: false
      referencedRelation: "collections"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "cases_workspace_id_creator_id_fkey"
      columns: ["workspace_id","creator_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "cases_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"collections": {
                  Row: {
                    "amount_minor": number,"channel": string,"counterparty": string,"created_by": string | null,"currency": Database["public"]['Enums']["currency_code"],"id": string,"import_batch_id": string,"raw_payload": NonNullable<Json>,"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"channel": string,"counterparty": string,"created_by"?: string | null,"currency": Database["public"]['Enums']["currency_code"],"id"?: string,"import_batch_id": string,"raw_payload": NonNullable<Json>,"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"channel"?: string,"counterparty"?: string,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"id"?: string,"import_batch_id"?: string,"raw_payload"?: NonNullable<Json>,"recorded_at"?: string,"reference"?: string,"source_hash"?: string,"source_record_id"?: string,"source_system"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "collections_workspace_id_created_by_fkey"
      columns: ["workspace_id","created_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "collections_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collections_workspace_id_import_batch_id_fkey"
      columns: ["workspace_id","import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"decisions": {
                  Row: {
                    "case_id": string,"created_at": string,"id": string,"outcome": Database["public"]['Enums']["decision_outcome"],"reason": string,"reviewer_id": string,"snapshot": NonNullable<Json>,"submission_id": string,"verified_large_amount": boolean,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"created_at"?: string,"id"?: string,"outcome": Database["public"]['Enums']["decision_outcome"],"reason": string,"reviewer_id": string,"snapshot": NonNullable<Json>,"submission_id": string,"verified_large_amount"?: boolean,"workspace_id": string
                  }
                  Update: {
                    "case_id"?: string,"created_at"?: string,"id"?: string,"outcome"?: Database["public"]['Enums']["decision_outcome"],"reason"?: string,"reviewer_id"?: string,"snapshot"?: NonNullable<Json>,"submission_id"?: string,"verified_large_amount"?: boolean,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decisions_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "decisions_workspace_id_reviewer_id_fkey"
      columns: ["workspace_id","reviewer_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "decisions_workspace_id_submission_id_fkey"
      columns: ["workspace_id","submission_id"]
isOneToOne: false
      referencedRelation: "submission_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "decisions_workspace_id_submission_id_fkey"
      columns: ["workspace_id","submission_id"]
isOneToOne: false
      referencedRelation: "submissions"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"evidence": {
                  Row: {
                    "case_id": string,"content_type": string,"created_at": string,"id": string,"object_path": string,"sha256": string,"size_bytes": number,"uploaded_by": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"content_type": string,"created_at"?: string,"id"?: string,"object_path": string,"sha256": string,"size_bytes": number,"uploaded_by": string,"workspace_id": string
                  }
                  Update: {
                    "case_id"?: string,"content_type"?: string,"created_at"?: string,"id"?: string,"object_path"?: string,"sha256"?: string,"size_bytes"?: number,"uploaded_by"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "evidence_workspace_id_uploaded_by_fkey"
      columns: ["workspace_id","uploaded_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"idempotency_requests": {
                  Row: {
                    "action": string,"created_at": string,"key": string,"payload_hash": string,"resource_id": string,"result_json": Json | null,"status": Database["public"]['Enums']["idempotency_status"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"created_at"?: string,"key": string,"payload_hash": string,"resource_id": string,"result_json"?: Json | null,"status"?: Database["public"]['Enums']["idempotency_status"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "action"?: string,"created_at"?: string,"key"?: string,"payload_hash"?: string,"resource_id"?: string,"result_json"?: Json | null,"status"?: Database["public"]['Enums']["idempotency_status"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "idempotency_requests_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "idempotency_requests_workspace_id_user_id_fkey"
      columns: ["workspace_id","user_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"import_batches": {
                  Row: {
                    "created_at": string,"created_by": string | null,"error_summary": string | null,"file_object_path": string | null,"file_sha256": string | null,"id": string,"kind": Database["public"]['Enums']["import_kind"],"origin": Database["public"]['Enums']["import_origin"],"source_system": string,"status": Database["public"]['Enums']["import_status"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"error_summary"?: string | null,"file_object_path"?: string | null,"file_sha256"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["import_kind"],"origin": Database["public"]['Enums']["import_origin"],"source_system": string,"status"?: Database["public"]['Enums']["import_status"],"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"error_summary"?: string | null,"file_object_path"?: string | null,"file_sha256"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["import_kind"],"origin"?: Database["public"]['Enums']["import_origin"],"source_system"?: string,"status"?: Database["public"]['Enums']["import_status"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "import_batches_workspace_id_created_by_fkey"
      columns: ["workspace_id","created_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "import_batches_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"ledger_allocations": {
                  Row: {
                    "allocated_at": string,"case_id": string,"decision_id": string | null,"id": string,"ledger_id": string,"released_at": string | null,"run_id": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "allocated_at"?: string,"case_id": string,"decision_id"?: string | null,"id"?: string,"ledger_id": string,"released_at"?: string | null,"run_id"?: string | null,"workspace_id": string
                  }
                  Update: {
                    "allocated_at"?: string,"case_id"?: string,"decision_id"?: string | null,"id"?: string,"ledger_id"?: string,"released_at"?: string | null,"run_id"?: string | null,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_allocations_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "ledger_allocations_workspace_id_decision_id_fkey"
      columns: ["workspace_id","decision_id"]
isOneToOne: false
      referencedRelation: "decisions"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "ledger_allocations_workspace_id_ledger_id_fkey"
      columns: ["workspace_id","ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_posting_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "ledger_allocations_workspace_id_ledger_id_fkey"
      columns: ["workspace_id","ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_postings"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "ledger_allocations_workspace_id_run_id_fkey"
      columns: ["workspace_id","run_id"]
isOneToOne: false
      referencedRelation: "reconciliation_runs"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"ledger_postings": {
                  Row: {
                    "amount_minor": number,"channel": string | null,"counterparty": string | null,"created_by": string | null,"currency": Database["public"]['Enums']["currency_code"],"fee_minor": number,"id": string,"import_batch_id": string,"posting_type": Database["public"]['Enums']["posting_type"],"raw_payload": NonNullable<Json>,"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_minor": number,"channel"?: string | null,"counterparty"?: string | null,"created_by"?: string | null,"currency": Database["public"]['Enums']["currency_code"],"fee_minor"?: number,"id"?: string,"import_batch_id": string,"posting_type": Database["public"]['Enums']["posting_type"],"raw_payload": NonNullable<Json>,"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  Update: {
                    "amount_minor"?: number,"channel"?: string | null,"counterparty"?: string | null,"created_by"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"],"fee_minor"?: number,"id"?: string,"import_batch_id"?: string,"posting_type"?: Database["public"]['Enums']["posting_type"],"raw_payload"?: NonNullable<Json>,"recorded_at"?: string,"reference"?: string,"source_hash"?: string,"source_record_id"?: string,"source_system"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ledger_postings_workspace_id_created_by_fkey"
      columns: ["workspace_id","created_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "ledger_postings_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_postings_workspace_id_import_batch_id_fkey"
      columns: ["workspace_id","import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"policy_versions": {
                  Row: {
                    "settings": NonNullable<Json>,"sha256": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "settings": NonNullable<Json>,"sha256": string,"version": string
                  }
                  Update: {
                    "settings"?: NonNullable<Json>,"sha256"?: string,"version"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"reconciliation_runs": {
                  Row: {
                    "actor_id": string | null,"completed_at": string | null,"created_at": string,"error_code": string | null,"id": string,"input_snapshot": NonNullable<Json>,"rule_version": string,"started_at": string | null,"status": Database["public"]['Enums']["run_status"],"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"id"?: string,"input_snapshot"?: NonNullable<Json>,"rule_version": string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["run_status"],"workspace_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"completed_at"?: string | null,"created_at"?: string,"error_code"?: string | null,"id"?: string,"input_snapshot"?: NonNullable<Json>,"rule_version"?: string,"started_at"?: string | null,"status"?: Database["public"]['Enums']["run_status"],"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "reconciliation_runs_rule_version_fkey"
      columns: ["rule_version"]
isOneToOne: false
      referencedRelation: "policy_versions"
      referencedColumns: ["version"]
    },{
      foreignKeyName: "reconciliation_runs_workspace_id_actor_id_fkey"
      columns: ["workspace_id","actor_id"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    },{
      foreignKeyName: "reconciliation_runs_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"run_events": {
                  Row: {
                    "case_id": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"run_id": string,"sequence": number,"stage": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"run_id": string,"sequence": number,"stage": string,"workspace_id": string
                  }
                  Update: {
                    "case_id"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"run_id"?: string,"sequence"?: number,"stage"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "run_events_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "run_events_workspace_id_run_id_fkey"
      columns: ["workspace_id","run_id"]
isOneToOne: false
      referencedRelation: "reconciliation_runs"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"submissions": {
                  Row: {
                    "case_id": string,"case_version": number,"created_at": string,"evidence_ids": (string)[],"findings": string,"id": string,"proposed_ledger_id": string | null,"rule_version": string,"source_snapshot": NonNullable<Json>,"status": Database["public"]['Enums']["submission_status"],"submitted_by": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "case_id": string,"case_version": number,"created_at"?: string,"evidence_ids"?: (string)[],"findings"?: string,"id"?: string,"proposed_ledger_id"?: string | null,"rule_version": string,"source_snapshot"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by": string,"workspace_id": string
                  }
                  Update: {
                    "case_id"?: string,"case_version"?: number,"created_at"?: string,"evidence_ids"?: (string)[],"findings"?: string,"id"?: string,"proposed_ledger_id"?: string | null,"rule_version"?: string,"source_snapshot"?: NonNullable<Json>,"status"?: Database["public"]['Enums']["submission_status"],"submitted_by"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "submissions_rule_version_fkey"
      columns: ["rule_version"]
isOneToOne: false
      referencedRelation: "policy_versions"
      referencedColumns: ["version"]
    },{
      foreignKeyName: "submissions_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_posting_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_postings"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_submitted_by_fkey"
      columns: ["workspace_id","submitted_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"workspace_members": {
                  Row: {
                    "active": boolean,"created_at": string,"role": Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"role": Database["public"]['Enums']["member_role"],"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"role"?: Database["public"]['Enums']["member_role"],"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspace_members_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "active_rule_version": string,"created_at": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active_rule_version": string,"created_at"?: string,"id"?: string,"name": string
                  }
                  Update: {
                    "active_rule_version"?: string,"created_at"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_active_rule_version_fkey"
      columns: ["active_rule_version"]
isOneToOne: false
      referencedRelation: "policy_versions"
      referencedColumns: ["version"]
    }
                  ]
                }
          }
          Views: {
            "collection_read": {
                  Row: {
                    "amount_minor": string | null,"channel": string,"counterparty": string,"currency": Database["public"]['Enums']["currency_code"],"id": string,"import_batch_id": string,"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "amount_minor"?: never,"channel"?: string | null,"counterparty"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"] | null,"id"?: string | null,"import_batch_id"?: string | null,"recorded_at"?: string | null,"reference"?: string | null,"source_hash"?: string | null,"source_record_id"?: string | null,"source_system"?: string | null,"workspace_id"?: string | null
                         }
                        Update: {
                           "amount_minor"?: never,"channel"?: string | null,"counterparty"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"] | null,"id"?: string | null,"import_batch_id"?: string | null,"recorded_at"?: string | null,"reference"?: string | null,"source_hash"?: string | null,"source_record_id"?: string | null,"source_system"?: string | null,"workspace_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "collections_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "collections_workspace_id_import_batch_id_fkey"
      columns: ["workspace_id","import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"collection_totals_read": {
                  Row: {
                    "currency": Database["public"]['Enums']["currency_code"],"record_count": string | null,"total_minor": string | null,"workspace_id": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "collections_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"ledger_posting_read": {
                  Row: {
                    "amount_minor": string | null,"channel": string | null,"counterparty": string | null,"currency": Database["public"]['Enums']["currency_code"],"fee_minor": string | null,"id": string,"import_batch_id": string,"posting_type": Database["public"]['Enums']["posting_type"],"recorded_at": string,"reference": string,"source_hash": string,"source_record_id": string,"source_system": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "amount_minor"?: never,"channel"?: string | null,"counterparty"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"] | null,"fee_minor"?: never,"id"?: string | null,"import_batch_id"?: string | null,"posting_type"?: Database["public"]['Enums']["posting_type"] | null,"recorded_at"?: string | null,"reference"?: string | null,"source_hash"?: string | null,"source_record_id"?: string | null,"source_system"?: string | null,"workspace_id"?: string | null
                         }
                        Update: {
                           "amount_minor"?: never,"channel"?: string | null,"counterparty"?: string | null,"currency"?: Database["public"]['Enums']["currency_code"] | null,"fee_minor"?: never,"id"?: string | null,"import_batch_id"?: string | null,"posting_type"?: Database["public"]['Enums']["posting_type"] | null,"recorded_at"?: string | null,"reference"?: string | null,"source_hash"?: string | null,"source_record_id"?: string | null,"source_system"?: string | null,"workspace_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "ledger_postings_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ledger_postings_workspace_id_import_batch_id_fkey"
      columns: ["workspace_id","import_batch_id"]
isOneToOne: false
      referencedRelation: "import_batches"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"pg_all_foreign_keys": {
                  Row: {
                    "fk_columns": (unknown)[] | null,"fk_constraint_name": unknown,"fk_schema_name": unknown,"fk_table_name": unknown,"fk_table_oid": unknown,"is_deferrable": boolean | null,"is_deferred": boolean | null,"match_type": string | null,"on_delete": string | null,"on_update": string | null,"pk_columns": (unknown)[] | null,"pk_constraint_name": unknown,"pk_index_name": unknown,"pk_schema_name": unknown,"pk_table_name": unknown,"pk_table_oid": unknown
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"submission_read": {
                  Row: {
                    "case_id": string,"case_version": number,"evidence_ids": (string)[],"findings": string,"id": string,"proposed_ledger_id": string | null,"rule_version": string,"source_snapshot": NonNullable<Json>,"status": Database["public"]['Enums']["submission_status"],"submitted_at": string,"submitted_by": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "case_id"?: string | null,"case_version"?: number | null,"evidence_ids"?: (string)[] | null,"findings"?: string | null,"id"?: string | null,"proposed_ledger_id"?: string | null,"rule_version"?: string | null,"source_snapshot"?: Json | null,"status"?: Database["public"]['Enums']["submission_status"] | null,"submitted_at"?: string | null,"submitted_by"?: string | null,"workspace_id"?: string | null
                         }
                        Update: {
                           "case_id"?: string | null,"case_version"?: number | null,"evidence_ids"?: (string)[] | null,"findings"?: string | null,"id"?: string | null,"proposed_ledger_id"?: string | null,"rule_version"?: string | null,"source_snapshot"?: Json | null,"status"?: Database["public"]['Enums']["submission_status"] | null,"submitted_at"?: string | null,"submitted_by"?: string | null,"workspace_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "submissions_rule_version_fkey"
      columns: ["rule_version"]
isOneToOne: false
      referencedRelation: "policy_versions"
      referencedColumns: ["version"]
    },{
      foreignKeyName: "submissions_workspace_id_case_id_fkey"
      columns: ["workspace_id","case_id"]
isOneToOne: false
      referencedRelation: "cases"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_posting_read"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_proposed_ledger_id_fkey"
      columns: ["workspace_id","proposed_ledger_id"]
isOneToOne: false
      referencedRelation: "ledger_postings"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "submissions_workspace_id_submitted_by_fkey"
      columns: ["workspace_id","submitted_by"]
isOneToOne: false
      referencedRelation: "workspace_members"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"tap_funky": {
                  Row: {
                    "args": string | null,"is_definer": boolean | null,"is_strict": boolean | null,"is_visible": boolean | null,"kind": unknown,"langoid": unknown,"name": unknown,"oid": unknown,"owner": unknown,"returns": string | null,"returns_set": boolean | null,"schema": unknown,"volatility": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "_cleanup":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"_contract_on":
{ Args: { "": string }; Returns: unknown
                           },
"_currtest":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"_db_privs":
{ Args: Record<PropertyKey, never>; Returns: (unknown)[]
                           },
"_extensions":
{ Args: Record<PropertyKey, never>; Returns: unknown[]
                           },
"_get":
{ Args: { "": string }; Returns: number
                           },
"_get_latest":
{ Args: { "": string }; Returns: (number)[]
                           },
"_get_note":
{ Args: { "": string }; Returns: string
                           },
"_is_verbose":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"_prokind":
{ Args: { "p_oid": unknown }; Returns: unknown
                           },
"_query":
{ Args: { "": string }; Returns: string
                           },
"_refine_vol":
{ Args: { "": string }; Returns: string
                           },
"_retval":
{ Args: { "": string }; Returns: string
                           },
"_table_privs":
{ Args: Record<PropertyKey, never>; Returns: (unknown)[]
                           },
"_temptypes":
{ Args: { "": string }; Returns: string
                           },
"_todo":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"col_is_null":
{ Args: { "column_name": unknown,"description"?: string,"schema_name": unknown,"table_name": unknown }; Returns: string
                           } |
{ Args: { "column_name": unknown,"description"?: string,"table_name": unknown }; Returns: string
                           },
"col_not_null":
{ Args: { "column_name": unknown,"description"?: string,"schema_name": unknown,"table_name": unknown }; Returns: string
                           } |
{ Args: { "column_name": unknown,"description"?: string,"table_name": unknown }; Returns: string
                           },
"diag":
{ Args: { "msg": unknown }; Returns: { error: true } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
                           } |
{ Args: { "msg": string }; Returns: { error: true } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
                           },
"diag_test_name":
{ Args: { "": string }; Returns: string
                           },
"do_tap":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           } |
{ Args: { "": string }; Returns: string[]
                           },
"fail":
{ Args: Record<PropertyKey, never>; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           },
"findfuncs":
{ Args: { "": string }; Returns: (string)[]
                           },
"finish":
{ Args: { "exception_on_failure"?: boolean }; Returns: string[]
                           },
"format_type_string":
{ Args: { "": string }; Returns: string
                           },
"has_unique":
{ Args: { "": string }; Returns: string
                           },
"in_todo":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_empty":
{ Args: { "": string }; Returns: string
                           },
"isnt_empty":
{ Args: { "": string }; Returns: string
                           },
"lives_ok":
{ Args: { "": string }; Returns: string
                           },
"no_plan":
{ Args: Record<PropertyKey, never>; Returns: boolean[]
                           },
"num_failed":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"os_name":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pass":
{ Args: Record<PropertyKey, never>; Returns: string
                           } |
{ Args: { "": string }; Returns: string
                           },
"pg_version":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"pg_version_num":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"pgtap_version":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"runtests":
{ Args: Record<PropertyKey, never>; Returns: string[]
                           } |
{ Args: { "": string }; Returns: string[]
                           },
"skip":
{ Args: { "": string }; Returns: string
                           } |
{ Args: { "how_many": number,"why": string }; Returns: string
                           },
"throws_ok":
{ Args: { "": string }; Returns: string
                           },
"todo":
{ Args: { "how_many": number }; Returns: boolean[]
                           } |
{ Args: { "how_many": number,"why": string }; Returns: boolean[]
                           } |
{ Args: { "why": string }; Returns: boolean[]
                           } |
{ Args: { "how_many": number,"why": string }; Returns: boolean[]
                           },
"todo_end":
{ Args: Record<PropertyKey, never>; Returns: boolean[]
                           },
"todo_start":
{ Args: Record<PropertyKey, never>; Returns: boolean[]
                           } |
{ Args: { "": string }; Returns: boolean[]
                           }
          }
          Enums: {
            "actor_kind": "user"|"system","currency_code": "SGD"|"USD","decision_outcome": "reviewed_match"|"escalated","idempotency_status": "pending"|"succeeded"|"rejected","import_kind": "collection"|"ledger","import_origin": "csv_import"|"manual"|"seed","import_status": "accepted"|"rejected","member_role": "analyst"|"reviewer","posting_type": "credit"|"reversal","run_status": "queued"|"running"|"completed"|"failed","submission_status": "submitted"|"decided"|"superseded"
          }
          CompositeTypes: {
            "_time_trial_type": {
                        "a_time": number | null
                      }
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "actor_kind": ["user", "system"],"currency_code": ["SGD", "USD"],"decision_outcome": ["reviewed_match", "escalated"],"idempotency_status": ["pending", "succeeded", "rejected"],"import_kind": ["collection", "ledger"],"import_origin": ["csv_import", "manual", "seed"],"import_status": ["accepted", "rejected"],"member_role": ["analyst", "reviewer"],"posting_type": ["credit", "reversal"],"run_status": ["queued", "running", "completed", "failed"],"submission_status": ["submitted", "decided", "superseded"]
          }
        }
} as const
