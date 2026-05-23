type JsonHeaderOptions = {
  auth?: boolean;
  clientVersion?: string;
  headers?: HeadersInit;
};

export class HttpError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data: any) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

function getStoredToken() {
  if (typeof localStorage === "undefined") return "";
  return localStorage.getItem("miao_auth_token") || "";
}

export function buildJsonHeaders(options: JsonHeaderOptions = {}) {
  const headers = new Headers(options.headers);
  const auth = options.auth !== false;

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!headers.has("X-Client-Type")) {
    headers.set("X-Client-Type", "pwa");
  }
  if (options.clientVersion && !headers.has("X-Client-Version")) {
    headers.set("X-Client-Version", options.clientVersion);
  }

  const token = auth ? getStoredToken() : "";
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return headers;
}

async function parseJsonResponse(resp: Response) {
  const text = await resp.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export async function requestJson<T>(url: string, options: RequestInit = {}, headerOptions: JsonHeaderOptions = {}): Promise<T> {
  const resp = await fetch(url, {
    ...options,
    headers: buildJsonHeaders({
      ...headerOptions,
      headers: options.headers,
    }),
  });
  const data = await parseJsonResponse(resp);

  if (!resp.ok) {
    throw new HttpError(data.message || data.error || `HTTP ${resp.status}`, resp.status, data);
  }

  return data as T;
}
