type EnvLike = Record<string, string | undefined>;

export type AiTaskType = "image" | "video";
export type AiProvider = "dashscope" | "volcengine";

function isTruthyFlag(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

export function isAiServerMockFallbackAllowed(env: EnvLike = process.env) {
  return isTruthyFlag(env.MIAO_SERVER_AI_MOCK_MODE) || isTruthyFlag(env.AI_SERVER_MOCK_MODE);
}

export function createAiUpstreamUnavailableError(type: AiTaskType, provider: "dashscope" | "volcengine", reason: string) {
  const message = `${provider} ${type === "image" ? "图片" : "视频"}生成服务暂不可用，请稍后重试`;
  const error = new Error(message) as Error & {
    response: {
      status: number;
      data: {
        code: string;
        message: string;
        type: AiTaskType;
        provider: "dashscope" | "volcengine";
        retryable: boolean;
        reason?: string;
      };
    };
  };

  error.response = {
    status: 502,
    data: {
      code: "AI_UPSTREAM_UNAVAILABLE",
      message,
      type,
      provider,
      retryable: true,
      reason: reason || undefined,
    },
  };

  return error;
}
