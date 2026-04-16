import { useState } from "react";

import { parseTags } from "../lib/format";
import { providerVisuals } from "../lib/providers";
import type { ApiKeyRecord, MetaRecord, OverviewRecord } from "../types";

type DashboardKeyForm = {
  name: string;
  rate_limit_per_minute: number;
  allowed_categories: string;
  notes: string;
};

export function OverviewPage({
  overview,
  meta,
  onRefresh,
  apiKeys,
  lastCreatedKey,
  onCreateApiKey,
  onToggleApiKey,
  systemAuthVerified,
  systemAuthBusy,
  onVerifyCreatedKey,
}: {
  overview: OverviewRecord | null;
  meta: MetaRecord | null;
  onRefresh: () => Promise<void>;
  apiKeys: ApiKeyRecord[];
  lastCreatedKey: string | null;
  onCreateApiKey: (payload: Record<string, unknown>) => Promise<void>;
  onToggleApiKey: (id: string, payload: Record<string, unknown>) => Promise<void>;
  systemAuthVerified: boolean;
  systemAuthBusy: boolean;
  onVerifyCreatedKey: (keyName: string) => void;
}) {
  const [creatingKey, setCreatingKey] = useState(false);
  const [createKeyError, setCreateKeyError] = useState("");
  const [keyForm, setKeyForm] = useState<DashboardKeyForm>({
    name: "",
    rate_limit_per_minute: 30,
    allowed_categories: "grok, flow",
    notes: "",
  });
  const queueTotal =
    (overview?.queue.pending ?? 0) +
    (overview?.queue.running ?? 0) +
    (overview?.queue.succeeded ?? 0) +
    (overview?.queue.failed ?? 0);

  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">API Keys</p>
            <h2>Control client access</h2>
          </div>
          <button className="action-button" type="button" onClick={() => void onRefresh()}>
            Refresh
          </button>
        </div>

        <div className="dashboard-key-grid">
          <article className="dashboard-key-card dashboard-key-list-card">
            <div className="stacked-cell">
              <strong>Your Secret Keys</strong>
              <small>Do not share your API keys with others. Disable any key that should stop hitting the gateway.</small>
            </div>

            <div className="dashboard-key-list">
              {apiKeys.length ? (
                apiKeys.slice(0, 4).map((record) => (
                  <div key={record.id} className="dashboard-key-row">
                    <div className="stacked-cell">
                      <strong>{record.name}</strong>
                      <small>Prefix: {record.key_prefix}</small>
                    </div>
                    <div className="action-row">
                      <button
                        className={`mini-button ${record.is_active ? "" : "danger"}`}
                        type="button"
                        onClick={() => void onToggleApiKey(record.id, { is_active: !record.is_active })}
                      >
                        {record.is_active ? "Active" : "Disabled"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="dashboard-key-empty">No API key yet. Create one to unlock client testing and job tracking.</div>
              )}
            </div>
          </article>

          <div className="dashboard-key-side">
            {lastCreatedKey ? (
              <article className="dashboard-key-card dashboard-key-success-card">
                <div className="stacked-cell">
                  <strong>Key Created Successfully!</strong>
                  <small>
                    {systemAuthVerified
                      ? "This key is already applied to System Auth."
                      : "Press Verify Key to apply this key into System Auth now."}
                  </small>
                </div>
                <div className="dashboard-key-success-row">
                  <code>{lastCreatedKey}</code>
                  <button
                    className="mini-button"
                    disabled={systemAuthBusy || systemAuthVerified}
                    type="button"
                    onClick={() => onVerifyCreatedKey(keyForm.name || "Studio Key")}
                  >
                    {systemAuthVerified ? "Applied" : systemAuthBusy ? "Verifying..." : "Verify Key"}
                  </button>
                </div>
              </article>
            ) : null}

            <article className="dashboard-key-card dashboard-key-form-card">
              <div className="stacked-cell">
                <strong>Create new key</strong>
                <small>Use a clear name so people know which integration is calling the gateway.</small>
              </div>

              <label className="dashboard-key-field">
                <span>Name / Identifier</span>
                <input
                  placeholder="e.g. Production Server"
                  value={keyForm.name}
                  onChange={(event) => setKeyForm({ ...keyForm, name: event.target.value })}
                />
              </label>

              <label className="dashboard-key-field">
                <span>Allowed categories</span>
                <input
                  value={keyForm.allowed_categories}
                  onChange={(event) => setKeyForm({ ...keyForm, allowed_categories: event.target.value })}
                />
              </label>

              <button
                className="dashboard-key-submit"
                disabled={creatingKey}
                type="button"
                onClick={async () => {
                  const nextName = keyForm.name || "Studio Key";
                  setCreatingKey(true);
                  setCreateKeyError("");
                  try {
                    await onCreateApiKey({
                      name: nextName,
                      rate_limit_per_minute: keyForm.rate_limit_per_minute,
                      allowed_categories: parseTags(keyForm.allowed_categories),
                      notes: keyForm.notes || null,
                    });
                    setKeyForm({
                      name: nextName,
                      rate_limit_per_minute: 30,
                      allowed_categories: "grok, flow",
                      notes: "",
                    });
                  } catch (error) {
                    setCreateKeyError(error instanceof Error ? error.message : "Unable to create API key");
                  } finally {
                    setCreatingKey(false);
                  }
                }}
              >
                {creatingKey ? "Generating..." : "Generate Key"}
              </button>
              {createKeyError ? <div className="dashboard-key-error">{createKeyError}</div> : null}
            </article>
          </div>
        </div>
      </section>

      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Gateway operations</h2>
          </div>
        </div>

        <div className="overview-hero">
          <article className="overview-hero-card overview-hero-primary">
            <p className="eyebrow">Operations Snapshot</p>
            <h3>Gateway live control surface</h3>
            <p className="muted">
              Track active profiles, queue pressure, and provider readiness from one dashboard.
            </p>
            <div className="overview-hero-metrics">
              <div>
                <small>Total queue</small>
                <strong>{queueTotal}</strong>
              </div>
              <div>
                <small>Running now</small>
                <strong>{overview?.queue.running ?? 0}</strong>
              </div>
              <div>
                <small>Failed</small>
                <strong>{overview?.queue.failed ?? 0}</strong>
              </div>
            </div>
          </article>

          <article className="overview-hero-card">
            <p className="eyebrow">Capacity</p>
            <div className="overview-mini-list">
              <div className="overview-mini-row">
                <span>Profiles online</span>
                <strong>{overview?.profiles.active ?? 0}</strong>
              </div>
              <div className="overview-mini-row">
                <span>API keys active</span>
                <strong>{overview?.api_keys.active ?? 0}</strong>
              </div>
              <div className="overview-mini-row">
                <span>Proxies enabled</span>
                <strong>{overview?.proxies.active ?? 0}</strong>
              </div>
            </div>
          </article>
        </div>

        <div className="stats-grid">
          <article className="stat-tile">
            <span>Total Profiles</span>
            <strong>{overview?.profiles.total ?? "-"}</strong>
            <small>{overview?.profiles.active ?? 0} active</small>
          </article>
          <article className="stat-tile">
            <span>Total Proxies</span>
            <strong>{overview?.proxies.total ?? "-"}</strong>
            <small>{overview?.proxies.active ?? 0} enabled</small>
          </article>
          <article className="stat-tile">
            <span>Total API Keys</span>
            <strong>{overview?.api_keys.total ?? "-"}</strong>
            <small>{overview?.api_keys.active ?? 0} active</small>
          </article>
          <article className="stat-tile">
            <span>Queue Pending</span>
            <strong>{overview?.queue.pending ?? "-"}</strong>
            <small>{overview?.queue.running ?? 0} running</small>
          </article>
          <article className="stat-tile">
            <span>Queue Succeeded</span>
            <strong>{overview?.queue.succeeded ?? "-"}</strong>
            <small>{overview?.queue.failed ?? 0} failed</small>
          </article>
        </div>
      </section>

      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Providers</p>
            <h2>Capabilities by category</h2>
          </div>
        </div>

        <div className="provider-grid">
          {meta?.providers.map((provider) => {
            const visual = providerVisuals[provider.category];
            return (
              <article
                key={provider.category}
                className="provider-card"
                style={{ backgroundColor: visual.surface, borderColor: visual.accent }}
              >
                <img alt={visual.label} className="provider-image" src={visual.image} />
                <div className="provider-copy">
                  <div className="provider-topline">
                    <strong>{visual.label}</strong>
                    <span>{provider.targets.join(", ")}</span>
                  </div>
                  <p>{provider.start_url}</p>
                  <small>{provider.notes ?? "Ready for cookie import, proxy and antidetect setup."}</small>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Category mix</p>
            <h2>Profile allocation</h2>
          </div>
        </div>
        <div className="bar-list">
          {(overview?.categories ?? []).map((item) => (
            <div key={item.category} className="bar-row">
              <label>{providerVisuals[item.category].label}</label>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.max(10, (item.total / Math.max(overview?.profiles.total ?? 1, 1)) * 100)}%`,
                    backgroundColor: providerVisuals[item.category].accent,
                  }}
                />
              </div>
              <span>{item.total}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
