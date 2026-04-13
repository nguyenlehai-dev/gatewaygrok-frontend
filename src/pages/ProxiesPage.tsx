import { useState } from "react";

import { formatDate } from "../lib/format";
import type { ProxyRecord } from "../types";

type ProxyFormState = {
  name: string;
  server: string;
  port: number;
  username: string;
  password: string;
  kind: string;
  country: string;
  sticky_session: boolean;
  enabled: boolean;
};

const defaultForm: ProxyFormState = {
  name: "",
  server: "",
  port: 8000,
  username: "",
  password: "",
  kind: "http",
  country: "",
  sticky_session: false,
  enabled: true,
};

export function ProxiesPage({
  proxies,
  onCreate,
  onUpdate,
  onDelete,
}: {
  proxies: ProxyRecord[];
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ProxyFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const submit = async () => {
    const payload = {
      ...form,
      username: form.username || null,
      password: form.password || null,
      country: form.country || null,
    };
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    reset();
  };

  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Proxies</p>
            <h2>Route browser traffic by profile</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Host</span>
            <input value={form.server} onChange={(event) => setForm({ ...form, server: event.target.value })} />
          </label>
          <label>
            <span>Port</span>
            <input
              type="number"
              value={form.port}
              onChange={(event) => setForm({ ...form, port: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Kind</span>
            <select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value })}>
              <option value="http">http</option>
              <option value="https">https</option>
              <option value="socks5">socks5</option>
            </select>
          </label>
          <label>
            <span>Username</span>
            <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
          </label>
          <label>
            <span>Password</span>
            <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
          </label>
          <label>
            <span>Country</span>
            <input value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} />
          </label>
          <label className="toggle-field">
            <span>Sticky session</span>
            <input
              checked={form.sticky_session}
              type="checkbox"
              onChange={(event) => setForm({ ...form, sticky_session: event.target.checked })}
            />
          </label>
          <label className="toggle-field">
            <span>Enabled</span>
            <input
              checked={form.enabled}
              type="checkbox"
              onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
            />
          </label>
        </div>
        <div className="action-row">
          <button className="action-button" type="button" onClick={() => void submit()}>
            {editingId ? "Save proxy" : "Create proxy"}
          </button>
          {editingId ? (
            <button className="ghost-button" type="button" onClick={reset}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="page-band">
        <div className="data-table-wrap">
          <table className="data-table data-table-proxies">
            <thead>
              <tr>
                <th>Name</th>
                <th>Endpoint</th>
                <th>Geo</th>
                <th>Status</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {proxies.map((proxy) => (
                <tr key={proxy.id}>
                  <td>
                    <div className="stacked-cell">
                      <strong>{proxy.name}</strong>
                      <div className="chip-row">
                        <span className="table-inline-tag">{proxy.kind}</span>
                        {proxy.sticky_session ? <span className="tag-chip">sticky</span> : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code>{`${proxy.server}:${proxy.port}`}</code>
                  </td>
                  <td>{proxy.country ?? "-"}</td>
                  <td>
                    <span className={`status-pill ${proxy.enabled ? "status-succeeded" : "status-failed"}`}>
                      {proxy.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </td>
                  <td>{formatDate(proxy.updated_at)}</td>
                  <td>
                    <div className="action-stack">
                      <button
                        className="mini-button"
                        type="button"
                        onClick={() => {
                          setEditingId(proxy.id);
                          setForm({
                            name: proxy.name,
                            server: proxy.server,
                            port: proxy.port,
                            username: proxy.username ?? "",
                            password: proxy.password ?? "",
                            kind: proxy.kind,
                            country: proxy.country ?? "",
                            sticky_session: proxy.sticky_session,
                            enabled: proxy.enabled,
                          });
                        }}
                      >
                        Edit
                      </button>
                      <button className="mini-button danger" type="button" onClick={() => void onDelete(proxy.id)}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
