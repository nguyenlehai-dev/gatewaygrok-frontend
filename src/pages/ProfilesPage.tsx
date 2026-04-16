import { useEffect, useMemo, useState } from "react";

import { formatDate, parseTags } from "../lib/format";
import { providerVisuals } from "../lib/providers";
import type { Category, MetaRecord, Profile, ProxyRecord, SessionCheckRecord } from "../types";

type ProfileFormState = {
  name: string;
  category: Category;
  description: string;
  proxy_id: string;
  tags: string;
  concurrency_limit: number;
  user_agent: string;
  locale: string;
  timezone_id: string;
  color_scheme: string;
  viewport_width: number;
  viewport_height: number;
  platform: string;
  hardware_concurrency: number;
};

const defaultForm: ProfileFormState = {
  name: "",
  category: "grok",
  description: "",
  proxy_id: "",
  tags: "",
  concurrency_limit: 1,
  user_agent: "",
  locale: "en-US",
  timezone_id: "UTC",
  color_scheme: "dark",
  viewport_width: 1440,
  viewport_height: 900,
  platform: "Win32",
  hardware_concurrency: 8,
};

function toPayload(state: ProfileFormState) {
  return {
    name: state.name,
    category: state.category,
    description: state.description || null,
    proxy_id: state.proxy_id || null,
    tags: parseTags(state.tags),
    concurrency_limit: Number(state.concurrency_limit),
    antidetect: {
      user_agent: state.user_agent || null,
      locale: state.locale || null,
      timezone_id: state.timezone_id || null,
      color_scheme: state.color_scheme || null,
      viewport_width: Number(state.viewport_width),
      viewport_height: Number(state.viewport_height),
      platform: state.platform || null,
      hardware_concurrency: Number(state.hardware_concurrency),
    },
  };
}

export function ProfilesPage({
  meta,
  profiles,
  proxies,
  onCreate,
  onUpdate,
  onDelete,
  onImportCookies,
  onSessionCheck,
  onLaunchLogin,
}: {
  meta: MetaRecord | null;
  profiles: Profile[];
  proxies: ProxyRecord[];
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onUpdate: (id: string, payload: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onImportCookies: (profileId: string, file: File) => Promise<void>;
  onSessionCheck: (profileId: string) => Promise<SessionCheckRecord>;
  onLaunchLogin: (profileId: string) => Promise<void>;
}) {
  const [form, setForm] = useState<ProfileFormState>(defaultForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cookieUploads, setCookieUploads] = useState<Record<string, File | null>>({});
  const [sessionChecks, setSessionChecks] = useState<Record<string, SessionCheckRecord>>(() => {
    if (typeof window === "undefined") {
      return {};
    }
    try {
      const stored = window.localStorage.getItem("gatewaygrok.sessionChecks");
      return stored ? (JSON.parse(stored) as Record<string, SessionCheckRecord>) : {};
    } catch {
      return {};
    }
  });
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => a.name.localeCompare(b.name)),
    [profiles],
  );
  const activeProfiles = profiles.filter((profile) => profile.is_active).length;
  const browserReadyProfiles = Object.values(sessionChecks).filter(
    (session) => session.state === "authenticated" && session.live_browser_connected,
  ).length;
  const cookieReadyProfiles = profiles.filter((profile) => Boolean(profile.cookie_file)).length;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem("gatewaygrok.sessionChecks", JSON.stringify(sessionChecks));
    } catch {
      // ignore storage failures
    }
  }, [sessionChecks]);

  useEffect(() => {
    const profileIds = new Set(profiles.map((profile) => profile.id));
    setSessionChecks((current) => {
      const next: Record<string, SessionCheckRecord> = {};
      for (const [key, value] of Object.entries(current)) {
        if (profileIds.has(key)) {
          next[key] = value;
        }
      }
      return next;
    });
  }, [profiles]);

  const startEdit = (profile: Profile) => {
    setEditingId(profile.id);
    setForm({
      name: profile.name,
      category: profile.category,
      description: profile.description ?? "",
      proxy_id: profile.proxy_id ?? "",
      tags: profile.tags.join(", "),
      concurrency_limit: profile.concurrency_limit,
      user_agent: profile.antidetect?.user_agent ?? "",
      locale: profile.antidetect?.locale ?? "en-US",
      timezone_id: profile.antidetect?.timezone_id ?? "UTC",
      color_scheme: profile.antidetect?.color_scheme ?? "dark",
      viewport_width: profile.antidetect?.viewport_width ?? 1440,
      viewport_height: profile.antidetect?.viewport_height ?? 900,
      platform: profile.antidetect?.platform ?? "Win32",
      hardware_concurrency: profile.antidetect?.hardware_concurrency ?? 8,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultForm);
  };

  const handleSubmit = async () => {
    const payload = toPayload(form);
    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onCreate(payload);
    }
    resetForm();
  };

  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Profiles</p>
            <h2>Cookie-isolated browser identities</h2>
          </div>
        </div>

        <div className="profile-summary-grid">
          <article className="profile-summary-card">
            <small>Total profiles</small>
            <strong>{profiles.length}</strong>
            <span>{activeProfiles} active</span>
          </article>
          <article className="profile-summary-card">
            <small>Cookie ready</small>
            <strong>{cookieReadyProfiles}</strong>
            <span>{profiles.length - cookieReadyProfiles} missing</span>
          </article>
          <article className="profile-summary-card">
            <small>Browser live</small>
            <strong>{browserReadyProfiles}</strong>
            <span>ready for queue work</span>
          </article>
        </div>

        <div className="form-grid">
          <label>
            <span>Name</span>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            <span>Category</span>
            <select
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value as Category })}
              disabled={Boolean(editingId)}
            >
              {(meta?.categories ?? []).map((category) => (
                <option key={category} value={category}>
                  {providerVisuals[category].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Proxy</span>
            <select value={form.proxy_id} onChange={(event) => setForm({ ...form, proxy_id: event.target.value })}>
              <option value="">No proxy</option>
              {proxies.map((proxy) => (
                <option key={proxy.id} value={proxy.id}>
                  {proxy.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Concurrency limit</span>
            <input
              min={1}
              type="number"
              value={form.concurrency_limit}
              onChange={(event) => setForm({ ...form, concurrency_limit: Number(event.target.value) })}
            />
          </label>
          <label className="wide">
            <span>Description</span>
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </label>
          <label className="wide">
            <span>Tags</span>
            <input value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} />
          </label>
        </div>

        <div className="page-heading minor">
          <div>
            <p className="eyebrow">Antidetect</p>
            <h3>Baseline browser fingerprint</h3>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>User agent</span>
            <input value={form.user_agent} onChange={(event) => setForm({ ...form, user_agent: event.target.value })} />
          </label>
          <label>
            <span>Locale</span>
            <input value={form.locale} onChange={(event) => setForm({ ...form, locale: event.target.value })} />
          </label>
          <label>
            <span>Timezone</span>
            <input
              value={form.timezone_id}
              onChange={(event) => setForm({ ...form, timezone_id: event.target.value })}
            />
          </label>
          <label>
            <span>Color scheme</span>
            <select
              value={form.color_scheme}
              onChange={(event) => setForm({ ...form, color_scheme: event.target.value })}
            >
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </label>
          <label>
            <span>Viewport width</span>
            <input
              min={800}
              type="number"
              value={form.viewport_width}
              onChange={(event) => setForm({ ...form, viewport_width: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Viewport height</span>
            <input
              min={600}
              type="number"
              value={form.viewport_height}
              onChange={(event) => setForm({ ...form, viewport_height: Number(event.target.value) })}
            />
          </label>
          <label>
            <span>Platform</span>
            <input value={form.platform} onChange={(event) => setForm({ ...form, platform: event.target.value })} />
          </label>
          <label>
            <span>Hardware concurrency</span>
            <input
              min={1}
              type="number"
              value={form.hardware_concurrency}
              onChange={(event) => setForm({ ...form, hardware_concurrency: Number(event.target.value) })}
            />
          </label>
        </div>

        <div className="action-row">
          <button className="action-button" type="button" onClick={() => void handleSubmit()}>
            {editingId ? "Save profile" : "Create profile"}
          </button>
          {editingId ? (
            <button className="ghost-button" type="button" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Inventory</p>
            <h2>Profile list</h2>
          </div>
        </div>

        <div className="profiles-helper-strip">
          <span>1. Upload cookie</span>
          <span>2. Check session</span>
          <span>3. Launch login if needed</span>
          <span>4. Keep browser alive for Grok jobs</span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table data-table-profiles">
            <thead>
              <tr>
                <th>Profile</th>
                <th>Cookie</th>
                <th>Session</th>
                <th>Proxy</th>
                <th>Storage</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((profile) => {
                const selectedFile = cookieUploads[profile.id];
                const session = sessionChecks[profile.id];
                return (
                  <tr key={profile.id}>
                    <td>
                      <div className="identity-cell">
                        <img
                          alt={providerVisuals[profile.category].label}
                          className="mini-logo"
                          src={providerVisuals[profile.category].image}
                        />
                        <div>
                          <strong>{profile.name}</strong>
                          <small>
                            {providerVisuals[profile.category].label} · {profile.concurrency_limit} slot
                          </small>
                          <div className="chip-row">
                            <span className="table-inline-tag">{profile.category}</span>
                            {profile.tags.map((tag) => (
                              <span key={tag} className="tag-chip">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="stacked-cell">
                        <span className={`status-pill ${profile.cookie_file ? "status-succeeded" : "status-failed"}`}>
                          {profile.cookie_file ? "Imported" : "Missing"}
                        </span>
                        <input
                          type="file"
                          accept=".txt,.json"
                          onChange={(event) =>
                            setCookieUploads({
                              ...cookieUploads,
                              [profile.id]: event.target.files?.[0] ?? null,
                            })
                          }
                        />
                        <button
                          className="mini-button"
                          disabled={!selectedFile}
                          type="button"
                          onClick={async () => {
                            if (!selectedFile) {
                              return;
                            }
                            await onImportCookies(profile.id, selectedFile);
                            setCheckingId(profile.id);
                            try {
                              const result = await onSessionCheck(profile.id);
                              setSessionChecks((current) => ({ ...current, [profile.id]: result }));
                            } finally {
                              setCheckingId(null);
                            }
                          }}
                        >
                          Upload cookie + check
                        </button>
                      </div>
                    </td>
                    <td>
                      <div className="stacked-cell">
                        <span className={`status-pill status-${session?.state ?? "unknown"}`}>
                          {session?.state ?? "unchecked"}
                        </span>
                        {session?.requires_live_browser ? (
                          <span
                            className={`status-pill ${session.live_browser_connected ? "status-browser_live" : "status-browser_missing"}`}
                          >
                            {session.live_browser_connected ? "browser attached" : "browser closed"}
                          </span>
                        ) : null}
                        <small>{session?.summary ?? "Run session check after importing cookie."}</small>
                        {session?.requires_live_browser ? (
                          <small>
                            {session.live_browser_connected
                              ? "Grok can run jobs on this live profile browser."
                              : "Launch login and keep that browser open before running Grok jobs."}
                          </small>
                        ) : null}
                        {session?.indicators.length ? <small>{session.indicators.join(", ")}</small> : null}
                        <button
                          className="mini-button"
                          disabled={checkingId === profile.id}
                          type="button"
                          onClick={async () => {
                            setCheckingId(profile.id);
                            try {
                              const result = await onSessionCheck(profile.id);
                              setSessionChecks((current) => ({ ...current, [profile.id]: result }));
                            } finally {
                              setCheckingId(null);
                            }
                          }}
                        >
                          {checkingId === profile.id ? "Checking..." : "Check session"}
                        </button>
                        <button
                          className="mini-button"
                          type="button"
                          onClick={() => void onLaunchLogin(profile.id)}
                        >
                          Launch login
                        </button>
                        {session ? (
                          <details className="session-details">
                            <summary>Details</summary>
                            <div className="stacked-cell">
                              <small>{session.title}</small>
                              <small>{session.page_url}</small>
                              <small>{session.body_preview}</small>
                              <small>{session.screenshot_path}</small>
                              {session.screenshot_data_url ? (
                                <img
                                  alt={`${profile.name} session check`}
                                  className="session-preview"
                                  src={session.screenshot_data_url}
                                />
                              ) : null}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      <div className="stacked-cell">
                        <strong>{proxies.find((proxy) => proxy.id === profile.proxy_id)?.name ?? "-"}</strong>
                        <small>{profile.proxy_id ? "Attached" : "No proxy"}</small>
                      </div>
                    </td>
                    <td>
                      <div className="stacked-cell path-stack">
                        <code>{profile.cache_dir}</code>
                        <code>{profile.user_data_dir}</code>
                      </div>
                    </td>
                    <td>{formatDate(profile.updated_at)}</td>
                    <td>
                      <div className="action-stack">
                        <button className="mini-button" type="button" onClick={() => startEdit(profile)}>
                          Edit
                        </button>
                        <button className="mini-button danger" type="button" onClick={() => void onDelete(profile.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
