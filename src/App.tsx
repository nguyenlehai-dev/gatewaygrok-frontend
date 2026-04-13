import { useCallback, useEffect, useMemo, useState } from "react";

import { api, getAdminToken, setAdminToken } from "./api/client";
import { Sidebar, type TabKey } from "./components/Sidebar";
import { ToastBar } from "./components/ToastBar";
import { ApiKeysPage } from "./pages/ApiKeysPage";
import { JobsPage } from "./pages/JobsPage";
import { LoginPage } from "./pages/LoginPage";
import { OverviewPage } from "./pages/OverviewPage";
import { ProfilesPage } from "./pages/ProfilesPage";
import { ProxiesPage } from "./pages/ProxiesPage";
import { SettingsPage } from "./pages/SettingsPage";
import type {
  ApiKeyCreated,
  ApiKeyRecord,
  AuthBootstrap,
  JobRecord,
  MetaRecord,
  OverviewRecord,
  Profile,
  ProxyRecord,
  SettingsRecord,
  Toast,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const SYSTEM_AUTH_KEY = "gateway_system_api_key";
const SYSTEM_AUTH_NAME = "gateway_system_api_key_name";

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [meta, setMeta] = useState<MetaRecord | null>(null);
  const [overview, setOverview] = useState<OverviewRecord | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [proxies, setProxies] = useState<ProxyRecord[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [settings, setSettings] = useState<SettingsRecord | null>(null);
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [lastCreatedKey, setLastCreatedKey] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [authBusy, setAuthBusy] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(Boolean(getAdminToken()));
  const [bootstrapUser, setBootstrapUser] = useState<AuthBootstrap | null>(null);
  const [systemAuthKey, setSystemAuthKey] = useState(() => window.localStorage.getItem(SYSTEM_AUTH_KEY) ?? "");
  const [systemAuthName, setSystemAuthName] = useState(() => window.localStorage.getItem(SYSTEM_AUTH_NAME) ?? "Studio Key");
  const [systemAuthVerified, setSystemAuthVerified] = useState(false);
  const [systemAuthOpen, setSystemAuthOpen] = useState(false);
  const [systemAuthBusy, setSystemAuthBusy] = useState(false);
  const [systemAuthError, setSystemAuthError] = useState("");

  const pushToast = useCallback((type: Toast["type"], message: string) => {
    setToast({ type, message });
    window.clearTimeout((window as Window & { __toastTimer?: number }).__toastTimer);
    (window as Window & { __toastTimer?: number }).__toastTimer = window.setTimeout(() => setToast(null), 3200);
  }, []);

  const refreshAll = useCallback(async () => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [metaData, overviewData, profilesData, proxiesData, apiKeyData, settingsData, jobsData] =
        await Promise.all([
          api.getMeta(),
          api.getOverview(),
          api.getProfiles(),
          api.getProxies(),
          api.getApiKeys(),
          api.getSettings(),
          api.getJobs(),
        ]);
      setMeta(metaData);
      setOverview(overviewData);
      setProfiles(profilesData);
      setProxies(proxiesData);
      setApiKeys(apiKeyData);
      setSettings(settingsData);
      setJobs(jobsData);
    } catch (error) {
      if (error instanceof Error && error.message.includes("401")) {
        setAdminToken(null);
        setIsAuthenticated(false);
      }
      pushToast("error", error instanceof Error ? error.message : "Unable to load gateway data");
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const info = await api.getBootstrap();
        setBootstrapUser(info);
      } catch {
        setBootstrapUser({ username: "admin" });
      } finally {
        setAuthLoading(false);
      }
    };
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }
    void refreshAll();
  }, [isAuthenticated, refreshAll]);

  useEffect(() => {
    if (!lastCreatedKey) {
      return;
    }
    setSystemAuthKey(lastCreatedKey);
    setSystemAuthVerified(false);
    setSystemAuthError("Generate or paste a key, then click Verify.");
  }, [lastCreatedKey]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!getAdminToken()) {
        return;
      }
      void api.getJobs().then((items) => setJobs(items)).catch(() => undefined);
      void api.getOverview().then((items) => setOverview(items)).catch(() => undefined);
    }, 6000);

    return () => window.clearInterval(timer);
  }, []);

  const actions = useMemo(
    () => ({
      createProfile: async (payload: Record<string, unknown>) => {
        await api.createProfile(payload);
        await refreshAll();
        pushToast("success", "Profile created");
      },
      updateProfile: async (id: string, payload: Record<string, unknown>) => {
        await api.updateProfile(id, payload);
        await refreshAll();
        pushToast("success", "Profile updated");
      },
      deleteProfile: async (id: string) => {
        await api.deleteProfile(id);
        await refreshAll();
        pushToast("success", "Profile deleted");
      },
      importCookies: async (profileId: string, file: File) => {
        await api.importCookies(profileId, file);
        await refreshAll();
        pushToast("success", `Cookie imported for ${file.name}`);
      },
      uploadProfileAsset: async (profileId: string, file: File) => {
        const asset = await api.uploadProfileAsset(profileId, file);
        pushToast("success", `Uploaded ${asset.original_filename}`);
        return asset;
      },
      sessionCheck: async (profileId: string) => {
        const result = await api.sessionCheck(profileId);
        pushToast("info", result.summary);
        return result;
      },
      launchLogin: async (profileId: string) => {
        const result = await api.launchLogin(profileId);
        pushToast("info", result.message);
      },
      createProxy: async (payload: Record<string, unknown>) => {
        await api.createProxy(payload);
        await refreshAll();
        pushToast("success", "Proxy created");
      },
      updateProxy: async (id: string, payload: Record<string, unknown>) => {
        await api.updateProxy(id, payload);
        await refreshAll();
        pushToast("success", "Proxy updated");
      },
      deleteProxy: async (id: string) => {
        await api.deleteProxy(id);
        await refreshAll();
        pushToast("success", "Proxy deleted");
      },
      createApiKey: async (payload: Record<string, unknown>) => {
        const created = (await api.createApiKey(payload)) as ApiKeyCreated;
        setLastCreatedKey(created.plain_key);
        await refreshAll();
        pushToast("success", "API key created");
      },
      updateApiKey: async (id: string, payload: Record<string, unknown>) => {
        await api.updateApiKey(id, payload);
        await refreshAll();
        pushToast("success", "API key updated");
      },
      updateSettings: async (payload: Record<string, unknown>) => {
        await api.updateSettings(payload);
        await refreshAll();
        pushToast("success", "Settings saved");
      },
      createJob: async (payload: Record<string, unknown>) => {
        await api.createJob(payload);
        await refreshAll();
        pushToast("success", "Job queued");
      },
      retryJob: async (id: string) => {
        await api.retryJob(id);
        await refreshAll();
        pushToast("info", "Job re-queued");
      },
      deleteJob: async (id: string) => {
        await api.deleteJob(id);
        await refreshAll();
        pushToast("success", "Job deleted");
      },
    }),
    [pushToast, refreshAll],
  );

  return (
    <>
      <ToastBar toast={toast} />
      {authLoading ? (
        <div className="login-shell">
          <section className="login-panel">
            <p className="eyebrow">Admin Login</p>
            <h1>Loading gateway auth...</h1>
          </section>
        </div>
      ) : !isAuthenticated ? (
        <LoginPage
          busy={authBusy}
          defaultUsername={bootstrapUser?.username ?? "admin"}
          onSubmit={async (username, password) => {
            setAuthBusy(true);
            try {
              const response = await api.login(username, password);
              setAdminToken(response.access_token);
              setIsAuthenticated(true);
              pushToast("success", "Signed in");
            } catch (error) {
              pushToast("error", error instanceof Error ? error.message : "Sign in failed");
            } finally {
              setAuthBusy(false);
            }
          }}
        />
      ) : (
        <div className="app-shell">
          <Sidebar activeTab={activeTab} onSelect={setActiveTab} />
          <main className="content-shell">
            <header className="topbar">
              <div>
                <p className="eyebrow">Backend</p>
                <h2>{API_BASE_URL}</h2>
              </div>
              <div className="action-row">
                <button className="ghost-button" type="button" onClick={() => setSystemAuthOpen(true)}>
                  System Auth
                </button>
                <span className={`status-pill ${systemAuthVerified ? "ok" : "warn"}`}>
                  {systemAuthVerified ? "System Auth verified" : "System Auth not verified"}
                </span>
                <button className="ghost-button" type="button" onClick={() => void refreshAll()}>
                  {loading ? "Loading..." : "Refresh all"}
                </button>
                <button
                  className="ghost-button"
                  type="button"
                  onClick={() => {
                    setAdminToken(null);
                    setIsAuthenticated(false);
                    pushToast("info", "Signed out");
                  }}
                >
                  Sign out
                </button>
              </div>
            </header>

            {activeTab === "overview" ? (
              <OverviewPage meta={meta} overview={overview} onRefresh={refreshAll} />
            ) : null}
            {activeTab === "profiles" ? (
              <ProfilesPage
                meta={meta}
                profiles={profiles}
                proxies={proxies}
                onCreate={actions.createProfile}
                onUpdate={actions.updateProfile}
                onDelete={actions.deleteProfile}
                onImportCookies={actions.importCookies}
                onSessionCheck={actions.sessionCheck}
                onLaunchLogin={actions.launchLogin}
              />
            ) : null}
            {activeTab === "proxies" ? (
              <ProxiesPage
                proxies={proxies}
                onCreate={actions.createProxy}
                onUpdate={actions.updateProxy}
                onDelete={actions.deleteProxy}
              />
            ) : null}
            {activeTab === "keys" ? (
              <ApiKeysPage
                apiKeys={apiKeys}
                lastCreatedKey={lastCreatedKey}
                onCreate={actions.createApiKey}
                onUpdate={actions.updateApiKey}
              />
            ) : null}
            {activeTab === "settings" ? (
              <SettingsPage settings={settings} onSave={actions.updateSettings} />
            ) : null}
            {activeTab === "jobs" ? (
              <JobsPage
                jobs={jobs}
                meta={meta}
                profiles={profiles}
                onCreate={actions.createJob}
                onRetry={actions.retryJob}
                onDelete={actions.deleteJob}
                onUploadAsset={actions.uploadProfileAsset}
                systemAuthVerified={systemAuthVerified}
                onOpenSystemAuth={() => setSystemAuthOpen(true)}
              />
            ) : null}
          </main>
          {systemAuthOpen ? (
            <div className="modal-backdrop system-auth-backdrop">
              <div className="system-auth-modal">
                <div className="system-auth-header">
                  <div>
                    <p className="eyebrow">System Auth</p>
                    <h3>Verify Gateway API Key</h3>
                  </div>
                  <button className="ghost-button" type="button" onClick={() => setSystemAuthOpen(false)}>
                    Close
                  </button>
                </div>
                <div className="form-grid">
                  <label className="wide">
                    <span>API Base URL</span>
                    <input value={API_BASE_URL} readOnly />
                  </label>
                  <label className="wide">
                    <span>Key name / identifier</span>
                    <input
                      value={systemAuthName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemAuthName(value);
                        window.localStorage.setItem(SYSTEM_AUTH_NAME, value);
                      }}
                    />
                  </label>
                  <label className="wide">
                    <span>Gateway API Key</span>
                    <input
                      placeholder="Paste your Gateway API key"
                      value={systemAuthKey}
                      onChange={(event) => {
                        const value = event.target.value;
                        setSystemAuthKey(value);
                        window.localStorage.setItem(SYSTEM_AUTH_KEY, value);
                        setSystemAuthVerified(false);
                        setSystemAuthError("");
                      }}
                    />
                  </label>
                </div>
                <div className={`system-auth-alert ${systemAuthVerified ? "ok" : "warn"}`}>
                  {systemAuthVerified
                    ? "System Auth verified. Playground is unlocked."
                    : systemAuthError || "Generate or paste a key, then click Verify."}
                </div>
                <div className="action-row">
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={async () => {
                      setSystemAuthError("");
                      setSystemAuthBusy(true);
                      try {
                        const suffix = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
                        const generatedName = `${systemAuthName || "Studio Key"} ${suffix}`;
                        await actions.createApiKey({
                          name: generatedName,
                          rate_limit_per_minute: 60,
                          allowed_categories: ["grok", "flow", "dreamina"],
                          notes: "System Auth key",
                        });
                        setSystemAuthName(generatedName);
                        window.localStorage.setItem(SYSTEM_AUTH_NAME, generatedName);
                      } catch (error) {
                        setSystemAuthError(error instanceof Error ? error.message : "Unable to generate key");
                      } finally {
                        setSystemAuthBusy(false);
                      }
                    }}
                  >
                    Generate Key
                  </button>
                  <button
                    className="action-button"
                    type="button"
                    disabled={!systemAuthKey || systemAuthBusy}
                    onClick={async () => {
                      setSystemAuthBusy(true);
                      setSystemAuthError("");
                      try {
                        await api.verifyClientKey(systemAuthKey);
                        setSystemAuthVerified(true);
                        window.localStorage.setItem(SYSTEM_AUTH_KEY, systemAuthKey);
                        window.localStorage.setItem(SYSTEM_AUTH_NAME, systemAuthName);
                      } catch {
                        setSystemAuthVerified(false);
                        setSystemAuthError("Invalid or expired API Key");
                      } finally {
                        setSystemAuthBusy(false);
                      }
                    }}
                  >
                    {systemAuthBusy ? "Verifying..." : "Verify"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

export default App;
