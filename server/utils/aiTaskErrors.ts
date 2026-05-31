export type AIProviderName = 'dashscope' | 'volcengine';
export type AITaskType = 'image' | 'video';

type ErrorLike = Error & {
  response?: {
    status?: number;
    data?: Record<string, unknown>;
  };
};

const providerLabel = (provider: AIProviderName) =>
  provider === 'volcengine' ? '火山引擎' : '阿里百炼';

const missingApiKeyName = (provider: AIProviderName) =>
  provider === 'volcengine' ? 'VOLC_API_KEY' : 'DASHSCOPE_API_KEY';

export const createMissingApiKeyError = (provider: AIProviderName): ErrorLike => {
  const keyName = missingApiKeyName(provider);
  const error = new Error(`服务器未配置 ${keyName}，无法调用${providerLabel(provider)}模型。`) as ErrorLike;
  error.response = {
    status: 500,
    data: {
      code: provider === 'volcengine' ? 'MISSING_VOLC_API_KEY' : 'MISSING_DASHSCOPE_API_KEY',
      message: error.message,
    },
  };
  return error;
};

export const createAiImageRequestError = (provider: AIProviderName, cause: any): ErrorLike => {
  const upstreamData = cause?.response?.data || {};
  const upstreamMessage = upstreamData?.message || upstreamData?.error?.message || cause?.message || '图片生成请求失败';
  const error = new Error(String(upstreamMessage)) as ErrorLike;
  error.response = {
    status: cause?.response?.status || 502,
    data: {
      code: provider === 'volcengine' ? 'VOLC_IMAGE_REQUEST_FAILED' : 'DASHSCOPE_IMAGE_REQUEST_FAILED',
      message: String(upstreamMessage),
      upstreamCode: upstreamData?.code || upstreamData?.error?.code,
      upstreamData,
    },
  };
  return error;
};

export const isMockServerTaskId = (taskId: string | undefined): boolean =>
  typeof taskId === 'string' && taskId.startsWith('mock-server-task-');

export const createMockTaskPollResponse = (
  taskId: string,
  type: AITaskType,
  provider: AIProviderName,
) => ({
  status: 502,
  body: {
    status: 'failed',
    code: 'MOCK_TASK_NOT_EXECUTABLE',
    message: '该任务是服务端降级 mock 任务，未提交到真实 AI 服务，请检查上一次生成请求的服务端错误日志。',
    taskId,
    type,
    provider,
  },
});
