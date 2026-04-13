type TabKey = "overview" | "profiles" | "proxies" | "keys" | "settings" | "jobs";

const items: Array<{ key: TabKey; label: string; hint: string }> = [
  { key: "overview", label: "Overview", hint: "Gateway health" },
  { key: "profiles", label: "Profiles", hint: "Cookie and cache" },
  { key: "proxies", label: "Proxies", hint: "Network routing" },
  { key: "keys", label: "API Keys", hint: "Client access" },
  { key: "settings", label: "Settings", hint: "Concurrency" },
  { key: "jobs", label: "Jobs", hint: "Queue and retry" },
];

export function Sidebar({
  activeTab,
  onSelect,
}: {
  activeTab: TabKey;
  onSelect: (key: TabKey) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand-block">
        <p className="eyebrow">Gateway</p>
        <h1>Grok Control</h1>
        <p className="muted">
          React admin cho gateway backend, không mang browser automation lên client.
        </p>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? "active" : ""}`}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <span>{item.label}</span>
            <small>{item.hint}</small>
          </button>
        ))}
      </nav>
    </aside>
  );
}

export type { TabKey };
