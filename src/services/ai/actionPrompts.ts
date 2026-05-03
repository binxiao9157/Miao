import { VideoActionPrompt } from './types';

export const ACTION_PROMPTS: Record<'idle' | 'tail' | 'rubbing' | 'blink', VideoActionPrompt> = {
  idle: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。猫咪缓慢站起走向镜头轻蹭后退回蹲坐，尾帧与首帧画面 100% 一致；保留原始毛色与真实质感，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；超写实风格，固定摄像头，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  tail: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。虚拟手轻摸头顶，猫咪眯眼、耳朵后贴呈现享受状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  rubbing: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。猫咪前爪在柔软地毯上缓慢交替踩奶，身体轻微起伏，呈现放松舒适状态，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏。随后停止踩奶，尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，固定摄像头，竖屏 9:16，480P，5秒无音频，种子值 12345。",
    duration: 5
  },
  blink: {
    prompt: "基于图生图生成猫咪的照片，作为视频首帧。主人手从右侧伸入持羽毛逗猫棒晃动，猫咪兴奋抬头、挥爪、原地小跳 2 次，全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，无裁切、无出屏，嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；随后逗猫棒移开，尾帧回归初始蹲坐姿态，与首帧画面 100% 一致；超写实风格，竖屏 9:16，480P，5 秒无音频，种子值 12345。",
    duration: 5
  }
};

export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) =>
    `A ultra-realistic, high-detail portrait of a cat with ${color} fur${breed && breed !== '未知' ? `, ${breed} breed` : ''}, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera. Do NOT render any text, watermark, or name on the image.`
};
