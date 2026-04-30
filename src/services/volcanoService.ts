import { aiClient } from './ai/aiClient';
import { aiConfig } from './ai/aiConfig';
import { ACTION_PROMPTS, IMAGE_PROMPTS } from './ai/actionPrompts';

/**
 * Backward-compatible export. New code should import from services/ai/*.
 */
export const VolcanoConfig = {
  get MOCK_MODE() {
    return aiConfig.getProfile().mockMode;
  },
  get ModelId() {
    return aiConfig.getProfile().videoModel;
  },
  get T2IModelId() {
    return aiConfig.getProfile().imageModel;
  },
};

export { ACTION_PROMPTS, IMAGE_PROMPTS };

export class VolcanoService {
  public static submitTask = aiClient.submitVideoTask;
  public static getTaskResult = (taskId: string) => aiClient.getTaskResult(taskId, 'video');
  public static submitImageTask = aiClient.submitImageTask;
  public static pollImageResult = aiClient.pollImageResult;
  public static pollTaskResult = aiClient.pollVideoResult;
}
