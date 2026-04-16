import { useEffect, useState } from "react";

import { toBackendStorageUrl } from "../api/client";
import { formatDate, toJsonText } from "../lib/format";
import { providerVisuals } from "../lib/providers";
import type { JobRecord, JobTarget, MetaRecord, Profile, ProfileAssetRecord } from "../types";

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function getMediaUrls(job: JobRecord | null): string[] {
  if (!job?.result_payload) {
    return [];
  }
  return asStringList(job.result_payload.media_urls);
}

function isPreviewableUrl(value: string): boolean {
  const resolved = toBackendStorageUrl(value);
  return resolved.startsWith("http://") || resolved.startsWith("https://") || resolved.startsWith("data:");
}

function isVideoUrl(value: string): boolean {
  return value.startsWith("data:video/") || /\.(mp4|webm|mov)(\?|$)/i.test(value);
}

function isImageUrl(value: string): boolean {
  return value.startsWith("data:image/") || /\.(png|jpg|jpeg|webp|gif)(\?|$)/i.test(value);
}

function getFileLabel(value: string): string {
  const parts = value.split(/[\\/]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : value;
}

function isSensitiveContentError(errorMessage: string | null | undefined): boolean {
  if (!errorMessage) {
    return false;
  }

  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("sensitive-content") ||
    lower.includes("policy restriction") ||
    lower.includes("contentpolicyblockederror") ||
    lower.includes("18+") ||
    lower.includes("adult") ||
    lower.includes("nsfw") ||
    lower.includes("blurred or hid the generated video result")
  );
}

function getRuntimePayload(job: JobRecord | null): Record<string, unknown> | null {
  const runtime = job?.result_payload?.runtime;
  if (!runtime || typeof runtime !== "object" || Array.isArray(runtime)) {
    return null;
  }
  return runtime as Record<string, unknown>;
}

function getRuntimeNumber(job: JobRecord | null, key: string): number | null {
  const value = getRuntimePayload(job)?.[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getRuntimeText(job: JobRecord | null, key: string): string | null {
  const value = getRuntimePayload(job)?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getRuntimeProgress(job: JobRecord): number | null {
  const runtimeProgress = getRuntimeNumber(job, "progress_percent");
  if (runtimeProgress === null) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(runtimeProgress)));
}

function getRuntimeMessage(job: JobRecord): string | null {
  return getRuntimeText(job, "progress_message") ?? getRuntimeText(job, "stage");
}

function isRuntimeBlocked(job: JobRecord): boolean {
  return getRuntimePayload(job)?.blocked === true;
}

function isSensitiveContentJob(job: JobRecord): boolean {
  return isSensitiveContentError(job.error_message) || isRuntimeBlocked(job);
}

function getFriendlyErrorMessage(errorMessage: string | null | undefined): string {
  if (!errorMessage) {
    return "";
  }

  const normalized = errorMessage.trim();
  if (!normalized) {
    return "";
  }

  if (isSensitiveContentError(normalized)) {
    return "18+ / Sensitive content blocked";
  }

  const lower = normalized.toLowerCase();
  const categorizedMessages: Array<{ match: (value: string) => boolean; label: string }> = [
    {
      match: (value) =>
        value.includes("make video") && (value.includes("hidden/blocked") || value.includes("did not show")),
      label: "Video step blocked by Grok",
    },
    {
      match: (value) =>
        value.includes("submitbuttondisablederror") ||
        value.includes("submit button not found") ||
        value.includes("did not enable the submit button"),
      label: "Submit button not available",
    },
    {
      match: (value) =>
        value.includes("connect your x account") ||
        value.includes("session check") ||
        value.includes("target page, context or browser has been closed") ||
        value.includes("page closed") ||
        value.includes("browser has been closed"),
      label: "Profile session expired",
    },
    {
      match: (value) => value.includes("upload") && value.includes("source image"),
      label: "Source image upload issue",
    },
  ];

  for (const entry of categorizedMessages) {
    if (entry.match(lower)) {
      return entry.label;
    }
  }

  const tracebackIndex = normalized.indexOf("Traceback");
  const withoutTraceback = tracebackIndex >= 0 ? normalized.slice(0, tracebackIndex).trim() : normalized;
  const firstBlock = withoutTraceback.split(/\n\s*\n/)[0]?.trim() ?? withoutTraceback;
  const firstLine = firstBlock.split("\n")[0]?.trim() ?? firstBlock;
  return firstLine || "Job failed";
}

function getResultSummary(job: JobRecord): { title: string; detail: string } {
  if (job.error_message) {
    return {
      title: "Job failed",
      detail: isSensitiveContentJob(job) ? "18+ / Sensitive content blocked" : getFriendlyErrorMessage(job.error_message),
    };
  }

  const runtimeMessage = getRuntimeMessage(job);
  if ((job.status === "running" || job.status === "pending") && runtimeMessage) {
    return {
      title: job.status === "running" ? "Processing" : "Queued",
      detail: runtimeMessage,
    };
  }

  const media = getMediaUrls(job);
  if (media.length > 0) {
    const mode =
      typeof job.result_payload?.video_mode === "string" ? ` · ${job.result_payload.video_mode}` : "";
    return {
      title: `${media.length} media file${media.length > 1 ? "s" : ""}${mode}`,
      detail: getFileLabel(media[0]),
    };
  }

  if (job.status === "running") {
    return {
      title: "Processing",
      detail: "Job is still running.",
    };
  }

  if (job.status === "pending") {
    return {
      title: "Queued",
      detail: "Waiting for worker.",
    };
  }

  return {
    title: "No output",
    detail: "Open Review for full payload.",
  };
}

function getFirstMedia(job: JobRecord): string | null {
  const media = getMediaUrls(job);
  return media.length > 0 ? media[0] : null;
}

function getDebugScreenshot(job: JobRecord | null): string | null {
  if (!job?.result_payload || typeof job.result_payload.debug_screenshot !== "string") {
    return null;
  }
  return job.result_payload.debug_screenshot;
}

function getSourceAsset(job: JobRecord | null): string | null {
  if (!job?.provider_payload || typeof job.provider_payload.source_asset_path !== "string") {
    return null;
  }
  return job.provider_payload.source_asset_path;
}

function getFirstAvailablePreview(
  candidates: Array<string | null | undefined>,
  failedPreviews: Record<string, true>,
): string | null {
  for (const candidate of candidates) {
    if (!candidate || failedPreviews[candidate]) {
      continue;
    }
    if (isPreviewableUrl(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function JobsPage({
  meta,
  profiles,
  jobs,
  onCreate,
  onRetry,
  onDelete,
  onUploadAsset,
  systemAuthVerified,
  hasSystemAuthKey,
  systemAuthBusy,
  onVerifySystemAuth,
  onGoToKeys,
}: {
  meta: MetaRecord | null;
  profiles: Profile[];
  jobs: JobRecord[];
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUploadAsset: (profileId: string, file: File) => Promise<ProfileAssetRecord>;
  systemAuthVerified: boolean;
  hasSystemAuthKey: boolean;
  systemAuthBusy: boolean;
  onVerifySystemAuth: () => void;
  onGoToKeys: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [target, setTarget] = useState<JobTarget>("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [count, setCount] = useState(1);
  const [videoMode, setVideoMode] = useState<"text_to_video" | "image_to_video">("text_to_video");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [quality, setQuality] = useState("high");
  const [duration, setDuration] = useState(10);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceAssetPath, setSourceAssetPath] = useState("");
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState("");
  const [uploadingSource, setUploadingSource] = useState(false);
  const [submittingJob, setSubmittingJob] = useState(false);
  const [failedPreviews, setFailedPreviews] = useState<Record<string, true>>({});
  const [reviewJob, setReviewJob] = useState<JobRecord | null>(null);
  const [reviewMediaIndex, setReviewMediaIndex] = useState(0);
  const [page, setPage] = useState(1);
  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  const inferredProfile = selectedProfile ?? profiles[0];
  const isAutoSelectProfile = !profileId;
  const inferredCategory = inferredProfile?.category ?? null;
  const isGrokImage = inferredProfile?.category === "grok" && target === "image";
  const isGrokVideo = inferredProfile?.category === "grok" && target === "video";
  const requiresPrompt = (isGrokVideo && videoMode === "text_to_video") || (!isGrokImage && !isGrokVideo);
  const requiresSourceImage = isGrokVideo && videoMode === "image_to_video";
  const requiresExplicitProfileForAsset = requiresSourceImage;
  const submitBlockedReason = !systemAuthVerified
    ? "API key hien tai chua verify trong session nay."
    : !inferredProfile
      ? "Khong tim thay profile kha dung tren prod."
      : uploadingSource
        ? "Dang upload source image. Vui long doi upload xong."
        : submittingJob
          ? "Dang gui job len queue prod."
          : requiresExplicitProfileForAsset && !profileId
            ? "Flow nay can chon profile cu the de luu source image vao dung profile."
            : requiresSourceImage && !sourceAssetPath
              ? "Ban can upload source image truoc khi submit."
              : requiresPrompt && !prompt.trim()
                ? "Ban can nhap prompt truoc khi submit."
                : count < 1
                  ? "Count phai lon hon hoac bang 1."
                  : null;
  const submitDisabled = Boolean(submitBlockedReason);
  const reviewProfile = profiles.find((profile) => profile.id === reviewJob?.profile_id);
  const reviewMedia = getMediaUrls(reviewJob);
  const reviewDebugScreenshot = getDebugScreenshot(reviewJob);
  const reviewSourceAsset = getSourceAsset(reviewJob);
  const pageSize = 6;
  const totalPages = Math.max(1, Math.ceil(jobs.length / pageSize));
  const pagedJobs = jobs.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setVideoMode("text_to_video");
    setAspectRatio("1:1");
    setQuality("high");
    setDuration(10);
    setSourceFile(null);
    setSourceAssetPath("");
    setSourcePreviewUrl("");
  }, [profileId, target]);

  useEffect(() => {
    if (!profileId && isGrokVideo && videoMode === "image_to_video" && inferredProfile?.id) {
      setProfileId(inferredProfile.id);
    }
  }, [profileId, isGrokVideo, videoMode, inferredProfile?.id]);

  useEffect(() => {
    setPage(1);
  }, [profileId, target]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    if (!reviewJob) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setReviewJob(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [reviewJob]);

  useEffect(() => {
    setReviewMediaIndex(0);
  }, [reviewJob?.id]);

  useEffect(() => {
    if (!sourceFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(sourceFile);
    setSourcePreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [sourceFile]);

  const markPreviewFailed = (value: string | null) => {
    if (!value) {
      return;
    }
    setFailedPreviews((current) => (current[value] ? current : { ...current, [value]: true }));
  };

  const boundedReviewMediaIndex =
    reviewMedia.length > 0 ? Math.min(reviewMediaIndex, reviewMedia.length - 1) : 0;
  const activeReviewMedia = reviewMedia[boundedReviewMediaIndex] ?? null;
  const activeReviewPreviewSource = getFirstAvailablePreview([activeReviewMedia, reviewDebugScreenshot], failedPreviews);
  const activeReviewPreviewUrl = activeReviewPreviewSource ? toBackendStorageUrl(activeReviewPreviewSource) : null;

  return (
    <div className="page">
      {!systemAuthVerified ? (
        <section className="page-band">
          <div className="page-heading">
            <div>
              <p className="eyebrow">Queue</p>
              <h2>Background Tasks Queue</h2>
            </div>
            {hasSystemAuthKey ? (
              <button className="ghost-button" type="button" disabled={systemAuthBusy} onClick={onVerifySystemAuth}>
                {systemAuthBusy ? "Verifying..." : "Verify Current Key"}
              </button>
            ) : (
              <button className="ghost-button" type="button" onClick={onGoToKeys}>
                Go to API Keys
              </button>
            )}
          </div>
          <div className="jobs-empty-auth">
            {hasSystemAuthKey
              ? "Current key has not been verified in this session yet. Verify it once to unlock job tracking."
              : "No API Key found. Please create and apply an API Key first to track your jobs."}
          </div>
        </section>
      ) : null}
      {systemAuthVerified ? (
        <>
      <section className="page-band">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Jobs</p>
            <h2>Submit and monitor generation queue</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            <span>Profile</span>
            <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
              <option value="" disabled={isGrokVideo && videoMode === "image_to_video"}>
                Auto select profile
              </option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Target</span>
            <select value={target} onChange={(event) => setTarget(event.target.value as JobTarget)}>
              {(meta?.job_targets ?? []).map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Count</span>
            <input min={1} max={10} type="number" value={count} onChange={(event) => setCount(Number(event.target.value))} />
          </label>
          {isGrokVideo ? (
            <label>
              <span>Video mode</span>
              <select
                value={videoMode}
                onChange={(event) => setVideoMode(event.target.value as "text_to_video" | "image_to_video")}
              >
                <option value="text_to_video">Text to video</option>
                <option value="image_to_video">Image to video</option>
              </select>
            </label>
          ) : null}
          {inferredCategory === "grok" ? (
            <label>
              <span>Aspect ratio</span>
              <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
                <option value="1:1">1:1</option>
                <option value="2:3">2:3</option>
                <option value="3:2">3:2</option>
                <option value="9:16">9:16</option>
                <option value="16:9">16:9</option>
              </select>
            </label>
          ) : null}
          {inferredCategory === "grok" ? (
            <label>
              <span>Quality</span>
              <select value={quality} onChange={(event) => setQuality(event.target.value)}>
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
              </select>
            </label>
          ) : null}
          {isGrokVideo ? (
            <label>
              <span>Duration</span>
              <input
                min={1}
                max={10}
                type="number"
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </label>
          ) : null}
          <label className="wide">
            <span>Prompt</span>
            <textarea rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>
          {isGrokImage || requiresSourceImage ? (
            <label className="wide">
              <span>Source image</span>
              <input type="file" accept="image/*" onChange={(event) => setSourceFile(event.target.files?.[0] ?? null)} />
            </label>
          ) : null}
          <label className="wide">
            <span>Negative prompt</span>
            <textarea rows={2} value={negativePrompt} onChange={(event) => setNegativePrompt(event.target.value)} />
          </label>
        </div>
        <div className="action-row">
          {isGrokImage || requiresSourceImage ? (
            <button
              className="ghost-button"
              type="button"
              disabled={!profileId || !sourceFile || uploadingSource || submittingJob}
              onClick={async () => {
                if (!profileId || !sourceFile) {
                  return;
                }
                setUploadingSource(true);
                try {
                  const uploaded = await onUploadAsset(profileId, sourceFile);
                  setSourceAssetPath(uploaded.stored_path);
                } finally {
                  setUploadingSource(false);
                }
              }}
            >
              {uploadingSource ? "Uploading..." : "Upload source image"}
            </button>
          ) : null}
          <button
            className="action-button"
            type="button"
            disabled={submitDisabled}
            onClick={async () => {
              setSubmittingJob(true);
              try {
                await onCreate({
                  ...(profileId ? { profile_id: profileId } : {}),
                  target,
                  prompt,
                  negative_prompt: negativePrompt || null,
                  count,
                  ratio: inferredCategory === "grok" ? aspectRatio : undefined,
                  quality: inferredCategory === "grok" ? quality : undefined,
                  duration: isGrokVideo ? duration : undefined,
                  reference_images:
                    (isGrokImage || (isGrokVideo && videoMode === "image_to_video")) && sourceAssetPath
                      ? [sourceAssetPath]
                      : undefined,
                  provider_payload: isGrokVideo
                    ? {
                        video_mode: videoMode,
                        source_asset_path: videoMode === "image_to_video" ? sourceAssetPath || null : null,
                        aspect_ratio: aspectRatio,
                        ratio: aspectRatio,
                        quality,
                        duration,
                      }
                    : {
                        source_asset_path: isGrokImage ? sourceAssetPath || null : null,
                        aspect_ratio: inferredCategory === "grok" ? aspectRatio : undefined,
                        ratio: inferredCategory === "grok" ? aspectRatio : undefined,
                        quality: inferredCategory === "grok" ? quality : undefined,
                      },
                });
                setPrompt("");
                setNegativePrompt("");
                setSourceFile(null);
                setSourceAssetPath("");
              } finally {
                setSubmittingJob(false);
              }
            }}
          >
            {submittingJob ? "Submitting..." : "Submit job"}
          </button>
          <small className="muted">
            {submitBlockedReason
              ? `Submit button dang khoa: ${submitBlockedReason}`
              : submittingJob
                ? "Job dang duoc gui len backend prod."
                : "Form hop le. Bam Submit job de day vao queue."}
          </small>
          <small className="muted">
            {inferredProfile?.category === "grok" || inferredProfile?.category === "flow"
              ? `For ${inferredProfile.category}, make sure the profile passes session check in Profiles. Prod runtime now warms browser/session on demand, so you do not need to keep the profile browser open continuously.`
              : "Gateway will reject jobs until the selected profile passes session check in Profiles."}
          </small>
          {isAutoSelectProfile ? (
            <small className="muted">
              Backend will auto-pick an available profile/session. For source-image flows, choose a specific profile first so the asset can be uploaded into that profile.
            </small>
          ) : null}
          {isGrokVideo && videoMode === "image_to_video" ? (
            <small className="muted">
              Image to video needs a fixed profile because the uploaded source image is stored inside that profile. The form will use a concrete prod profile instead of auto-select.
            </small>
          ) : null}
          {isAutoSelectProfile && inferredCategory ? (
            <small className="muted">
              Current pool category hint: {inferredCategory}. Form options are being shown for the available prod profile pool.
            </small>
          ) : null}
          {isGrokImage || requiresSourceImage ? (
            <small className="muted">
              {sourceAssetPath
                ? sourceAssetPath
                : isGrokImage
                  ? "Source image la tuy chon cho image job. Ban co the bo qua va submit bang prompt."
                  : "Upload a source image before submitting."}
            </small>
          ) : null}
        </div>
        {isGrokImage || requiresSourceImage ? (
          <div className="source-preview-panel">
            <div className="stacked-cell">
              <strong>Source preview</strong>
              <small>
                {sourceAssetPath || (sourceFile ? sourceFile.name : isGrokImage ? "Optional source image" : "No source image selected")}
              </small>
            </div>
            {sourcePreviewUrl ? <img alt="Source preview" className="source-preview-image" src={sourcePreviewUrl} /> : null}
            {!sourcePreviewUrl ? <div className="job-preview-empty">No preview</div> : null}
          </div>
        ) : null}
      </section>

      <section className="page-band">
        <div className="page-heading minor">
          <div>
            <p className="eyebrow">Queue</p>
            <h3>
              Page {page} / {totalPages}
            </h3>
          </div>
          <div className="action-row">
            <button className="ghost-button" disabled={page === 1} type="button" onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <button
              className="ghost-button"
              disabled={page === totalPages}
              type="button"
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
          </div>
        </div>
        <div className="job-list">
          {pagedJobs.map((job) => {
            const profile = profiles.find((item) => item.id === job.profile_id);
            const resultSummary = getResultSummary(job);
            const sensitiveContentBlocked = isSensitiveContentJob(job);
            const firstMedia = getFirstMedia(job);
            const debugScreenshot = getDebugScreenshot(job);
            const sourceAsset = getSourceAsset(job);
            const previewSource = getFirstAvailablePreview([firstMedia, debugScreenshot], failedPreviews);
            const previewUrl = previewSource ? toBackendStorageUrl(previewSource) : null;
            const sourcePreviewUrl = sourceAsset ? toBackendStorageUrl(sourceAsset) : null;
            const runtimeProgress = getRuntimeProgress(job);
            const runtimeMessage = getRuntimeMessage(job);
            const runtimeNotice = getRuntimeText(job, "provider_notice");
            const showRuntimePreview = !previewUrl && (job.status === "pending" || job.status === "running" || isRuntimeBlocked(job));

            return (
              <article className={`job-card${sensitiveContentBlocked ? " job-card-sensitive-blocked" : ""}`} key={job.id}>
                <div className="job-card-meta">
                  <div className="identity-cell">
                    {profile ? (
                      <img
                        alt={providerVisuals[profile.category].label}
                        className="mini-logo"
                        src={providerVisuals[profile.category].image}
                      />
                    ) : null}
                    <div className="stacked-cell">
                      <strong>{profile?.name ?? job.profile_id}</strong>
                      <div className="chip-row">
                        {profile ? <span className="table-inline-tag">{providerVisuals[profile.category].label}</span> : null}
                        <span className="table-inline-tag">{job.target}</span>
                        <span className="table-inline-tag">{job.count}x</span>
                      </div>
                    </div>
                  </div>
                  <span className={`status-pill status-${job.status}`}>
                    {runtimeProgress !== null && job.status === "running" ? `${job.status} ${runtimeProgress}%` : job.status}
                  </span>
                  {sensitiveContentBlocked ? <span className="status-pill status-sensitive">18+</span> : null}
                  <small>{formatDate(job.updated_at)}</small>
                  <code>{job.id}</code>
                </div>

                <div className="job-card-body">
                  <div className="job-card-copy">
                    <div className="stacked-cell">
                      <strong>Prompt</strong>
                      <p className="job-copy">{job.prompt || "-"}</p>
                      {job.negative_prompt ? <small>Negative: {job.negative_prompt}</small> : null}
                    </div>

                    <div className="stacked-cell job-summary-copy">
                      <strong>{resultSummary.title}</strong>
                      <small>{resultSummary.detail}</small>
                      {job.result_payload?.provider ? <small>Provider: {String(job.result_payload.provider)}</small> : null}
                      {job.error_message ? <small>Open Review for full error details.</small> : null}
                    </div>
                  </div>

                  <div className="job-card-preview">
                    {previewUrl && isPreviewableUrl(previewSource ?? "") && isImageUrl(previewSource ?? "") ? (
                      <img
                        alt="Job output"
                        className="job-preview-media"
                        src={previewUrl}
                        onError={() => markPreviewFailed(previewSource)}
                      />
                    ) : null}
                    {previewUrl && isPreviewableUrl(previewSource ?? "") && isVideoUrl(previewSource ?? "") ? (
                      <video
                        className="job-preview-media"
                        controls
                        muted
                        playsInline
                        preload="metadata"
                        src={previewUrl}
                        onError={() => markPreviewFailed(previewSource)}
                      />
                    ) : null}
                    {showRuntimePreview ? (
                      <div className={`job-runtime-preview${isRuntimeBlocked(job) ? " blocked" : ""}`}>
                        <div className="runtime-preview-orbit" aria-hidden="true" />
                        <div className="runtime-preview-content">
                          <strong>
                            {isRuntimeBlocked(job)
                              ? "Grok blocked this result"
                              : runtimeProgress !== null
                                ? `Generating ${runtimeProgress}%`
                                : job.status === "pending"
                                  ? "Queued"
                                  : "Waiting for Grok progress"}
                          </strong>
                          <small>
                            {isRuntimeBlocked(job)
                              ? runtimeNotice ?? resultSummary.detail
                              : runtimeMessage ?? resultSummary.detail}
                          </small>
                          {!isRuntimeBlocked(job) ? (
                            <div className="runtime-progress-track" aria-label="Grok generation progress">
                              <span style={{ width: `${runtimeProgress ?? 8}%` }} />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                    {!previewUrl && !showRuntimePreview ? <div className="job-preview-empty">No preview</div> : null}
                    {sourcePreviewUrl && isImageUrl(sourceAsset ?? "") ? (
                      <div className="job-source-preview">
                        <small>Source image</small>
                        <img alt="Source asset" className="job-source-thumb" src={sourcePreviewUrl} />
                      </div>
                    ) : null}
                    <div className="action-stack">
                      <button className="mini-button" type="button" onClick={() => setReviewJob(job)}>
                        Review
                      </button>
                      <button
                        className="mini-button"
                        type="button"
                        disabled={job.status === "pending" || job.status === "running"}
                        onClick={() => void onRetry(job.id)}
                      >
                        Retry
                      </button>
                      <button
                        className="mini-button danger"
                        type="button"
                        disabled={job.status === "pending" || job.status === "running"}
                        onClick={() => {
                          if (window.confirm("Delete this job and its output files?")) {
                            void onDelete(job.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        <div className="action-row pagination-row">
          <small className="muted">
            {jobs.length
              ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, jobs.length)} of ${jobs.length} jobs`
              : "No jobs yet"}
          </small>
          <div className="action-row">
            <button className="ghost-button" disabled={page === 1} type="button" onClick={() => setPage(1)}>
              First
            </button>
            <button className="ghost-button" disabled={page === 1} type="button" onClick={() => setPage((current) => current - 1)}>
              Previous
            </button>
            <button
              className="ghost-button"
              disabled={page === totalPages}
              type="button"
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </button>
            <button className="ghost-button" disabled={page === totalPages} type="button" onClick={() => setPage(totalPages)}>
              Last
            </button>
          </div>
        </div>
      </section>
        </>
      ) : null}

      {reviewJob ? (
        <div className="modal-backdrop" role="presentation" onClick={(event) => event.target === event.currentTarget && setReviewJob(null)}>
          <section aria-modal="true" className="job-modal" role="dialog">
            <div className="page-heading minor">
              <div>
                <p className="eyebrow">Job Review</p>
                <h3>{reviewProfile?.name ?? reviewJob.profile_id}</h3>
              </div>
              <button className="ghost-button" type="button" onClick={() => setReviewJob(null)}>
                Close
              </button>
            </div>

            <div className="job-modal-grid">
              <div className="result-box">
                <div className="stacked-cell">
                  <strong>Overview</strong>
                  <small>Job ID: {reviewJob.id}</small>
                  <small>
                    {reviewJob.target} · {reviewJob.count}x · updated {formatDate(reviewJob.updated_at)}
                  </small>
                  <span className={`status-pill status-${reviewJob.status}`}>{reviewJob.status}</span>
                </div>
              </div>

              <div className="result-box">
                <div className="stacked-cell">
                  <strong>Prompt</strong>
                  <span>{reviewJob.prompt || "-"}</span>
                  {reviewJob.negative_prompt ? <small>Negative: {reviewJob.negative_prompt}</small> : null}
                </div>
              </div>

              <div className="result-box">
                <div className="stacked-cell">
                  <strong>Provider Payload</strong>
                  <pre>{toJsonText(reviewJob.provider_payload)}</pre>
                </div>
              </div>

              <div className="result-box">
                <div className="stacked-cell">
                  <strong>Result Payload</strong>
                  <pre>{toJsonText(reviewJob.result_payload)}</pre>
                </div>
              </div>

              <div className="result-box job-modal-span">
                <div className="stacked-cell">
                  <strong>Media</strong>
                  {reviewSourceAsset && isImageUrl(reviewSourceAsset) ? (
                    <div className="review-media-card">
                      <small>Source image</small>
                      <img alt="Source asset" className="review-media-preview" src={toBackendStorageUrl(reviewSourceAsset)} />
                      <code>{reviewSourceAsset}</code>
                    </div>
                  ) : null}
                  {reviewMedia.length ? (
                    <div className="review-media-stack">
                      <div className="review-media-toolbar">
                        <small>
                          {boundedReviewMediaIndex + 1} / {reviewMedia.length} returned by Grok
                        </small>
                        {reviewMedia.length > 1 ? (
                          <div className="action-row">
                            <button
                              className="ghost-button"
                              disabled={boundedReviewMediaIndex === 0}
                              type="button"
                              onClick={() => setReviewMediaIndex((current) => Math.max(0, current - 1))}
                            >
                              Previous
                            </button>
                            <button
                              className="ghost-button"
                              disabled={boundedReviewMediaIndex >= reviewMedia.length - 1}
                              type="button"
                              onClick={() =>
                                setReviewMediaIndex((current) => Math.min(reviewMedia.length - 1, current + 1))
                              }
                            >
                              Next
                            </button>
                          </div>
                        ) : null}
                      </div>

                      <div className="review-media-stage">
                        {activeReviewPreviewUrl && isVideoUrl(activeReviewPreviewSource ?? "") ? (
                          <video
                            className="review-media-preview"
                            controls
                            playsInline
                            src={activeReviewPreviewUrl}
                            onError={() => markPreviewFailed(activeReviewPreviewSource)}
                          />
                        ) : null}
                        {activeReviewPreviewUrl && isImageUrl(activeReviewPreviewSource ?? "") ? (
                          <img
                            alt={`Job result ${boundedReviewMediaIndex + 1}`}
                            className="review-media-preview"
                            src={activeReviewPreviewUrl}
                            onError={() => markPreviewFailed(activeReviewPreviewSource)}
                          />
                        ) : null}
                        {!activeReviewPreviewUrl ? <div className="job-preview-empty">No preview</div> : null}
                      </div>

                      {activeReviewMedia ? (
                        <div className="review-media-card">
                          <code>{activeReviewMedia}</code>
                          {isPreviewableUrl(activeReviewMedia) ? (
                            <a className="muted" href={toBackendStorageUrl(activeReviewMedia)} rel="noreferrer" target="_blank">
                              Open media
                            </a>
                          ) : (
                            <small>Local storage path. Open from backend storage on this machine.</small>
                          )}
                        </div>
                      ) : null}

                      {reviewMedia.length > 1 ? (
                        <div className="review-media-manifest">
                          {reviewMedia.map((item, index) => (
                            <button
                              key={item}
                              className={`review-media-jump ${index === boundedReviewMediaIndex ? "active" : ""}`}
                              type="button"
                              onClick={() => setReviewMediaIndex(index)}
                            >
                              <span>{index + 1}</span>
                              <small>{getFileLabel(item)}</small>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="review-media-list">
                        {reviewMedia.map((item, index) => (
                          <div className="review-media-list-row" key={item}>
                            <strong>{index + 1}.</strong>
                            <code>{item}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <small>No media output yet</small>
                  )}
                </div>
              </div>

              {reviewJob.error_message ? (
                <div className="result-box job-modal-span">
                  <div className="stacked-cell">
                    <strong>Error</strong>
                    <pre className="job-error-block">{reviewJob.error_message}</pre>
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
