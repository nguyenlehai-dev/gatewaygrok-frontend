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

function getResultSummary(job: JobRecord): { title: string; detail: string } {
  if (job.error_message) {
    return {
      title: "Job failed",
      detail: job.error_message,
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
  onUploadAsset,
  systemAuthVerified,
  onOpenSystemAuth,
}: {
  meta: MetaRecord | null;
  profiles: Profile[];
  jobs: JobRecord[];
  onCreate: (payload: Record<string, unknown>) => Promise<void>;
  onRetry: (id: string) => Promise<void>;
  onUploadAsset: (profileId: string, file: File) => Promise<ProfileAssetRecord>;
  systemAuthVerified: boolean;
  onOpenSystemAuth: () => void;
}) {
  const [profileId, setProfileId] = useState("");
  const [target, setTarget] = useState<JobTarget>("image");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [count, setCount] = useState(1);
  const [videoMode, setVideoMode] = useState<"text_to_video" | "image_to_video">("text_to_video");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceAssetPath, setSourceAssetPath] = useState("");
  const [sourcePreviewUrl, setSourcePreviewUrl] = useState("");
  const [failedPreviews, setFailedPreviews] = useState<Record<string, true>>({});
  const [reviewJob, setReviewJob] = useState<JobRecord | null>(null);
  const [reviewMediaIndex, setReviewMediaIndex] = useState(0);
  const [page, setPage] = useState(1);
  const selectedProfile = profiles.find((profile) => profile.id === profileId);
  const isGrokImage = selectedProfile?.category === "grok" && target === "image";
  const isGrokVideo = selectedProfile?.category === "grok" && target === "video";
  const submitDisabled =
    !profileId ||
    !systemAuthVerified ||
    ((isGrokImage || (isGrokVideo && videoMode === "image_to_video")) ? !sourceAssetPath && !prompt.trim() : !prompt.trim());
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
    setSourceFile(null);
    setSourceAssetPath("");
    setSourcePreviewUrl("");
  }, [profileId, target]);

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
    <div className={`page ${systemAuthVerified ? "" : "system-auth-locked"}`}>
      {!systemAuthVerified ? (
        <div className="system-auth-overlay">
          <div className="system-auth-card">
            <p className="eyebrow">System Auth Required</p>
            <h3>Playground is locked</h3>
            <p className="muted">
              Verify a Gateway API Key before running execute, async submit, or request-status checks from the Playground.
            </p>
            <button className="action-button" type="button" onClick={onOpenSystemAuth}>
              Open System Auth
            </button>
          </div>
        </div>
      ) : null}
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
              <option value="">Select profile</option>
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
          {selectedProfile?.category === "grok" ? (
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
          <label className="wide">
            <span>Prompt</span>
            <textarea rows={4} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </label>
          {isGrokImage || (isGrokVideo && videoMode === "image_to_video") ? (
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
          {isGrokImage || (isGrokVideo && videoMode === "image_to_video") ? (
            <button
              className="ghost-button"
              type="button"
              disabled={!profileId || !sourceFile}
              onClick={async () => {
                if (!profileId || !sourceFile) {
                  return;
                }
                const uploaded = await onUploadAsset(profileId, sourceFile);
                setSourceAssetPath(uploaded.stored_path);
              }}
            >
              Upload source image
            </button>
          ) : null}
          <button
            className="action-button"
            type="button"
            disabled={submitDisabled}
            onClick={async () => {
              await onCreate({
                profile_id: profileId,
                target,
                prompt,
                negative_prompt: negativePrompt || null,
                count,
                provider_payload: isGrokVideo
                  ? {
                      video_mode: videoMode,
                      source_asset_path: videoMode === "image_to_video" ? sourceAssetPath || null : null,
                      aspect_ratio: aspectRatio,
                    }
                  : {
                      source_asset_path: isGrokImage ? sourceAssetPath || null : null,
                      aspect_ratio: selectedProfile?.category === "grok" ? aspectRatio : undefined,
                    },
              });
              setPrompt("");
              setNegativePrompt("");
              setSourceFile(null);
              setSourceAssetPath("");
            }}
          >
            Submit job
          </button>
          <small className="muted">
            {selectedProfile?.category === "grok" || selectedProfile?.category === "flow"
              ? `For ${selectedProfile.category}, run Launch login, pass session check, and keep that profile browser open before submitting jobs.`
              : "Gateway will reject jobs until the selected profile passes session check in Profiles."}
          </small>
          {isGrokImage || (isGrokVideo && videoMode === "image_to_video") ? (
            <small className="muted">{sourceAssetPath ? sourceAssetPath : "Upload a source image before submitting."}</small>
          ) : null}
        </div>
        {isGrokImage || (isGrokVideo && videoMode === "image_to_video") ? (
          <div className="source-preview-panel">
            <div className="stacked-cell">
              <strong>Source preview</strong>
              <small>{sourceAssetPath || (sourceFile ? sourceFile.name : "No source image selected")}</small>
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
            const firstMedia = getFirstMedia(job);
            const debugScreenshot = getDebugScreenshot(job);
            const sourceAsset = getSourceAsset(job);
            const previewSource = getFirstAvailablePreview([firstMedia, debugScreenshot], failedPreviews);
            const previewUrl = previewSource ? toBackendStorageUrl(previewSource) : null;
            const sourcePreviewUrl = sourceAsset ? toBackendStorageUrl(sourceAsset) : null;

            return (
              <article className="job-card" key={job.id}>
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
                  <span className={`status-pill status-${job.status}`}>{job.status}</span>
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
                      {job.error_message ? <small>{job.error_message}</small> : null}
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
                        poster={debugScreenshot ? toBackendStorageUrl(debugScreenshot) : undefined}
                        preload="metadata"
                        src={previewUrl}
                        onError={() => markPreviewFailed(previewSource)}
                      />
                    ) : null}
                    {!previewUrl ? <div className="job-preview-empty">No preview</div> : null}
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
                            poster={reviewDebugScreenshot ? toBackendStorageUrl(reviewDebugScreenshot) : undefined}
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
