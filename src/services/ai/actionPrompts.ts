import { VideoActionPrompt } from './types';

export const ACTION_PROMPTS: Record<'v1_approach' | 'v2_wait' | 'v3_return' | 'v4_fetch', VideoActionPrompt> = {
  v1_approach: {
    prompt: "猫咪走到镜头前，镜头地上有毛线球，眼睛非常渴望地盯着镜头；嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。超写实风格，竖屏 9:16，480P，7秒无音频，种子值 12345。",
    duration: 7
  },
  v2_wait: {
    prompt: "猫咪看着镜头，一直轻轻地张嘴猫叫；嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。超写实风格，竖屏 9:16，480P，2秒无音频，种子值 12345。",
    duration: 2
  },
  v3_return: {
    prompt: "猫咪转身慢慢走回猫窝，蹲下看着镜头；嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。超写实风格, 竖屏 9:16，480P，7秒无音频，种子值 12345。",
    duration: 7
  },
  v4_fetch: {
    prompt: "一只人手将毛线球扔到远处，猫咪迅速跑过去捡起毛球，跑回到猫窝后放下毛球并跳回到猫窝上蹲下看着镜头；嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。超写实风格，竖屏 9:16，480P，7秒无音频，种子值 12345。",
    duration: 7
  }
};

export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) =>
    `A ultra-realistic, high-detail portrait of a cat with ${color} fur${breed && breed !== '未知' ? `, ${breed} breed` : ''}, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera. Do NOT render any text, watermark, or name on the image.`
};
