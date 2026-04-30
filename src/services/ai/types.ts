export type AIProvider = 'dashscope' | 'volcengine';

export interface AIProfile {
  provider: AIProvider;
  imageModel: string;
  videoModel: string;
  resolution: string;
  duration: number;
  seed: number;
  promptExtend: boolean;
  mockMode: boolean;
  skipImageStage: boolean;
}

export interface AITaskResponse {
  id: string;
  status?: string;
  image_url?: string;
  video_url?: string;
  provider?: AIProvider;
}

export interface VideoActionPrompt {
  prompt: string;
  duration: number;
}
