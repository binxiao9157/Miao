import { storage, CatInfo } from './storage';

export const catService = {
  breeds: [
    { id: 'british_shorthair', name: '英国短毛猫', prompt: 'British Shorthair cat', image: 'https://picsum.photos/seed/cat_breed_1/400/400' },
    { id: 'ragdoll', name: '布偶猫', prompt: 'Ragdoll cat', image: 'https://picsum.photos/seed/cat_breed_2/400/400' },
    { id: 'siamese', name: '暹罗猫', prompt: 'Siamese cat', image: 'https://picsum.photos/seed/cat_breed_3/400/400' },
    { id: 'maine_coon', name: '缅因猫', prompt: 'Maine Coon cat', image: 'https://picsum.photos/seed/cat_breed_4/400/400' },
  ],
  
  colors: [
    { id: 'white', name: '白色', prompt: 'white', hex: '#FFFFFF' },
    { id: 'black', name: '黑色', prompt: 'black', hex: '#000000' },
    { id: 'orange', name: '橘色', prompt: 'orange', hex: '#FFA500' },
    { id: 'gray', name: '灰色', prompt: 'gray', hex: '#808080' },
    { id: 'calico', name: '三花', prompt: 'calico', hex: 'linear-gradient(45deg, #FFA500, #000000, #FFFFFF)' },
  ],

  getPrompt: (breedId: string, colorId: string) => {
    const breed = catService.breeds.find(b => b.id === breedId);
    const color = catService.colors.find(c => c.id === colorId);
    
    if (!breed || !color) return "A cute cat";
    
    return `A fluffy ${color.prompt} ${breed.prompt}, blue eyes, high detail, in a cozy cat nest, cinematic lighting, 4k`;
  },

  saveCat: (info: CatInfo) => {
    storage.saveCatInfo(info);
    catService.playMeow();
  },

  playMeow: () => {
    // 模拟播放猫叫声
    // 在实际环境中，我们会加载一个 mp3 文件
    // 这里我们用 console.log 模拟，并尝试使用 Web Audio API 播放一个简单的合成音
    console.log('🐾 Meow! 猫叫声播放中...');
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // A4

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio context not supported or blocked', e);
    }
  },

  // 模拟调用火山引擎 API (Volcano API)
  mockAnalyzeCatImage: async (imageBase64: string): Promise<Partial<CatInfo>> => {
    console.log('正在调用火山引擎 API 分析图片...', imageBase64.substring(0, 20) + '...');
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      breed: '中华田园猫',
      color: '狸花',
      name: '小元气',
      avatar: imageBase64 // 实际中可能是处理后的图片 URL
    };
  }
};
