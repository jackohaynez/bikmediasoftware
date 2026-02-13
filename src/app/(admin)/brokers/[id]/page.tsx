"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  UserPlus,
  Trash2,
  Crown,
  AlertTriangle,
  Upload,
  CheckCircle,
  History,
  Building2,
  Pencil,
} from "lucide-react";
import type { Broker, TeamMember, CsvImport } from "@/types/supabase";

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

const NOT_MAPPED_VALUE = "__NOT_MAPPED__";

export default function SubAccountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const brokerId = params.id as string;

  const [broker, setBroker] = useState<Broker | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [imports, setImports] = useState<CsvImport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // User form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
  });

  // Account name edit state
  const [editingAccountName, setEditingAccountName] = useState(false);
  const [accountNameForm, setAccountNameForm] = useState({
    name: "",
    company: "",
  });
  const [savingAccountName, setSavingAccountName] = useState(false);

  // CSV Import state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CSVRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const requiredFields = ["full_name"];
  const optionalFields = [
    "email",
    "phone",
    "business_name",
    "loan_amount",
    "loan_purpose",
    "loan_term",
    "monthly_turnover",
    "money_timeline",
    "external_id",
    "notes",
    "source",
    "call_count",
    "created_at",
    "status",
    "broker_email",
    "broker_name",
  ];

  const fetchData = async () => {
    try {
      const brokerRes = await fetch(`/api/admin/brokers/${brokerId}`);
      const brokerData = await brokerRes.json();
      if (brokerData.error) {
        setError(brokerData.error);
        return;
      }
      setBroker(brokerData.broker);
      setTeamMembers(brokerData.teamMembers || []);
      setImports(brokerData.imports || []);
    } catch {
      setError("Failed to load sub account");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [brokerId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const startEditingAccountName = () => {
    if (broker) {
      setAccountNameForm({
        name: broker.name || "",
        company: broker.company || "",
      });
      setEditingAccountName(true);
    }
  };

  const cancelEditingAccountName = () => {
    setEditingAccountName(false);
    setAccountNameForm({ name: "", company: "" });
  };

  const saveAccountName = async () => {
    if (!accountNameForm.name.trim()) {
      setError("Owner name is required");
      return;
    }

    setSavingAccountName(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/brokers/${brokerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: accountNameForm.name.trim(),
          company: accountNameForm.company.trim() || null,
        }),
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setBroker(data.broker);
        setSuccess("Account updated successfully");
        setEditingAccountName(false);
      }
    } catch {
      setError("Failed to update account");
    } finally {
      setSavingAccountName(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/brokers/${brokerId}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess("Broker added successfully");
        setFormData({ email: "", password: "", name: "" });
        fetchData();
      }
    } catch {
      setError("Failed to add broker");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, isOwner: boolean) => {
    if (isOwner) {
      setError("Cannot delete the account owner");
      return;
    }

    if (!confirm("Are you sure you want to remove this broker?")) return;

    setDeleting(userId);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/brokers/${brokerId}/users/${userId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSuccess("Broker removed");
        fetchData();
      }
    } catch {
      setError("Failed to remove broker");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAccount = async () => {
    const accountName = broker?.company || broker?.name || "this account";
    if (
      !confirm(
        `Are you sure you want to delete "${accountName}"? This will permanently delete all brokers, leads, and data associated with this account. This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingAccount(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/brokers/${brokerId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setDeletingAccount(false);
      } else {
        router.push("/brokers");
      }
    } catch {
      setError("Failed to delete sub account");
      setDeletingAccount(false);
    }
  };

  // CSV Import handlers
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (!selectedFile) return;

      setFile(selectedFile);
      setImportResult(null);
      setImportError(null);

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(), // Trim headers during parsing
        complete: (results) => {
          const data = results.data as CSVRow[];
          const csvHeaders = results.meta.fields || [];

          setParsedData(data);
          setHeaders(csvHeaders);

          // Auto-map matching headers using patterns
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
            call_count: /call.*#|call.*count|calls|number.*calls|^call\s*#$/i,
            created_at: /date.*time|datetime|created|lead.*date/i,
            status: /^status$/i,
            broker_email: /broker.*email/i,
            broker_name: /broker.*name|^broker$/i,
            external_id: /external.*id|^id$|^ref/i,
          };

          csvHeaders.forEach((header) => {
            const headerLower = header.toLowerCase();
            for (const [field, pattern] of Object.entries(patterns)) {
              if (pattern.test(headerLower) && !autoMapping[field]) {
                autoMapping[field] = header;
                break;
              }
            }
          });

          console.log("CSV Headers:", csvHeaders);
          console.log("Auto Mapping:", autoMapping);

          setMapping(autoMapping);
        },
        error: (err) => {
          setImportError(`Failed to parse CSV: ${err.message}`);
        },
      });
    },
    []
  );

  const handleMappingChange = (field: string, csvColumn: string) => {
    setMapping((prev) => ({
      ...prev,
      [field]: csvColumn,
    }));
  };

  const handleImport = async () => {
    if (!mapping.full_name) {
      setImportError("Please map the Full Name field");
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      const leads = parsedData.map((row) => {
        const lead: Record<string, string | null> = {};

        Object.entries(mapping).forEach(([field, csvColumn]) => {
          if (csvColumn && row[csvColumn]) {
            lead[field] = row[csvColumn];
          }
        });

        return lead;
      });

      const response = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          broker_id: brokerId,
          filename: file?.name || "unknown.csv",
          leads,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Import failed");
      }

      setImportResult(data);
      fetchData(); // Refresh import history
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setMapping({});
    setImportResult(null);
    setImportError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!broker) {
    return (
      <div className="space-y-4">
        <Link href="/brokers">
          <Button variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sub Accounts
          </Button>
        </Link>
        <p className="text-destructive">Sub account not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/brokers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{broker.company || broker.name}</h1>
          <p className="text-muted-foreground">Manage this sub account</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-500">
          {success}
        </div>
      )}

      {/* Account Details Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Account Details
              </CardTitle>
              <CardDescription>
                Sub account name and business information
              </CardDescription>
            </div>
            {!editingAccountName && (
              <Button variant="outline" size="sm" onClick={startEditingAccountName}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editingAccountName ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ownerName">Owner Name *</Label>
                <Input
                  id="ownerName"
                  value={accountNameForm.name}
                  onChange={(e) =>
                    setAccountNameForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Owner's name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Business/Company Name</Label>
                <Input
                  id="companyName"
                  value={accountNameForm.company}
                  onChange={(e) =>
                    setAccountNameForm((prev) => ({ ...prev, company: e.target.value }))
                  }
                  placeholder="Company name (optional)"
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={saveAccountName} disabled={savingAccountName}>
                  {savingAccountName ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  variant="outline"
                  onClick={cancelEditingAccountName}
                  disabled={savingAccountName}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Owner Name</p>
                  <p className="font-medium">{broker.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Business/Company Name</p>
                  <p className="font-medium">{broker.company || <span className="text-muted-foreground">Not set</span>}</p>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-white/10 p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{broker.email}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Brokers Section */}
      <Card>
        <CardHeader>
          <CardTitle>Brokers</CardTitle>
          <CardDescription>
            {1 + teamMembers.length} broker{1 + teamMembers.length !== 1 ? "s" : ""} in
            this account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-3">
                <Crown className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="font-medium">{broker.name}</p>
                  <p className="text-sm text-muted-foreground">{broker.email}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground bg-white/10 px-2 py-1 rounded">
                Owner
              </span>
            </div>

            {teamMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-white/10 p-3"
              >
                <div>
                  <p className="font-medium">{member.name || "No name"}</p>
                  <p className="text-sm text-muted-foreground">{member.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(member.id, false)}
                  disabled={deleting === member.id}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Broker Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Broker
          </CardTitle>
          <CardDescription>
            Add a new broker to this sub account. They will have access to all leads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="Broker's name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? "Adding..." : "Add Broker"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Import Leads Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Leads
          </CardTitle>
          <CardDescription>
            Upload a CSV file to import leads for this sub account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="flex items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-6 py-6 text-center transition-colors hover:border-white/40 hover:bg-white/10 flex-1">
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
              <Button variant="outline" onClick={resetImport}>
                Clear
              </Button>
            )}
          </div>

          {parsedData.length > 0 && (
            <p className="text-sm text-white/60">
              Found {parsedData.length} rows in the CSV file
            </p>
          )}

          {/* Field Mapping */}
          {headers.length > 0 && !importResult && (
            <div className="space-y-4">
              <h4 className="font-medium">Map Fields</h4>
              <div className="grid gap-4 md:grid-cols-2">
                {requiredFields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label>
                      {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}{" "}
                      *
                    </Label>
                    <Select
                      value={mapping[field] || ""}
                      onValueChange={(v) => handleMappingChange(field, v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column" />
                      </SelectTrigger>
                      <SelectContent>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}

                {optionalFields.map((field) => (
                  <div key={field} className="space-y-2">
                    <Label>
                      {field.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </Label>
                    <Select
                      value={mapping[field] || ""}
                      onValueChange={(v) =>
                        handleMappingChange(field, v === NOT_MAPPED_VALUE ? "" : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select column (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NOT_MAPPED_VALUE}>-- Not mapped --</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importing..." : `Import ${parsedData.length} Leads`}
              </Button>
            </div>
          )}

          {/* Import Error */}
          {importError && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {importError}
            </div>
          )}

          {/* Import Result */}
          {importResult && (
            <div className="flex items-start gap-4 rounded-lg border border-white/10 p-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="text-lg font-semibold">Import Complete</h3>
                <ul className="mt-2 space-y-1 text-sm">
                  <li className="text-green-600">
                    {importResult.imported_count} leads imported successfully
                  </li>
                  {importResult.skipped_count > 0 && (
                    <li className="text-yellow-600">
                      {importResult.skipped_count} duplicates skipped
                    </li>
                  )}
                  {importResult.error_count > 0 && (
                    <li className="text-red-600">
                      {importResult.error_count} rows failed
                    </li>
                  )}
                </ul>
                <Button variant="outline" className="mt-4" onClick={resetImport}>
                  Import Another File
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import History Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Import History
          </CardTitle>
          <CardDescription>Recent CSV imports for this sub account</CardDescription>
        </CardHeader>
        <CardContent>
          {imports.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Imported</TableHead>
                  <TableHead>Skipped</TableHead>
                  <TableHead>Errors</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp) => (
                  <TableRow key={imp.id}>
                    <TableCell>
                      {new Date(imp.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {imp.filename}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success">{imp.imported_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      {(imp.skipped_count || 0) > 0 ? (
                        <Badge variant="warning">{imp.skipped_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {(imp.error_count || 0) > 0 ? (
                        <Badge variant="destructive">{imp.error_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground py-4 text-center">
              No imports yet for this sub account.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this sub account and all associated data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this sub account will permanently remove all brokers, leads, and
            import history. This action cannot be undone.
          </p>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={deletingAccount}
          >
            {deletingAccount ? "Deleting..." : "Delete Sub Account"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
