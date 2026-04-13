import { useState } from "react";

import { formatDate, parseTags } from "../lib/format";
import { providerVisuals } from "../lib/providers";
import type { ApiKeyRecord, Category } from "../types";

type KeyFormState = {
  name: string;
  rate_limit_per_minute: number;
  allowed_categories: string;
  notes: string;
};

const defaultForm: KeyFormState = {
  name: "",
  rate_limit_per_minute: 30,
  allowed_categories: "grok, flow",
  notes: "",
};

export function ApiKeysPage({
  apiKeys,
  onCreate,
  onUpdate,
  lastCreatedKey,
}: {
  apiKeys: ApiKeyRecord[];
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  lastCreatedKey: string | null;
}) {
  const [form, setForm] = useState<KeyFormState>(defaultForm);

  const submit = async () => {
    await onCreate({
      name: form.name,
      rate_limit_per_minute: form.rate_limit_per_minute,
      allowed_categories: parseTags(form.allowed_categories),
      notes: form.notes || null,
    });
    setForm(defaultForm);
  };

  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">API Keys</p>
            <h2>Expose gateway access to client users</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Rate limit / minute</span>
            <input
              min={1}
              type="number"
              value={form.rate_limit_per_minute}
              onChange={(event) => setForm({ ...form, rate_limit_per_minute: Number(event.target.value) })}
            />
          </label>
          <label className="wide">
            <span>Allowed categories</span>
            <input
              value={form.allowed_categories}
              onChange={(event) => setForm({ ...form, allowed_categories: event.target.value })}
            />
          </label>
          <label className="wide">
            <span>Notes</span>
            <input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          </label>
        </div>
        <div className="action-row">
          <button className="action-button" type="button" onClick={() => void submit()}>
            Create API key
          </button>
        </div>
        {lastCreatedKey ? (
          <div className="secret-banner">
            <span>Plain key</span>
            <code>{lastCreatedKey}</code>
          </div>
        ) : null}
      </section>

      <section className="page-band">
        <div className="data-table-wrap">
          <table className="data-table data-table-keys">
            <thead>
              <tr>
                <th>Name</th>
                <th>Prefix</th>
                <th>Categories</th>
                <th>Rate limit</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {apiKeys.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="stacked-cell">
                      <strong>{record.name}</strong>
                      <small>{record.notes ?? "No note"}</small>
                    </div>
                  </td>
                  <td>
                    <code>{record.key_prefix}</code>
                  </td>
                  <td>
                    <div className="chip-row">
                      {record.allowed_categories.map((category) => (
                        <span key={category} className="tag-chip">
                          {providerVisuals[category as Category].label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="table-inline-tag">{record.rate_limit_per_minute}/min</span>
                  </td>
                  <td>
                    <button
                      className={`mini-button ${record.is_active ? "" : "danger"}`}
                      type="button"
                      onClick={() =>
                        void onUpdate(record.id, {
                          is_active: !record.is_active,
                        })
                      }
                    >
                      {record.is_active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td>{formatDate(record.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
