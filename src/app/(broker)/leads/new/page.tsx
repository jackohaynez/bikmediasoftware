"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Calendar } from "lucide-react";
import { createClient } from "@/lib/supabase-browser";
import type { Lead, LeadInsert } from "@/types/supabase";

export default function NewLeadPage() {
  const router = useRouter();
  const supabase = createClient();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    full_name: "",
    business_name: "",
    monthly_turnover: "",
    email: "",
    phone: "",
    lead_date: "",
    loan_amount: "",
    loan_purpose: "",
    loan_term: "",
    money_timeline: "",
    notes: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in");
      setSaving(false);
      return;
    }

    // Determine the broker_id - either the user is the owner or a team member
    const brokerId = user.user_metadata?.role === "team_member" && user.user_metadata?.broker_id
      ? user.user_metadata.broker_id
      : user.id;

    const leadData: LeadInsert = {
      broker_id: brokerId,
      full_name: formData.full_name,
      business_name: formData.business_name || null,
      monthly_turnover: formData.monthly_turnover || null,
      email: formData.email || null,
      phone: formData.phone || null,
      lead_date: formData.lead_date || null,
      loan_amount: formData.loan_amount || null,
      loan_purpose: formData.loan_purpose || null,
      loan_term: formData.loan_term || null,
      money_timeline: formData.money_timeline || null,
      notes: formData.notes || null,
      source: "manual",
      status: "new",
    };

    const { data, error: insertError } = await supabase
      .from("leads")
      .insert(leadData as never)
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    const newLead = data as Lead;
    router.push(`/leads/${newLead.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Add New Lead</h1>
          <p className="text-muted-foreground">
            Create a new lead manually
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Enter the lead's contact details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead_date">Lead Added Date</Label>
              <div className="flex gap-2">
                <Input
                  id="lead_date"
                  value={formData.lead_date}
                  onChange={(e) => handleChange("lead_date", e.target.value)}
                  placeholder="e.g., 2025-08-17T07:20:15.632Z"
                />
                <div className="relative shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const picker = document.getElementById("lead_date_picker_new") as HTMLInputElement;
                      picker?.showPicker();
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <input
                    id="lead_date_picker_new"
                    type="datetime-local"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => {
                      if (e.target.value) {
                        const isoDate = new Date(e.target.value).toISOString();
                        handleChange("lead_date", isoDate);
                      }
                    }}
                  />
                </div>
              </div>
              {formData.lead_date && (
                <p className="text-xs text-muted-foreground">
                  {new Date(formData.lead_date).toLocaleString()}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>Enter the business information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <Input
                id="business_name"
                value={formData.business_name}
                onChange={(e) => handleChange("business_name", e.target.value)}
                placeholder="Company or business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_turnover">Average Monthly Turnover</Label>
              <Input
                id="monthly_turnover"
                value={formData.monthly_turnover}
                onChange={(e) => handleChange("monthly_turnover", e.target.value)}
                placeholder="e.g., $50,000, Under $10k"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Loan Details</CardTitle>
            <CardDescription>Information about the loan inquiry</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="loan_amount">Loan Amount</Label>
              <Input
                id="loan_amount"
                value={formData.loan_amount}
                onChange={(e) => handleChange("loan_amount", e.target.value)}
                placeholder="e.g., 500000 or Less than 10k"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan_purpose">Loan Purpose</Label>
              <Input
                id="loan_purpose"
                value={formData.loan_purpose}
                onChange={(e) => handleChange("loan_purpose", e.target.value)}
                placeholder="e.g., Purchase, Refinance, Investment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loan_term">Loan Term</Label>
              <Input
                id="loan_term"
                value={formData.loan_term}
                onChange={(e) => handleChange("loan_term", e.target.value)}
                placeholder="e.g., 30 years, 5 years, 12 months"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="money_timeline">When Do They Need The Money?</Label>
              <Input
                id="money_timeline"
                value={formData.money_timeline}
                onChange={(e) => handleChange("money_timeline", e.target.value)}
                placeholder="e.g., ASAP, Within 2 weeks, 1-3 months"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
            <CardDescription>Add any initial notes about this lead</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Add notes about this lead..."
              rows={4}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Lead"}
          </Button>
        </div>
      </form>
    </div>
  );
}
