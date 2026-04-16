type FieldRow = {
  name: string;
  type: string;
  required: string;
  description: string;
};

type EndpointCard = {
  method: "GET" | "POST";
  path: string;
  title: string;
  summary: string;
  auth: string;
  fields?: FieldRow[];
  requestExample?: string;
  responseExample?: string;
  notes?: string[];
};

type InfoCard = {
  title: string;
  rows: string[];
};

const generateFields: FieldRow[] = [
  { name: "profile_id", type: "string", required: "no", description: "Profile Grok da duoc login va san sang cho automation. Neu bo trong, backend se tu chon profile phu hop." },
  { name: "target", type: "image | video", required: "yes", description: "Chon output anh hoac video." },
  { name: "prompt", type: "string", required: "yes", description: "Prompt chinh gui sang Grok." },
  { name: "reference_images", type: "string[]", required: "no", description: "Co the la storage path hoac URL anh. Item dau tien se duoc map thanh source_asset_path." },
  { name: "ratio", type: "string", required: "no", description: "Vi du 1:1, 16:9, 9:16. Backend nhan va forward xuong provider payload." },
  { name: "quality", type: "string", required: "no", description: "Vi du low, medium, high. Backend nhan va forward xuong provider payload." },
  { name: "duration", type: "number", required: "no", description: "Thoi luong mong muon cho video. Backend nhan va forward xuong provider payload." },
  { name: "negative_prompt", type: "string", required: "no", description: "Prompt loai tru neu workflow co dung." },
  { name: "count", type: "number", required: "no", description: "So output can tao, mac dinh 1, toi da 10." },
];

const taskFields: FieldRow[] = [
  { name: "id", type: "string", required: "yes", description: "ID task (su dung khi poll full response)." },
  { name: "status", type: "pending | running | succeeded | failed", required: "yes", description: "Trang thai moi nhat cua task." },
  { name: "profile_id", type: "string", required: "yes", description: "Profile da duoc dung de submit task." },
  { name: "target", type: "image | video", required: "yes", description: "Loai output hien tai." },
  { name: "prompt", type: "string", required: "yes", description: "Prompt goc da submit." },
  { name: "negative_prompt", type: "string | null", required: "no", description: "Gia tri negative prompt neu co." },
  { name: "count", type: "number", required: "yes", description: "So output duoc yeu cau." },
  { name: "provider_payload", type: "object | null", required: "no", description: "Payload da map xuong provider, bao gom video_mode, source_asset_path va cac tuy chon bo sung." },
  { name: "result_payload", type: "object | null", required: "no", description: "Ket qua khi task thanh cong. Thuong chua media_urls va thong tin debug." },
  { name: "error_message", type: "string | null", required: "no", description: "Ly do fail neu co." },
];

const assetFields: FieldRow[] = [
  { name: "file", type: "multipart file", required: "yes", description: "Anh tham chieu de dua vao reference_images." },
];

const apiKeyFields: FieldRow[] = [
  { name: "name", type: "string", required: "yes", description: "Ten de phan biet API key." },
  { name: "rate_limit_per_minute", type: "number", required: "yes", description: "Gioi han request moi phut." },
  { name: "allowed_categories", type: "string[]", required: "no", description: "Category duoc phep su dung, vi du [\"grok\"]." },
  { name: "notes", type: "string", required: "no", description: "Ghi chu noi bo." },
];

const quickstartCards: InfoCard[] = [
  {
    title: "Quickstart",
    rows: [
      "1. Admin tao profile Grok va dang nhap thanh cong.",
      "2. Admin tao x-api-key cho he thong ngoai.",
      "3. Neu can image to video, upload anh reference hoac gui URL anh.",
      "4. Client goi POST /api/client/generate de lay task_id.",
      "5. Client poll GET /api/client/tasks/{task_id}/status (lite) hoac /tasks/{task_id} (full).",
    ],
  },
  {
    title: "Behavior Mapping",
    rows: [
      "target=image, khong co reference_images -> image generation.",
      "target=image, co reference_images -> image flow va source_asset_path duoc map tu item dau tien.",
      "target=video, khong co reference_images -> video_mode=text_to_video.",
      "target=video, co reference_images -> video_mode=image_to_video.",
      "ratio, quality, duration duoc nhan o top-level va dua vao provider_payload.",
      "reference_images co the la URL, backend se auto-download ve asset.",
    ],
  },
  {
    title: "Status Lifecycle",
    rows: [
      "pending: task vua duoc tao va cho worker nhan.",
      "running: worker dang xu ly voi browser/session Grok.",
      "succeeded: da co result_payload.media_urls.",
      "failed: task dung va co error_message.",
      "401: thieu hoac sai x-api-key.",
      "409: profile session chua san sang cho automation.",
    ],
  },
];

const endpoints: EndpointCard[] = [
  {
    method: "POST",
    path: "/api/client/generate",
    title: "Generate Task",
    summary: "Tao task moi va tra ve task_id de client polling.",
    auth: "x-api-key",
    fields: generateFields,
    requestExample: `curl -X POST "/api/client/generate" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: gg_your_key" \\
  -d '{
    "profile_id": "PROFILE_ID",
    "target": "video",
    "prompt": "A cinematic shot of clouds moving fast over mountains",
    "reference_images": [
      "https://images.example.com/ref-mountains.png"
    ],
    "ratio": "16:9",
    "quality": "high",
    "duration": 5,
    "count": 1
  }'`,
    responseExample: `{
  "task_id": "42d72140-8613-4a53-a1df-1af4db95f4df",
  "status": "pending",
  "success": false,
  "message": "pending",
  "url": null
}`,
    notes: [
      "Task se vao queue ngay sau khi tao.",
      "Backend tu map video_mode dua tren reference_images.",
      "Neu reference_images co nhieu item, item dau tien hien duoc dung lam source_asset_path.",
      "reference_images co the la URL, backend se auto-download ve storage.",
    ],
  },
  {
    method: "POST",
    path: "/api/client/jobs",
    title: "Legacy Create Path",
    summary: "Alias tuong thich cho client cu van dang goi /client/jobs.",
    auth: "x-api-key",
    fields: generateFields,
    requestExample: `{
  "profile_id": "PROFILE_ID",
  "target": "image",
  "prompt": "A glossy fashion portrait",
  "reference_images": [
    "storage/profiles/PROFILE_ID/assets/ref-face.png"
  ],
  "ratio": "1:1",
  "quality": "medium"
}`,
    responseExample: `{
  "id": "7d98a9dc-a2ef-4afd-a62d-4a927f595bfe",
  "status": "pending",
  "target": "image",
  "provider_payload": {
    "reference_images": [
      "storage/profiles/PROFILE_ID/assets/ref-face.png"
    ],
    "source_asset_path": "storage/profiles/PROFILE_ID/assets/ref-face.png",
    "ratio": "1:1",
    "quality": "medium"
  }
}`,
    notes: [
      "Route nay giu lai de khong vo client cu.",
      "Neu lam moi, uu tien su dung /api/client/generate + /api/client/tasks/{task_id}.",
    ],
  },
  {
    method: "GET",
    path: "/api/client/tasks/{task_id}",
    title: "Poll Task Status",
    summary: "Polling trang thai va lay ket qua cua task.",
    auth: "x-api-key",
    fields: taskFields,
    requestExample: `curl "/api/client/tasks/42d72140-8613-4a53-a1df-1af4db95f4df" \\
  -H "x-api-key: gg_your_key"`,
    responseExample: `{
  "id": "42d72140-8613-4a53-a1df-1af4db95f4df",
  "status": "succeeded",
  "profile_id": "PROFILE_ID",
  "target": "image",
  "prompt": "A cinematic portrait",
  "negative_prompt": null,
  "count": 1,
  "provider_payload": {
    "ratio": "1:1",
    "quality": "high"
  },
  "result_payload": {
    "target": "image",
    "media_urls": [
      "https://testflowgrok.plxeditor.com/storage/profiles/PROFILE_ID/output/42d72140-8613-4a53-a1df-1af4db95f4df-image-1.jpg"
    ],
    "provider": "grok",
    "page_url": "https://grok.com/imagine"
  },
  "error_message": null
}`,
    notes: [
      "Media URL tra ve la duong dan day du, co the tai truc tiep.",
      "Task co the o running trong mot khoang thoi gian dai hon voi video jobs.",
    ],
  },
  {
    method: "GET",
    path: "/api/client/jobs/{task_id}",
    title: "Legacy Poll Path",
    summary: "Alias tuong thich cho client dang dung /jobs/{task_id}.",
    auth: "x-api-key",
    fields: taskFields,
    responseExample: `{
  "id": "42d72140-8613-4a53-a1df-1af4db95f4df",
  "status": "running",
  "profile_id": "PROFILE_ID",
  "target": "video",
  "prompt": "Animate this portrait",
  "negative_prompt": null,
  "count": 1,
  "provider_payload": {
    "reference_images": [
      "storage/profiles/PROFILE_ID/assets/ref-face.png"
    ],
    "source_asset_path": "storage/profiles/PROFILE_ID/assets/ref-face.png",
    "video_mode": "image_to_video",
    "ratio": "9:16",
    "quality": "high",
    "duration": 5
  },
  "result_payload": null,
  "error_message": null
}`,
  },
  {
    method: "POST",
    path: "/api/profiles/{profile_id}/assets",
    title: "Upload Reference Image",
    summary: "Upload anh nguon de dung trong reference_images.",
    auth: "Bearer admin token",
    fields: assetFields,
    requestExample: `curl -X POST "/api/profiles/PROFILE_ID/assets" \\
  -H "Authorization: Bearer ADMIN_TOKEN" \\
  -F "file=@/path/to/ref.png"`,
    responseExample: `{
  "profile_id": "PROFILE_ID",
  "original_filename": "ref.png",
  "stored_path": "storage/profiles/PROFILE_ID/assets/ref.png",
  "content_type": "image/png",
  "size": 248199
}`,
    notes: [
      "stored_path la gia tri nen dua vao reference_images.",
      "Upload nay la step bat buoc neu muon image_to_video bang file local.",
    ],
  },
  {
    method: "POST",
    path: "/api/api-keys",
    title: "Create Client API Key",
    summary: "Tao key cho he thong ngoai goi generate va polling.",
    auth: "Bearer admin token",
    fields: apiKeyFields,
    requestExample: `{
  "name": "Customer Integration Key",
  "rate_limit_per_minute": 60,
  "allowed_categories": ["grok"],
  "notes": "Client integration"
}`,
    responseExample: `{
  "id": "8cab4af9-9b93-4fd5-8492-6f0c4f2f6761",
  "name": "Customer Integration Key",
  "key_prefix": "gg_xxxxx",
  "rate_limit_per_minute": 60,
  "is_active": true,
  "allowed_categories": ["grok"],
  "notes": "Client integration",
  "created_at": "2026-04-13T13:20:00",
  "updated_at": "2026-04-13T13:20:00",
  "plain_key": "gg_xxxxx_full_key_value"
}`,
    notes: [
      "plain_key chi xuat hien khi tao moi, can luu lai ngay.",
      "Nen gioi han allowed_categories de dung dung profile category can thiet.",
    ],
  },
  {
    method: "POST",
    path: "/api/profiles/{profile_id}/session-check",
    title: "Check Profile Session",
    summary: "Admin kiem tra profile Grok da san sang cho automation hay chua.",
    auth: "Bearer admin token",
    responseExample: `{
  "state": "authenticated",
  "live_browser_connected": true,
  "requires_live_browser": true,
  "summary": "Grok session appears ready for prompt submission."
}`,
    notes: [
      "Neu state khong phai authenticated, client jobs co the tra 409.",
      "Nen goi route nay sau khi import cookie hoac login lai.",
    ],
  },
  {
    method: "POST",
    path: "/api/profiles/{profile_id}/launch-login",
    title: "Launch Login Browser",
    summary: "Mo browser song de admin vuot login va verification tren Grok.",
    auth: "Bearer admin token",
    responseExample: `{
  "message": "Login browser launched",
  "profile_id": "PROFILE_ID"
}`,
    notes: [
      "Dung route nay khi session-check cho thay security verification hoac browser chua attach.",
      "Sau khi login xong, giu browser song neu provider can live browser.",
    ],
  },
];

function MethodBadge({ method }: { method: "GET" | "POST" }) {
  return <span className={`api-method api-method-${method.toLowerCase()}`}>{method}</span>;
}

function InfoPanel({ title, rows }: InfoCard) {
  return (
    <article className="api-info-card">
      <h3>{title}</h3>
      <ul className="api-note-list">
        {rows.map((row) => (
          <li key={row}>{row}</li>
        ))}
      </ul>
    </article>
  );
}

export function ApiDocsPage() {
  return (
    <div className="page api-docs-page">
      <section className="page-band api-docs-hero">
        <div className="page-heading">
          <div>
            <p className="eyebrow">API Documentation</p>
            <h2>Customer Integration</h2>
          </div>
        </div>

        <div className="api-docs-summary">
          <article className="api-summary-card">
            <span className="api-summary-label">Base URL</span>
            <strong>/api</strong>
            <small>Client goi generate va polling qua x-api-key.</small>
          </article>
          <article className="api-summary-card">
            <span className="api-summary-label">Flow</span>
            <strong>task_id + polling</strong>
            <small>Tao task truoc, sau do poll cho toi khi succeeded hoac failed.</small>
          </article>
          <article className="api-summary-card">
            <span className="api-summary-label">Modes</span>
            <strong>image | video</strong>
            <small>Backend tu map text_to_video hoac image_to_video cho video jobs.</small>
          </article>
        </div>
      </section>

      <section className="page-band">
        <div className="api-info-grid">
          {quickstartCards.map((card) => (
            <InfoPanel key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="page-band">
        <div className="api-endpoint-list">
          {endpoints.map((endpoint) => (
            <article key={`${endpoint.method}-${endpoint.path}`} className="api-endpoint-card">
              <div className="api-endpoint-header">
                <div className="api-endpoint-title">
                  <MethodBadge method={endpoint.method} />
                  <div>
                    <h3>{endpoint.title}</h3>
                    <p className="muted">{endpoint.summary}</p>
                  </div>
                </div>
                <span className="api-auth-chip">{endpoint.auth}</span>
              </div>

              <div className="api-path">{endpoint.path}</div>

              {endpoint.fields ? (
                <div className="api-table-wrap">
                  <table className="api-table">
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Type</th>
                        <th>Required</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {endpoint.fields.map((field) => (
                        <tr key={field.name}>
                          <td>{field.name}</td>
                          <td>{field.type}</td>
                          <td>{field.required}</td>
                          <td>{field.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {endpoint.notes?.length ? (
                <div className="api-notes">
                  <div className="api-code-head">
                    <strong>Notes</strong>
                  </div>
                  <ul className="api-note-list">
                    {endpoint.notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {endpoint.requestExample ? (
                <div className="api-code-section">
                  <div className="api-code-head">
                    <strong>Request Example</strong>
                  </div>
                  <pre className="api-code-block">
                    <code>{endpoint.requestExample}</code>
                  </pre>
                </div>
              ) : null}

              {endpoint.responseExample ? (
                <div className="api-code-section">
                  <div className="api-code-head">
                    <strong>Response Example</strong>
                  </div>
                  <pre className="api-code-block">
                    <code>{endpoint.responseExample}</code>
                  </pre>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
