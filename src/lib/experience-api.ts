import { clearToken, getToken, roleForPath, setToken } from "@/lib/auth-token";

export type ExperienceCategory = {
  id: string;
  slug: string;
  name: string;
};

export type ExperienceMedia = {
  id: string;
  kind: "IMAGE" | "VIDEO";
  altText: string | null;
  url: string;
  mime: string | null;
  thumbnailUrl: string | null;
};

export type Experience = {
  id: string;
  title: string;
  shortDescription: string;
  story?: string;
  category: ExperienceCategory | null;
  destinationId: number | null;
  resortId: number | null;
  visitDate: string | null;
  overallRating: number;
  ratings: {
    hospitality: number;
    cleanliness: number;
    location: number;
    amenities: number;
    food: number;
  };
  status: string;
  moderationReason: string | null;
  featured: boolean;
  verifiedMember: boolean;
  verifiedStay: boolean;
  member: { displayName: string; email?: string; verifiedMember?: boolean } | null;
  media: ExperienceMedia[];
  views: number;
  likeCount: number;
  commentCount: number;
  averageCommunityRating: number | null;
  communityRatingCount: number;
  publishedAt: string | null;
  createdAt: string;
  previewOnly?: boolean;
  previewPlace?: string;
};

export type DestinationOption = {
  id: number;
  name: string;
  region: string;
};

export type ResortOption = {
  id: number;
  name: string;
  location: string;
};

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export const apiBase = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/+$/, "");

let csrfToken = "";

export function updateCsrfToken(value: string) {
  csrfToken = value;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const response = await fetch(`${apiBase}/auth/csrf`, { credentials: "include" });
  const result = (await response.json()) as { token?: string; message?: string };
  if (!response.ok || !result.token) {
    throw new Error(result.message || "Could not connect to the hospitality service.");
  }
  csrfToken = result.token;
  return csrfToken;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const method = options.method?.toUpperCase() ?? "GET";
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    headers.set("X-CSRF-Token", await getCsrfToken());
  }
  const role = roleForPath(path);
  const jwt = role ? getToken(role) : "";
  if (jwt) headers.set("Authorization", "Bearer " + jwt);
  let response = await fetch(`${apiBase}/${path.replace(/^\/+/, "")}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  });
  if (response.status === 403 && !["GET", "HEAD", "OPTIONS"].includes(method)) {
    csrfToken = "";
    headers.set("X-CSRF-Token", await getCsrfToken());
    response = await fetch(`${apiBase}/${path.replace(/^\/+/, "")}`, {
      ...options,
      method,
      headers,
      credentials: "include",
    });
  }
  const result = (await response.json().catch(() => ({}))) as T & {
    message?: string;
    token?: string;
  };
  if (role) {
    if (response.ok && typeof result.token === "string") setToken(role, result.token);
    if (/logout$/.test(path) || (response.status === 401 && jwt)) clearToken(role);
  }
  if (!response.ok) throw new Error(result.message || "The request could not be completed.");
  return { data: result, message: result.message };
}

export async function uploadExperience(
  formData: FormData,
  onProgress: (progress: number) => void,
  experienceId?: string,
) {
  const csrf = await getCsrfToken();
  return new Promise<Experience>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      experienceId ? "PUT" : "POST",
      `${apiBase}/community/experiences${experienceId ? `/${experienceId}` : ""}`,
    );
    request.withCredentials = true;
    request.setRequestHeader("X-CSRF-Token", csrf);
    const memberToken = getToken("member");
    if (memberToken) request.setRequestHeader("Authorization", "Bearer " + memberToken);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      let result: { message?: string; experience?: Experience };
      try {
        result = JSON.parse(request.responseText || "{}") as {
          message?: string;
          experience?: Experience;
        };
      } catch {
        reject(new Error("The server returned an unreadable upload response."));
        return;
      }
      if (request.status < 200 || request.status >= 300 || !result.experience) {
        reject(new Error(result.message || "Experience upload failed."));
        return;
      }
      onProgress(100);
      resolve(result.experience);
    };
    request.onerror = () => reject(new Error("Could not reach the experience service."));
    request.onabort = () => reject(new Error("Experience upload was cancelled."));
    request.send(formData);
  });
}

export async function protectedMediaUrl(url: string) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("Media preview is unavailable.");
  return URL.createObjectURL(await response.blob());
}

export function clearCsrfToken() {
  csrfToken = "";
}
