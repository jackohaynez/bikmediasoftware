"use client";

import { useState, useCallback, useEffect } from "react";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, AlertCircle, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react";
import type { Broker } from "@/types/supabase";
import { previewStatusMappings } from "@/lib/import-utils";

const NOT_MAPPED_VALUE = "__NOT_MAPPED__";

interface CSVRow {
  [key: string]: string;
}

interface ImportResult {
  success: boolean;
  imported_count: number;
  skipped_count: number;
  error_count: number;
  errors: Array<{ row: number; message: string }>;
}

interface CSVImporterProps {
  brokers: Broker[];
}

interface AssignableUser {
  user_id: string;
  email: string;
  name: string;
  type: "owner" | "team_member";
}

// All available database fields that can be mapped
const DATABASE_FIELDS = [
  { key: "full_name", label: "Full Name", required: true, description: "Lead's full name" },
  { key: "email", label: "Email", required: false, description: "Email address" },
  { key: "phone", label: "Phone", required: false, description: "Phone number" },
  { key: "business_name", label: "Business Name", required: false, description: "Company/business name" },
  { key: "loan_amount", label: "Loan Amount", required: false, description: "Requested loan amount" },
  { key: "loan_purpose", label: "Loan Purpose", required: false, description: "What the loan is for" },
  { key: "loan_term", label: "Loan Term", required: false, description: "Loan duration" },
  { key: "monthly_turnover", label: "Monthly Turnover", required: false, description: "Business monthly turnover" },
  { key: "money_timeline", label: "Money Timeline", required: false, description: "When they need the money" },
  { key: "property_type", label: "Property Type", required: false, description: "Type of property" },
  { key: "notes", label: "Notes", required: false, description: "Additional notes" },
  { key: "external_id", label: "External ID", required: false, description: "External reference ID" },
  { key: "source", label: "Source", required: false, description: "Lead source (e.g., Meta Ads)" },
  { key: "tags", label: "Tags", required: false, description: "Lead tags/labels" },
  { key: "call_count", label: "Call Count", required: false, description: "Number of calls made" },
  { key: "created_at", label: "Created Date", required: false, description: "Original lead date" },
  { key: "status", label: "Status", required: false, description: "Pipeline status (auto-mapped)" },
  { key: "broker_email", label: "Broker Email", required: false, description: "Assign by broker email" },
  { key: "broker_name", label: "Broker Name", required: false, description: "Assign by broker name" },
];

export function CSVImporter({ brokers }: CSVImporterProps) {
  const [selectedBroker, setSelectedBroker] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch assignable users when broker is selected
  useEffect(() => {
    if (!selectedBroker) {
      setAssignableUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await fetch(`/api/admin/brokers/${selectedBroker}/users`);
        if (response.ok) {
          const data = await response.json();
          setAssignableUsers(data.users || []);
        }
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [selectedBroker]);

  // Get status preview based on mapped data
  const statusPreview = (() => {
    if (!mapping.status || parsedData.length === 0) return [];
    const statuses = parsedData.map((row) => row[mapping.status]).filter(Boolean);
    return previewStatusMappings(statuses);
  })();

  // Get broker assignment preview
  const brokerAssignmentPreview = (() => {
    const hasBrokerEmail = mapping.broker_email && parsedData.length > 0;
    const hasBrokerName = mapping.broker_name && parsedData.length > 0;

    if (!hasBrokerEmail && !hasBrokerName) return [];

    const assignments: Array<{ value: string; type: "email" | "name"; matched: boolean; userName: string | null }> = [];

    if (hasBrokerEmail) {
      const emailSet = new Set(parsedData.map((row) => row[mapping.broker_email]).filter(Boolean));
      const emails = Array.from(emailSet);
      for (const email of emails) {
        const normalized = email.toLowerCase().trim();
        const matchedUser = assignableUsers.find((u) => u.email.toLowerCase() === normalized);
        assignments.push({
          value: email,
          type: "email",
          matched: Boolean(matchedUser),
          userName: matchedUser?.name || null,
        });
      }
    }

    if (hasBrokerName) {
      const nameSet = new Set(parsedData.map((row) => row[mapping.broker_name]).filter(Boolean));
      const names = Array.from(nameSet);
      for (const name of names) {
        const normalized = name.toLowerCase().trim();
        const matchedUser = assignableUsers.find((u) =>
          u.name.toLowerCase().trim() === normalized ||
          u.name.toLowerCase().trim().includes(normalized) ||
          normalized.includes(u.name.toLowerCase().trim())
        );
        assignments.push({
          value: name,
          type: "name",
          matched: Boolean(matchedUser),
          userName: matchedUser?.name || null,
        });
      }
    }

    return assignments;
  })();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setResult(null);
      setError(null);

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as CSVRow[];
          const csvHeaders = results.meta.fields || [];

          // Trim headers to remove leading/trailing spaces
          const trimmedHeaders = csvHeaders.map(h => h.trim());

          setParsedData(data);
          setHeaders(trimmedHeaders);

          // Auto-map based on common patterns
          const autoMapping: Record<string, string> = {};

          const patterns: Record<string, RegExp> = {
            full_name: /^name$/i,
            email: /^e?-?mail/i,
            phone: /phone|mobile|tel/i,
            business_name: /business.*name|company/i,
            loan_amount: /loan.*amount|how.*much|amount.*need/i,
            loan_purpose: /purpose|what.*need.*money|what.*for/i,
            loan_term: /term|how.*long.*loan/i,
            monthly_turnover: /turnover|monthly/i,
            money_timeline: /when.*need|timeline|urgency/i,
            notes: /^notes?$|^comments?$/i,
            source: /^source$/i,
            tags: /^tags?$|^labels?$/i,
            call_count: /call.*#|call.*count|calls|number.*calls/i,
            created_at: /date.*time|datetime|created|lead.*date/i,
            status: /^status$/i,
            broker_email: /broker.*email/i,
            broker_name: /broker.*name|^broker$/i,
            external_id: /external.*id|^id$|^ref/i,
          };

          trimmedHeaders.forEach((header) => {
            const headerLower = header.toLowerCase();
            for (const [field, pattern] of Object.entries(patterns)) {
              if (pattern.test(headerLower) && !autoMapping[field]) {
                autoMapping[field] = header;
                break;
              }
            }
          });

          console.log("CSV Headers:", trimmedHeaders);
          console.log("Auto Mapping:", autoMapping);

          setMapping(autoMapping);
        },
        error: (err) => {
          setError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    []
  );

  const handleMappingChange = (field: string, csvColumn: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: csvColumn === NOT_MAPPED_VALUE ? "" : csvColumn,
    }));
  };

  const handleImport = async () => {
    if (!selectedBroker) {
      setError("Please select a sub account");
      return;
    }

    if (!mapping.full_name) {
      setError("Please map the Full Name field - it is required");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      console.log("=== Import Debug ===");
      console.log("Mapping being used:", mapping);
      console.log("First row raw:", parsedData[0]);

      // Transform data according to mapping
      const leads = parsedData.map((row) => {
        const lead: Record<string, string | null> = {};

        Object.entries(mapping).forEach(([field, csvColumn]) => {
          if (csvColumn) {
            // Try both trimmed and original column name
            const value = row[csvColumn] ?? row[csvColumn.trim()] ?? null;
            lead[field] = value || null;
          }
        });

        return lead;
      });

      console.log("First lead transformed:", leads[0]);

      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_id: selectedBroker,
          filename: file?.name || "unknown.csv",
          leads,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setMapping({});
    setResult(null);
    setError(null);
  };

  const mappedFieldsCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Step 1: Sub Account Selection */}
      <Card>
        <CardHeader>
          <CardTitle>1. Select Sub Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <Label htmlFor="broker">Import leads for:</Label>
            <Select value={selectedBroker} onValueChange={setSelectedBroker}>
              <SelectTrigger id="broker" className="mt-2">
                <SelectValue placeholder="Select a sub account" />
              </SelectTrigger>
              <SelectContent>
                {brokers.map((broker) => (
                  <SelectItem key={broker.id} value={broker.id}>
                    {broker.company || broker.name} ({broker.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBroker && assignableUsers.length > 0 && (
              <p className="mt-2 text-sm text-muted-foreground">
                Brokers available for assignment: {assignableUsers.map(u => u.name).join(", ")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 2: File Upload */}
      <Card>
        <CardHeader>
          <CardTitle>2. Upload CSV File</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-6 py-10 text-center transition-colors hover:border-white/40 hover:bg-white/10">
              <Upload className="h-6 w-6 text-white/50" />
              <span className="text-sm text-white/50">
                {file ? file.name : "Click to upload CSV file"}
              </span>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {file && (
              <Button variant="outline" onClick={resetForm}>
                Clear
              </Button>
            )}
          </div>
          {parsedData.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-green-500">
                Found {parsedData.length} rows and {headers.length} columns
              </p>
              <p className="text-xs text-muted-foreground">
                <strong>Columns:</strong> {headers.join(" | ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 3: Column Mapping - Show ALL CSV columns */}
      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>3. Map Your CSV Columns</span>
              <span className="text-sm font-normal text-muted-foreground">
                {mappedFieldsCount} fields mapped
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              For each CSV column, select which database field it should map to. Required fields are marked with *.
            </p>

            <div className="space-y-3">
              {headers.map((csvHeader) => {
                // Find which field this header is mapped to
                const mappedTo = Object.entries(mapping).find(([, col]) => col === csvHeader)?.[0];
                const fieldInfo = mappedTo ? DATABASE_FIELDS.find(f => f.key === mappedTo) : null;

                return (
                  <div key={csvHeader} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
                    <div className="min-w-[200px]">
                      <p className="font-medium">{csvHeader}</p>
                      <p className="text-xs text-muted-foreground">
                        Sample: {parsedData[0]?.[csvHeader]?.substring(0, 50) || "(empty)"}
                      </p>
                    </div>

                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    <Select
                      value={mappedTo || NOT_MAPPED_VALUE}
                      onValueChange={(field) => {
                        // Clear any existing mapping for this field
                        const newMapping = { ...mapping };
                        Object.keys(newMapping).forEach(key => {
                          if (newMapping[key] === csvHeader) {
                            delete newMapping[key];
                          }
                        });
                        if (field !== NOT_MAPPED_VALUE) {
                          newMapping[field] = csvHeader;
                        }
                        setMapping(newMapping);
                      }}
                    >
                      <SelectTrigger className="w-[250px]">
                        <SelectValue placeholder="Select field to map to" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_MAPPED_VALUE}>-- Skip this column --</SelectItem>
                        {DATABASE_FIELDS.map((field) => {
                          const alreadyMapped = mapping[field.key] && mapping[field.key] !== csvHeader;
                          return (
                            <SelectItem
                              key={field.key}
                              value={field.key}
                              disabled={alreadyMapped}
                            >
                              {field.label} {field.required && "*"} {alreadyMapped && "(already mapped)"}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {fieldInfo && (
                      <span className="text-xs text-green-500">→ {fieldInfo.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Status Preview */}
      {statusPreview.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader>
            <CardTitle>Status Mapping Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Your status values will be mapped to pipeline stages:
            </p>
            <div className="space-y-2">
              {statusPreview.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{item.csvValue}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span className={item.isRecognized ? "text-green-500" : "text-yellow-500"}>
                    {item.mappedStatus}
                    {item.mappedSubStatus && ` (${item.mappedSubStatus})`}
                    {!item.isRecognized && " - defaults to 'new'"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Broker Assignment Preview */}
      {brokerAssignmentPreview.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader>
            <CardTitle>Broker Assignment Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Leads will be assigned based on these matches:
            </p>
            <div className="space-y-2">
              {brokerAssignmentPreview.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{item.value}</span>
                  <span className="text-xs text-muted-foreground">({item.type})</span>
                  <ArrowRight className="h-3 w-3" />
                  {item.matched ? (
                    <span className="text-green-500">{item.userName}</span>
                  ) : (
                    <span className="text-yellow-500">Not matched - will be unassigned</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {/* Result Display */}
      {result && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Import Complete</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="text-green-600">
                    {result.imported_count} leads imported successfully
                  </li>
                  {result.skipped_count > 0 && (
                    <li className="text-yellow-600">
                      {result.skipped_count} duplicates skipped (same email or phone)
                    </li>
                  )}
                  {result.error_count > 0 && (
                    <li className="text-red-600">
                      {result.error_count} rows failed
                    </li>
                  )}
                </ul>
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="font-medium">Errors:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>
                          Row {err.row}: {err.message}
                        </li>
                      ))}
                      {result.errors.length > 10 && (
                        <li>...and {result.errors.length - 10} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Button */}
      {parsedData.length > 0 && !result && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {!mapping.full_name && (
              <span className="text-red-500">Please map the Full Name field (required)</span>
            )}
          </p>
          <Button
            onClick={handleImport}
            disabled={importing || !selectedBroker || !mapping.full_name}
            size="lg"
          >
            {importing ? "Importing..." : `Import ${parsedData.length} Leads`}
          </Button>
        </div>
      )}
    </div>
  );
}
