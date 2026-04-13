import { useEffect, useState } from "react";

import type { SettingsRecord } from "../types";

export function SettingsPage({
  settings,
  onSave,
}: {
  settings: SettingsRecord | null;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const [headless, setHeadless] = useState(true);
  const [concurrency, setConcurrency] = useState(2);
  const [timeout, setTimeoutValue] = useState(120000);

  useEffect(() => {
    if (!settings) {
      return;
    }
    setHeadless(settings.automation.headless);
    setConcurrency(settings.automation.concurrency);
    setTimeoutValue(settings.automation.timeout_ms);
  }, [settings]);

  return (
    <div className="page">
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Settings</p>
            <h2>Gateway automation policy</h2>
          </div>
        </div>
        <div className="form-grid">
          <label className="toggle-field">
            <span>Headless</span>
            <input checked={headless} type="checkbox" onChange={(event) => setHeadless(event.target.checked)} />
          </label>
          <label>
            <span>Global concurrency</span>
            <input
              min={1}
              max={20}
              type="number"
              value={concurrency}
              onChange={(event) => setConcurrency(Number(event.target.value))}
            />
          </label>
          <label>
            <span>Timeout ms</span>
            <input
              min={1000}
              max={600000}
              type="number"
              value={timeout}
              onChange={(event) => setTimeoutValue(Number(event.target.value))}
            />
          </label>
        </div>
        <div className="action-row">
          <button
            className="action-button"
            type="button"
            onClick={() =>
              void onSave({
                automation: {
                  headless,
                  concurrency,
                  timeout_ms: timeout,
                },
              })
            }
          >
            Save settings
          </button>
        </div>
      </section>
    </div>
  );
}
