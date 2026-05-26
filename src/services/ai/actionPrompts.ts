import { VideoActionPrompt } from './types';

export const ACTION_PROMPTS: Record<'v1_approach' | 'v2_wait' | 'v3_return' | 'v4_fetch', VideoActionPrompt> = {
  v1_approach: {
    prompt: "第一人称固定视角，空间纵深感清晰，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。0-3.5 秒：猫咪轻巧跳下猫窝，步伐轻快从远景走向镜头正下方近景。3.5-6秒：镜头平滑下摇转为轻微俯视，地板上彩色毛线球完整入画。地板上不要有人脚鞋子等人体部位。6-7 秒：猫咪停在毛线球旁，一直抬头仰视镜头直到视频结束，眼神渴望期待；猫咪嘴部结构真实，无拟人化。全程猫咪身体完整，画面无裁切、无畸变。",
    duration: 7
  },
  v2_wait: {
    prompt: "猫咪身体保持静止，仅有面部表情和眼神变化（包含轻轻张嘴叫唤时引起的面部表情、微表情和眼神闪烁变化），视频首尾两帧保持严格一致。嘴巴细节严格遵循真实猫咪生理结构，无拟人化特征；全程保证猫咪完整身体（含头部、躯干、四肢）始终在竖屏 9:16 画面内，静止无任何身体位移，无裁切、无出屏。超写实风格，竖屏 9:16，480P，4秒无音频，种子值 12345。",
    duration: 4
  },
  v3_return: {
    prompt: "第一人称固定视角，明确空间纵深感，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。镜头起始轻微俯视，0-1.5秒猫咪低头转身，嘴巴细节真实无拟人化。1.5-4秒猫咪从近景慢慢走向猫窝，镜头平滑抬升至平视，固定展现房间纵深。4-5 秒猫咪跳上猫窝。5-7 秒猫咪转身并缓慢调整姿态，全程猫咪完整身体在画面内，无裁切、无畸变、无错位。",
    duration: 7
  },
  v4_fetch: {
    prompt: "第一人称固定视角，明确空间纵深感，竖屏 9:16，480P，7 秒无音频，超写实风格，自然光影，种子值 12345。镜头起始轻微俯视，0-1.5 秒人类手从镜头底端伸入，握毛线球用力向前抛出，毛球沿符合物理规律的抛物线轨迹滚向远处猫窝；毛球抛出后，镜头平滑抬升至平视，固定展现房间纵深。1.5-3 秒猫咪从近景迅速跑向猫窝，精准叼起毛球，嘴巴细节真实无拟人化。3-5 秒猫咪转身跳上猫窝，放下毛球。5-7 秒猫咪缓慢调整姿态，全程猫咪完整身体在画面内，无裁切、无畸变、无错位。",
    duration: 7
  }
};

export const IMAGE_PROMPTS = {
  anchor: (breed: string, color: string) =>
    `A ultra-realistic, high-detail portrait of a cat with ${color} fur${breed && breed !== '未知' ? `, ${breed} breed` : ''}, sitting comfortably in a soft cat nest, cinematic lighting, 4k resolution, looking at the camera. Do NOT render any text, watermark, or name on the image.`
};
