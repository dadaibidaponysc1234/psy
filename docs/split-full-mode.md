# Split vs Full backend modes — frontend reference

Authoritative as of backend commit `de927b7`. Source of truth is the backend's
generated OpenAPI schema, **not** this doc or prose — see [§1](#1-mode-detection).

The backend runs in one of two deployment modes (env `APP_MODE`, read at container
start, constant for the deployment's lifetime):

- **full** — the controller does everything itself; file bytes flow **browser → backend**
  via a resumable chunked upload, and results stream directly from the backend.
- **split** (`APP_MODE=api`, with a private `worker`) — file bytes flow **browser → S3**
  via presigned URLs / multipart, and results come back as presigned S3 URLs.

> ⚠️ The OpenAPI schema is **identical in both modes** — every upload route is registered
> in both, and the disabled ones return **400 at runtime**. The schema alone cannot tell
> you which mode you're in. Always branch on the `/health` mode value.

---

## 1. Mode detection

`GET <origin>/health` → `{ "status": "ok", "mode": "full" | "api" | "worker" }`
— unauthenticated, **same origin** as the API (strip `/api/v1/benchmarks` from
`NEXT_PUBLIC_BENCHMARK_BASE_URL` to get `<origin>`, then `+ /health`).

- Constant per deployment; **fetch once at app load and cache**.
- Behind the LB you only ever see `full` or `api` (the `worker` is private). Map
  `api`/`worker` → **split**, `full` → **full**.

OpenAPI / docs (same origin, no auth): `/openapi.json`, `/docs`, `/redoc`.
Request shapes are fully typed; **chunked-upload response bodies are loosely typed
(plain dicts)** — use the field lists below, not the schema, for response fields.

---

## 2. Feature matrix

| Feature                         | full            | split            |
| ------------------------------- | --------------- | ---------------- |
| Chunked upload (`/upload-chunked`) | ✅            | ❌ (400)         |
| Presigned upload / multipart    | ❌ (400)        | ✅               |
| Shared datasets                 | ❌ (400)        | ✅               |
| Results delivery                | direct stream (anonymous-OK) | presigned S3 URL |
| `max_upload_bytes`              | no server cap   | n/a (S3)         |

All other endpoints (`/jobs`, `GET /{job_id}`, `/{job_id}/events`, `/preview`,
`/config`, `/results/*`, `/logs*`) are **identical across modes**.

---

## 3. Upload contracts

### Full mode — resumable chunked

Create the job first (`POST /jobs`), then for each chunk:

```
POST /api/v1/benchmarks/upload-chunked        (Bearer, multipart/form-data)
fields: job_id, chunk_index, total_chunks, filename, chunk
```

- **Chunk size: 50–100 MB** (was 5 MB in the old build — bump it).
- Per-chunk response is a small ack `{ received_count, total_chunks, complete, ... }`,
  but **drive the UI off `GET /{job_id}`**, not the ack.
- **Do NOT send `combine_timeout_secs`** — ignored. Assembly is automatic the instant
  `received_count == total_chunks` (order-independent), then `extracting → uploaded`.
- **Resume** (cross-session — page reload / lost in-memory progress; not needed mid-upload,
  since each chunk POST already returns `{ received_count, total_chunks, complete }`):

  ```
  GET /api/v1/benchmarks/upload-chunked/status?job_id=<id>&filename=<name>   (Bearer; both params required)
  → { job_id, filename, received_parts: number[], received_count, assembling: bool, status }
  ```

  - `received_parts` = 0-based indices the server **already has** (sorted asc). The server does
    **not** store `total_chunks` — you own it (derived from file size) and compute `missing` yourself.
  - **Check `status`, not just `received_parts`.** After assembly the server **deletes the chunks**,
    so `received_parts` returns to `[]` while `status` advances. So:
    - `[]` + `status: "created"` → upload **everything**
    - non-empty + `"created"` → re-send only the missing indices
    - `[]` + `"uploaded"`/`"extracting"` → **already done — do not re-upload**, just poll `GET /{job_id}`
    - `assembling: true` → all parts in, combine running → poll `GET /{job_id}`
- **Cancel** (explicit user action only — frees server disk):
  ```
  POST /api/v1/benchmarks/upload-chunked/cancel   (Bearer)
  body: { "job_id": "<id>", "filename": "<name>"? }   // filename optional
  ```
  For a transient drop you don't need cancel — just retry the chunk or resume via status.

### Split mode — presigned S3 (unchanged, already implemented)

- `POST /{jobId}/upload/presign` → `{ urls: { name: { url, content_type } }, endpoint, bucket }`,
  then `PUT` each file direct to S3, then `POST /{jobId}/upload/complete`.
- Files **≥ 5 GB** → multipart: `initiate` / per-part `PUT` / `complete` (backend part
  size **100 MB**). On error → best-effort `multipart/abort`.
- Then identical extraction polling as full mode.

---

## 4. Auth semantics (both modes)

- **401** = not authenticated — missing, expired, **or** invalid token. Handle via
  refresh/login. (A missing token used to wrongly return 403.)
- **403** = authenticated but forbidden (e.g. disabled account). Do **not** treat as
  "needs login."

The `benchmarkApi` 401-refresh interceptor already matches this. The deferred client-side
auth gating on "Create Job" should key off **401**.

---

## 5. Results

`GET /{jobId}/results/manifest` returns `artifacts[]` and `plots[]`, each with a
**ready-to-use `url`**:

- full → `/api/v1/benchmarks/{id}/results/file?path=…` (same-origin, anonymous-OK)
- split → a direct presigned S3 URL

**Use the manifest `url` verbatim** in `<img src>` / `<a href download>` in both modes —
no byte-probing, no extra round-trip. Plain `<img>`/`<a>` are **not CORS-subject**, so no
S3 GET CORS change is needed for inline display (only `fetch()`/canvas would need it).

---

## 6. Job status vocabulary (identical across modes)

Handle all of: `created`, `uploaded`, `extracting`, `configured`, `preprocessing`,
`processing`, `evaluating`, `completed`, `failed`, `cancelled`.

---

## 7. Reference paths

Do **not** send LD-reference filesystem paths in tool config — the backend resolves
them server-side (env-configured) and overrides anything the client sends. Omit
`ldref_folder` / `ldref_bridgeprs` / `load_ld` entirely. (Currently sent as empty
strings via `REFERENCE_PATHS`; harmless but should be removed.)

---

## 8. Implementation plan (frontend)

Not yet implemented. Scope is small — uploads + a mode flag.

1. **`src/lib/config.ts`**
   - Add `getBenchmarkHealthUrl()` = `<origin>/health` (origin derived from `BASE_URL`).
   - Add chunked helpers: `getBenchmarkChunkedUploadUrl()` (`/upload-chunked`),
     `…StatusUrl()` (`/upload-chunked/status`), `…CancelUrl()` (`/upload-chunked/cancel`).
   - The existing `getBenchmarkUploadUrl` (`/upload?job_id=`) targets the **removed**
     single-upload route (now 405) — verify usage and remove/repurpose.

2. **Mode state** — fetch `/health` once at app load, cache (e.g. in the benchmarking
   store), expose `mode: "full" | "split"`. Prefer runtime detection over a
   `NEXT_PUBLIC_*` build-time flag (which bakes in at `next build`).

3. **`src/components/benchmarking/dataset-upload.tsx`**
   - Restore a chunked uploader (from `3cad2db~1`) with these deltas: **Bearer auth**
     (was cookie `credentials:"include"` — the critical fix), **chunk size 50–100 MB**,
     **add `/upload-chunked/status` resume**, drop `combine_timeout_secs`, always send
     `job_id`.
   - Branch `handleUpload` on `mode`: full → chunked; split → presign/multipart (current).
   - Wire user-cancel to `/upload-chunked/cancel` (full) / `multipart/abort` (split).
   - **Hide the shared-dataset UI in full mode.**

4. **Shared** (no change needed): extraction polling (`GET /{job_id}`), `/events`,
   `/preview`, `/config`, and results (`fetchPresignedUrl` already falls back — but once
   `mode` exists, use the manifest `url` directly and skip the probe).

### Gating map — what's mode-divergent vs shared

- **Divergent (gate):** upload mechanism, upload cancel, shared-dataset UI.
- **Already mode-tolerant:** results file/archive delivery.
- **Shared (no gating):** create job, job status, SSE events, preview, config submit,
  logs, my-jobs, extraction polling, status vocabulary.

---

## 9. Open items

- **S3 bucket CORS** (split only) — verify on `pgc-prs-datastore` before any split
  deploy: `AllowedMethods: [PUT, GET, HEAD]`, `ExposeHeaders: ["ETag"]` (mandatory for
  multipart), origins = staging + prod. Not in the repo (no IaC); ops action.
- **Optional:** ask backend to add `response_model`s so chunked response bodies are
  strict in the schema.
