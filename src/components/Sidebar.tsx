import { useState } from "react";

type TabKey = "overview" | "profiles" | "proxies" | "keys" | "settings" | "jobs" | "api-docs";

function HeaderIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="nav-icon">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const items: Array<{ key: TabKey; label: string; icon: string }> = [
  { key: "overview", label: "Dashboard", icon: "M4 5h7v6H4zM13 5h7v4h-7zM13 11h7v8h-7zM4 13h7v6H4z" },
  { key: "profiles", label: "Profiles", icon: "M8 7h8M8 12h8M8 17h5M5 7h.01M5 12h.01M5 17h.01" },
  { key: "proxies", label: "Network", icon: "M5 7h14M5 12h9M5 17h14M17 12l2 2 3-3" },
  { key: "jobs", label: "Task Jobs", icon: "M8 7h11M8 12h11M8 17h11M4 7h.01M4 12h.01M4 17h.01" },
  { key: "api-docs", label: "API Docs", icon: "M8 5h8l3 3v11H8zM16 5v3h3M5 7v12h8" },
  { key: "keys", label: "Keys", icon: "M14 8a4 4 0 1 1 2.5 7.1L14 17h-2v2h-2v-2H8v-2h2l2-2" },
  { key: "settings", label: "Settings", icon: "M12 8.5a3.5 3.5 0 1 1 0 7a3.5 3.5 0 0 1 0-7ZM19 12l2-1-1-3-2 .2-.9-1.5 1.1-1.7-2.3-2.3-1.7 1.1L12.8 3 12 1 9 2l.2 2-1.5.9-1.7-1.1L3.7 6l1.1 1.7-.9 1.5-2-.2L1 12l2 1-.2 2 3 1 .9 1.5-1.1 1.7L6 21.3l1.7-1.1 1.5.9.2 2 3 1 .8-2 1.5-.9 1.7 1.1 2.3-2.3-1.1-1.7.9-1.5 2 .2 1-3z" },
];

export function Sidebar({
  activeTab,
  onSelect,
  username,
  onSignOut,
}: {
  activeTab: TabKey;
  onSelect: (key: TabKey) => void;
  username: string;
  onSignOut: () => void;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <aside className="sidebar">
      <div className="mobile-topbar">
        <button
          className="mobile-nav-toggle"
          type="button"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Toggle navigation"
        >
          <HeaderIcon path="M4 6h16M4 12h16M4 18h16" />
        </button>
        <div className="mobile-brand">
          <div className="brand-mark" aria-hidden="true">
            <HeaderIcon path="M5 7.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 15 7.5v9A2.5 2.5 0 0 1 12.5 19h-5A2.5 2.5 0 0 1 5 16.5zM15 9l4-2v10l-4-2" />
          </div>
          <span>PlenxEditor</span>
        </div>
        <div className="mobile-user">
          <span>{username}</span>
          <button className="header-logout" type="button" onClick={onSignOut} aria-label="Sign out">
            <HeaderIcon path="M15 8l5 4-5 4M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
          </button>
        </div>
      </div>
      <div className={`mobile-drawer ${mobileOpen ? "open" : ""}`} aria-hidden={!mobileOpen}>
        <div className="mobile-drawer-backdrop" onClick={() => setMobileOpen(false)} />
        <div className="mobile-drawer-panel">
          <div className="mobile-drawer-header">
            <div className="brand-mark" aria-hidden="true">
              <HeaderIcon path="M5 7.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 15 7.5v9A2.5 2.5 0 0 1 12.5 19h-5A2.5 2.5 0 0 1 5 16.5zM15 9l4-2v10l-4-2" />
            </div>
            <span>PlenxEditor</span>
            <button className="mobile-drawer-close" type="button" onClick={() => setMobileOpen(false)}>
              <HeaderIcon path="M6 6l12 12M18 6l-12 12" />
            </button>
          </div>
          <nav className="mobile-drawer-nav">
            {items.map((item) => (
              <button
                key={item.key}
                className={`mobile-drawer-item ${activeTab === item.key ? "active" : ""}`}
                onClick={() => {
                  onSelect(item.key);
                  setMobileOpen(false);
                }}
                type="button"
              >
                <HeaderIcon path={item.icon} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <HeaderIcon path="M5 7.5a2.5 2.5 0 0 1 2.5-2.5h5A2.5 2.5 0 0 1 15 7.5v9A2.5 2.5 0 0 1 12.5 19h-5A2.5 2.5 0 0 1 5 16.5zM15 9l4-2v10l-4-2" />
        </div>
        <h1>PlenxEditor</h1>
      </div>
      <nav className="nav-list">
        {items.map((item) => (
          <button
            key={item.key}
            className={`nav-item ${activeTab === item.key ? "active" : ""}`}
            onClick={() => onSelect(item.key)}
            type="button"
          >
            <HeaderIcon path={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="header-user">
        <span className="header-username">{username}</span>
        <button className="header-logout" type="button" onClick={onSignOut} aria-label="Sign out">
          <HeaderIcon path="M15 8l5 4-5 4M20 12H9M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        </button>
      </div>
    </aside>
  );
}

export type { TabKey };
