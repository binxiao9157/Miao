export type ContentSafetyScene =
  | "cat_profile"
  | "cat_upload"
  | "comment"
  | "diary"
  | "feedback"
  | "profile"
  | "time_letter"
  | string;

export type MediaSafetyType = "image" | "video";

export type SafetyResult = {
  passed: boolean;
  safe: boolean;
  code: string;
  message: string;
  labels: string[];
  scene: string;
  checkedAt: number;
};

type UploadedFileLike = {
  mimetype?: string;
  size?: number;
  originalname?: string;
};

type MediaSafetyInput = {
  mediaUrl?: string;
  mediaType: MediaSafetyType;
  scene: ContentSafetyScene;
  file?: UploadedFileLike;
};

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 20 * 1024 * 1024;

const TEXT_RULES: Array<{ label: string; pattern: RegExp }> = [
  { label: "pornography", pattern: /色情|淫秽|裸聊|约炮|成人视频/i },
  { label: "gambling", pattern: /赌博|博彩|下注|六合彩|赌球/i },
  { label: "drugs", pattern: /毒品|冰毒|贩毒|吸毒|大麻/i },
  { label: "violence", pattern: /血腥|砍人|杀人|虐待|自残|自杀/i },
  { label: "fraud", pattern: /刷单|套现|诈骗|黑产|洗钱/i },
];

function result(passed: boolean, scene: ContentSafetyScene, code: string, message: string, labels: string[] = []): SafetyResult {
  return {
    passed,
    safe: passed,
    code,
    message,
    labels,
    scene: String(scene || "unknown"),
    checkedAt: Date.now(),
  };
}

export function createSafetyPass(scene: ContentSafetyScene): SafetyResult {
  return result(true, scene, "PASS", "内容安全检查通过");
}

export function createSafetyReject(scene: ContentSafetyScene, code: string, message: string, labels: string[] = []): SafetyResult {
  return result(false, scene, code, message, labels);
}

export function checkTextSafety(content: unknown, scene: ContentSafetyScene): SafetyResult {
  const text = String(content || "").trim();
  if (!text) return createSafetyPass(scene);
  if (text.length > 2000) {
    return createSafetyReject(scene, "TEXT_TOO_LONG", "文本内容过长，请精简后再提交", ["length"]);
  }

  const labels = TEXT_RULES
    .filter(rule => rule.pattern.test(text))
    .map(rule => rule.label);
  if (labels.length > 0) {
    return createSafetyReject(scene, "LOCAL_TEXT_REJECTED", "内容包含不合规信息，请修改后再提交", labels);
  }

  return createSafetyPass(scene);
}

function isValidMediaType(mediaType: unknown): mediaType is MediaSafetyType {
  return mediaType === "image" || mediaType === "video";
}

function isValidRemoteMediaUrl(mediaUrl: string): boolean {
  try {
    const url = new URL(mediaUrl);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function matchesMime(mediaType: MediaSafetyType, mimeType?: string): boolean {
  if (!mimeType) return true;
  return mediaType === "image"
    ? mimeType.startsWith("image/")
    : mimeType.startsWith("video/");
}

export function checkMediaSafety(input: MediaSafetyInput): SafetyResult {
  const { mediaType, scene, mediaUrl, file } = input;
  if (!isValidMediaType(mediaType)) {
    return createSafetyReject(scene, "INVALID_MEDIA_TYPE", "媒体类型不支持", ["media_type"]);
  }

  if (mediaUrl && !isValidRemoteMediaUrl(mediaUrl)) {
    return createSafetyReject(scene, "INVALID_MEDIA_URL", "媒体地址不合法", ["media_url"]);
  }

  if (file) {
    const maxSize = mediaType === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (!matchesMime(mediaType, file.mimetype)) {
      return createSafetyReject(scene, "MEDIA_MIME_MISMATCH", "上传文件类型与媒体类型不一致", ["mime"]);
    }
    if ((file.size || 0) > maxSize) {
      return createSafetyReject(scene, "MEDIA_TOO_LARGE", "媒体文件过大，请压缩后再上传", ["size"]);
    }
  }

  return createSafetyPass(scene);
}
