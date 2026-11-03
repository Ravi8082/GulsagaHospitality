import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, apiRequest } from "@/lib/experience-api";

export type SaveStatus = {
  state: "idle" | "saving" | "saved" | "error";
  message?: string;
};

const mediaPath = "/api/public/media/";
const origin = apiBase.replace(/\/api$/, "");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Stored values win; defaults fill any field added to the site after the content was saved.
function deepMerge(defaults: unknown, stored: unknown): unknown {
  if (isPlainObject(defaults) && isPlainObject(stored)) {
    const result: Record<string, unknown> = { ...defaults };
    for (const [key, value] of Object.entries(stored))
      result[key] = deepMerge(defaults[key], value);
    return result;
  }
  return stored === undefined ? defaults : stored;
}

function mapStrings(value: unknown, change: (text: string) => string): unknown {
  if (typeof value === "string") return change(value);
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, change));
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, mapStrings(v, change)]));
  }
  return value;
}

const toBrowserUrl = (text: string) => (text.startsWith(mediaPath) ? origin + text : text);
const toStoredUrl = (text: string) =>
  origin && text.startsWith(origin + mediaPath) ? text.slice(origin.length) : text;

async function uploadBlobs(value: unknown, files: Map<string, File>): Promise<unknown> {
  const blobs = new Set<string>();
  mapStrings(value, (text) => {
    if (text.startsWith("blob:")) blobs.add(text);
    return text;
  });
  if (blobs.size === 0) return value;
  const uploaded = new Map<string, string>();
  for (const blob of blobs) {
    const file = files.get(blob);
    if (!file) throw new Error("A selected file is no longer available. Choose it again.");
    const body = new FormData();
    body.append("file", file);
    const { data } = await apiRequest<{ url: string }>("admin/site-media", {
      method: "POST",
      body,
    });
    uploaded.set(blob, origin + data.url);
  }
  return mapStrings(value, (text) => uploaded.get(text) ?? text);
}

type Slot = { initial: unknown; apply: (value: unknown) => void };

// Loads administrator-edited content from the database and saves each change with its history.
export function useContentPersistence() {
  const slots = useRef(new Map<string, Slot>());
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const latest = useRef(new Map<string, unknown>());
  const files = useRef(new Map<string, File>());
  const [hydrated, setHydrated] = useState(false);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });

  const register = useCallback((key: string, initial: unknown, apply: (value: unknown) => void) => {
    slots.current.set(key, { initial, apply });
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<{ content: Record<string, { data: unknown }> }>("public/site-content")
      .then(({ data }) => {
        if (!active) return;
        for (const [key, slot] of slots.current) {
          const stored = data.content[key]?.data;
          if (stored !== undefined) {
            slot.apply(deepMerge(slot.initial, mapStrings(stored, toBrowserUrl)));
          }
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message =
          error instanceof Error ? error.message : "Could not connect to the content service.";
        setStatus({
          state: "error",
          message: `Could not load saved content: ${message}`,
        });
      })
      .finally(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);

  const flush = useCallback(async (key: string) => {
    const value = latest.current.get(key);
    try {
      const withUploads = await uploadBlobs(value, files.current);
      if (withUploads !== value && latest.current.get(key) === value) {
        slots.current.get(key)?.apply(withUploads);
      }
      await apiRequest(`admin/site-content/${key}`, {
        method: "PUT",
        body: JSON.stringify({ data: mapStrings(withUploads, toStoredUrl) }),
      });
      setStatus({ state: "saved", message: "All changes saved to the database." });
    } catch (error) {
      const text = error instanceof Error ? error.message : "Save failed.";
      setStatus({
        state: "error",
        message: /sign|auth|permission/i.test(text)
          ? "Not saved: sign in as an administrator to save to the database."
          : `Not saved: ${text}`,
      });
    }
  }, []);

  const schedule = useCallback(
    (key: string, value: unknown) => {
      latest.current.set(key, value);
      clearTimeout(timers.current.get(key));
      timers.current.set(
        key,
        setTimeout(() => void flush(key), 700),
      );
      setStatus({ state: "saving", message: "Saving…" });
    },
    [flush],
  );

  const rememberFile = useCallback((url: string, file: File) => {
    files.current.set(url, file);
  }, []);

  return { register, schedule, rememberFile, hydrated, status };
}
