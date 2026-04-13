import { providerVisuals } from "../lib/providers";
import type { MetaRecord, OverviewRecord } from "../types";

export function OverviewPage({
  overview,
  meta,
  onRefresh,
}: {
  overview: OverviewRecord | null;
  meta: MetaRecord | null;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Overview</p>
            <h2>Gateway operations</h2>
          </div>
          <button className="action-button" type="button" onClick={() => void onRefresh()}>
            Refresh
          </button>
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
