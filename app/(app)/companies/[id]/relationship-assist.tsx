"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { CompanyRelationshipContact, CouldMakeIntro } from "@/types/database";
import { addCompanyRelationshipContact } from "./relationship-actions";

const INTRO_OPTIONS: Array<{ value: CouldMakeIntro; label: string }> = [
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

function introLabel(v: CouldMakeIntro) {
  return v === "yes" ? "Yes" : v === "maybe" ? "Maybe" : "No";
}

export function RelationshipAssist({
  companyId,
  initialContacts,
}: {
  companyId: string;
  initialContacts: CompanyRelationshipContact[];
}) {
  const [contacts, setContacts] = useState<CompanyRelationshipContact[]>(initialContacts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactName, setContactName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [relationshipToYou, setRelationshipToYou] = useState("");
  const [couldMakeIntro, setCouldMakeIntro] = useState<CouldMakeIntro>("maybe");
  const [notes, setNotes] = useState("");

  const canSubmit = useMemo(() => contactName.trim().length > 0 && !loading, [contactName, loading]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    const res = await addCompanyRelationshipContact({
      companyId,
      contact_name: contactName,
      role,
      company,
      relationship_to_you: relationshipToYou,
      could_make_intro: couldMakeIntro,
      notes,
    });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    if (res.contact) {
      setContacts((prev) => [res.contact!, ...prev]);
      setContactName("");
      setRole("");
      setCompany("");
      setRelationshipToYou("");
      setCouldMakeIntro("maybe");
      setNotes("");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-secondary">
          Add a contact who works here or might be able to connect you.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {error && (
          <div className="rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Contact name</label>
            <input
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
              placeholder="Jane Doe"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Role</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
              placeholder="VP Engineering"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Company</label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
              placeholder="Monzo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-secondary">Relationship to you</label>
            <input
              value={relationshipToYou}
              onChange={(e) => setRelationshipToYou(e.target.value)}
              className="w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
              placeholder="Former colleague"
            />
          </div>
          <div className="space-y-1 md:col-span-1">
            <label className="text-xs font-medium text-secondary">Could they make an intro?</label>
            <select
              value={couldMakeIntro}
              onChange={(e) => setCouldMakeIntro(e.target.value as CouldMakeIntro)}
              className="w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
            >
              {INTRO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-xs font-medium text-secondary">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[88px] w-full rounded-md border border-border bg-sidebar px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-data-blue"
              placeholder="Context, last spoke, what to ask for, etc."
            />
          </div>
        </div>

        <div className="flex items-center justify-end">
          <Button type="submit" disabled={!canSubmit} className="bg-foreground text-background hover:opacity-90">
            {loading ? "Adding..." : "Add contact"}
          </Button>
        </div>
      </form>

      {contacts.length > 0 && (
        <div className="border-t border-border pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-secondary mb-2">Saved contacts</p>
          <ul className="space-y-2">
            {contacts.map((c) => (
              <li key={c.id} className="rounded-md border border-border bg-card/40 px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {c.contact_name}
                      {c.role ? <span className="text-secondary font-normal"> · {c.role}</span> : null}
                      {c.company ? <span className="text-secondary font-normal"> · {c.company}</span> : null}
                    </p>
                    {(c.relationship_to_you || c.notes) && (
                      <p className="mt-0.5 text-xs text-secondary">
                        {c.relationship_to_you ? `${c.relationship_to_you}` : ""}
                        {c.relationship_to_you && c.notes ? " · " : ""}
                        {c.notes ? c.notes : ""}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      c.could_make_intro === "yes"
                        ? "text-[11px] font-semibold uppercase tracking-wide text-signal-green"
                        : c.could_make_intro === "no"
                          ? "text-[11px] font-semibold uppercase tracking-wide text-red-400"
                          : "text-[11px] font-semibold uppercase tracking-wide text-secondary"
                    }
                  >
                    Intro: {introLabel(c.could_make_intro)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

