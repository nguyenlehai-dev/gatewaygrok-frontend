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
                <h2>http://127.0.0.1:8001/api</h2>
              </div>
              <div className="action-row">
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
            onUploadAsset={actions.uploadProfileAsset}
          />
        ) : null}
          </main>
        </div>
      )}
    </>
  );
}

export default App;
