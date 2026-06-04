import { useState, useEffect, useRef, ChangeEvent, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { Plus, Heart, MessageCircle, Share2, Image as ImageIcon, Video, X, Send, Sparkles, Trash2, CheckCircle, Loader2, ArrowUpRight, UserPlus, QrCode, Search } from "lucide-react";
import { storage, DiaryEntry, CatInfo, FriendDiaryEntry } from "../services/storage";
import { motion, AnimatePresence, LayoutGroup } from "motion/react";
import { useAuthContext } from "../context/AuthContext";
import DiaryCard from "../components/DiaryCard";
import { shareService } from "../services/shareService";
import PageHeader from "../components/PageHeader";
import { mediaStorage } from "../services/mediaStorage";
import { friendService } from "../services/friendService";
import { PrivateMessageShare } from "../components/PrivateMessageShare";
import CommentInput from "../components/CommentInput";
import { ShareSheet } from "../components/ShareSheet";
import ImageViewer from "../components/ImageViewer";

const compressImage = (file: File, maxSize = 1200, quality = 0.8): Promise<string> => {
  return new Promise<string>((resolve) => {
    console.log(`[Compression] Starting compression for file: name=${file.name}, size=${(file.size / 1024 / 1024).toFixed(2)}MB, type=${file.type}`);
    
    // Check if the URL capability exists
    const useObjectURL = typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
    
    if (useObjectURL) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          console.log(`[Compression] Image loaded successfully via ObjectURL. Original dimensions: ${img.width}x${img.height}`);
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          
          if (w > maxSize || h > maxSize) {
            const ratio = Math.min(maxSize / w, maxSize / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
            console.log(`[Compression] Resizing image to: ${w}x${h}`);
          }
          
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            console.log(`[Compression] Compression succeeded. Output size: ${(dataUrl.length / 1024).toFixed(2)}KB`);
            resolve(dataUrl);
            return;
          } else {
            console.warn(`[Compression] Failed to get 2D context from canvas.`);
          }
        } catch (err) {
          console.error("[Compression] Error during canvas processing:", err);
        } finally {
          URL.revokeObjectURL(objectUrl);
        }
        
        // Fallback to FileReader if something fails
        console.log(`[Compression] Falling back to FileReader due to canvas/context error`);
        fallbackWithFileReader(file, resolve);
      };
      
      img.onerror = (err) => {
        console.error("[Compression] Image error via ObjectURL. Error details:", err);
        URL.revokeObjectURL(objectUrl);
        console.log(`[Compression] Falling back to FileReader due to image load error`);
        fallbackWithFileReader(file, resolve);
      };
      
      img.src = objectUrl;
    } else {
      console.log(`[Compression] ObjectURL not supported, using FileReader directly`);
      fallbackWithFileReader(file, resolve);
    }
  });
};

const fallbackWithFileReader = (file: File, resolve: (val: string) => void) => {
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        const maxSize = 1200;
        if (w > maxSize || h > maxSize) {
          const ratio = Math.min(maxSize / w, maxSize / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
          return;
        }
      } catch (err) {
        console.error("[Compression] FileReader fallback: canvas processing error:", err);
      }
      resolve(result); // Fallback to original base64
    };
    img.onerror = () => {
      resolve(result); // Fallback to original base64
    };
    img.src = result;
  };
  reader.onerror = (err) => {
    console.error("[Compression] FileReader hard error:", err);
    resolve("");
  };
  reader.readAsDataURL(file);
};

export default function Diary() {
  const { user } = useAuthContext();
  const [activeCat, setActiveCat] = useState<CatInfo | null>(null);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [isPosting, setIsPosting] = useState(false);
  const [sharingEntry, setSharingEntry] = useState<DiaryEntry | null>(null);
  const [showWeChatGuide, setShowWeChatGuide] = useState(false);
  const [showPrivateShare, setShowPrivateShare] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [selectedMediaList, setSelectedMediaList] = useState<{ url: string; type: 'image' | 'video'; file?: File }[]>([]);
  const [viewerImages, setViewerImages] = useState<string[] | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number>(0);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteToast, setShowDeleteToast] = useState(false);
  const [showPostToast, setShowPostToast] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [showShareToast, setShowShareToast] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [customAlert, setCustomAlert] = useState<{
    show: boolean;
    title: string;
    message: string;
    isError?: boolean;
    logs?: string[];
  } | null>(null);

  const showAlert = (title: string, message: string, isError = false, logs?: string[]) => {
    setCustomAlert({
      show: true,
      title,
      message,
      isError,
      logs,
    });
  };
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showAddFriendMenu, setShowAddFriendMenu] = useState(false);
  const [addFriendStep, setAddFriendStep] = useState(1);
  const [selectedCatForQR, setSelectedCatForQR] = useState<CatInfo | null>(null);
  const [catList, setCatList] = useState<CatInfo[]>([]);
  const [activeTab, setActiveTab] = useState<'mine' | 'friends'>('mine');
  const [friendDiaries, setFriendDiaries] = useState<FriendDiaryEntry[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const formatDateHeader = (timestamp: number) => {
    const dateObj = new Date(timestamp);
    const today = new Date();
    if (dateObj.toDateString() === today.toDateString()) {
      return "今天";
    }
    const month = dateObj.getMonth() + 1;
    const date = dateObj.getDate();
    return `${month}月${date}日`;
  };

  const processDiaries = (entries: DiaryEntry[]) => {
    const now = Date.now();
    const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

    const recentList: DiaryEntry[] = [];
    const olderList: DiaryEntry[] = [];

    entries.forEach(entry => {
      if (now - entry.createdAt <= ONE_MONTH_MS) {
        recentList.push(entry);
      } else {
        olderList.push(entry);
      }
    });

    const recentGroups: { dateLabel: string; items: DiaryEntry[] }[] = [];
    const dateMap = new Map<string, DiaryEntry[]>();

    recentList.forEach(entry => {
      const label = formatDateHeader(entry.createdAt);
      if (!dateMap.has(label)) {
        dateMap.set(label, []);
      }
      dateMap.get(label)!.push(entry);
    });

    dateMap.forEach((items, label) => {
      recentGroups.push({ dateLabel: label, items });
    });

    const olderGroups: { monthLabel: string; items: DiaryEntry[] }[] = [];
    const monthMap = new Map<string, DiaryEntry[]>();

    olderList.forEach(entry => {
      const dateObj = new Date(entry.createdAt);
      const label = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月`;
      if (!monthMap.has(label)) {
        monthMap.set(label, []);
      }
      monthMap.get(label)!.push(entry);
    });

    monthMap.forEach((items, label) => {
      olderGroups.push({ monthLabel: label, items });
    });

    return { recentGroups, olderGroups };
  };

  const toggleMonth = (monthLabel: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [monthLabel]: !prev[monthLabel]
    }));
  };

  const navigate = useNavigate();

  const MAX_COMMENT_LENGTH = 100;

  useEffect(() => {
    if (!window.visualViewport) return;

    const handleResize = () => {
      const vh = window.visualViewport?.height || window.innerHeight;
      // 在某些移动端浏览器中，innerHeight 会随键盘弹出而改变，有些则不会
      // 我们计算差值来模拟 viewInsets.bottom
      const offset = window.innerHeight - vh;
      setKeyboardHeight(Math.max(0, offset));
    };

    window.visualViewport.addEventListener('resize', handleResize);
    // 初始检查
    handleResize();
    
    return () => window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!commentingId) return;
    // 延迟一小会儿等待键盘弹出或弹窗渲染
    const timer = setTimeout(() => {
      const element = document.getElementById(commentingId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [commentingId]);

  const loadData = useCallback(async () => {
    const currentActiveCat = storage.getActiveCat();
    setActiveCat(currentActiveCat);
    
    let allDiaries = storage.getDiaries();
    if (currentActiveCat) {
      const mockIds = ['mock_diary_1_month', 'mock_diary_1_year', 'mock_diary_2_years'];
      const hasMocks = allDiaries.some(d => mockIds.includes(d.id));
      
      if (!hasMocks) {
        const now = Date.now();
        const mockEntries: DiaryEntry[] = [
          {
            id: 'mock_diary_1_month',
            catId: currentActiveCat.id,
            content: "今天猫咪终于愿意躺在我的膝盖上睡觉了，它的呼吸好轻柔，像一个小小的暖水袋。那一刻时间仿佛静止了，希望这一秒能无限延长。💕",
            media: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=1000&auto=format&fit=crop",
            mediaType: 'image',
            createdAt: now - 30 * 24 * 60 * 60 * 1000,
            likes: 3,
            isLiked: false,
            comments: []
          },
          {
            id: 'mock_diary_1_year',
            catId: currentActiveCat.id,
            content: "带小可爱去做了第一次全身健康体检！医生说它发育得非常好，比同龄猫咪更活泼。看它有些不知所措地趴在我怀里，我也暗暗发誓要给它最温暖安稳的一生。🩺❤️",
            media: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=1000&auto=format&fit=crop",
            mediaType: 'image',
            createdAt: now - 365 * 24 * 60 * 60 * 1000,
            likes: 8,
            isLiked: true,
            comments: []
          },
          {
            id: 'mock_diary_2_years',
            catId: currentActiveCat.id,
            content: "迎来了家庭新成员的第一天！刚到家的时候它害怕得躲在床底不肯出来，我拿罐头和逗猫棒在外面轻轻叫它，直到凌晨它才探出小脑袋闻了闻。欢迎来到新家，我们的小天使。🐾✨",
            media: "https://images.unsplash.com/photo-1533738363-b7f9aef128ce?q=80&w=1000&auto=format&fit=crop",
            mediaType: 'image',
            createdAt: now - 730 * 24 * 60 * 60 * 1000,
            likes: 15,
            isLiked: false,
            comments: []
          }
        ];
        allDiaries = [...allDiaries, ...mockEntries];
        storage.saveDiaries(allDiaries);
      }
    }

    if (allDiaries.some(d => d.media?.startsWith('indexeddb:'))) {
      storage.saveDiaries(allDiaries);
    }
    if (currentActiveCat) {
      setDiaries(allDiaries.filter(d => d.catId === currentActiveCat.id));
    } else {
      setDiaries([]);
    }
    
    try {
      await friendService.syncFriends();
      await friendService.syncFriendDiaries();
    } catch (error) {
      console.warn("同步好友动态失败:", error);
    }
    setFriendDiaries(storage.getFriendDiaries());
    setCatList(storage.getCatList());
  }, []);

  useEffect(() => {
    // 缩短延迟，平衡动画流畅度与加载速度
    const timer = setTimeout(() => { void loadData(); }, 50);
    
    // 监听猫咪切换事件
    const handleCatChange = () => {
      void loadData();
    };
    window.addEventListener('active-cat-changed', handleCatChange);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('active-cat-changed', handleCatChange);
    };
  }, [loadData]);

  const closePostingModal = () => {
    // 释放 URL 对象
    selectedMediaList.forEach(m => {
      if (m.url && m.url.startsWith('blob:')) {
        URL.revokeObjectURL(m.url);
      }
    });
    setIsPosting(false);
    setNewContent("");
    setSelectedMediaList([]);
    setIsReadingFile(false);
    setIsLoading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleAutoWriteDiary = () => {
    if (!activeCat) {
      showAlert("提示", "请先选择或培育一只活跃的喵咪伙伴！");
      return;
    }
    
    const breed = activeCat.breed || "可爱的小猫";
    const name = activeCat.name || "咪咪";
    const furColor = activeCat.color || "软萌";
    
    const catDiaries = [
      `今天，我的${furColor}${breed}「${name}」特别乖。清晨第一缕阳光洒进来时，它就用温热湿漉漉的小鼻子贴我的脸，一串咕噜咕噜轻快的低吟像个小马达，仿佛在小声撒娇。真的是超级治愈的一天～🌸`,
      `「${name}」（一只能干的${furColor}${breed}）下午不知道怎么就疯玩起来！紧紧抱着它的毛绒玩具在客厅地毯上连续翻滚，最后呼的一下侧躺在软毯上。我伸手揉摸它的肚子，它就轻轻抱紧我的手，眼睛弯成好看的心状。🐾`,
      `夕阳斜照风铃响，我和${breed}「${name}」慵懒地靠在地毯一角。它蜷曲起毛茸茸的身板打瞌睡，耳朵随着声音偶尔抖一抖。陪伴无声，但在流泻的日子里，心已经溢满温暖。✨`,
      `新伙伴「${name}」今天解锁了超神逗比神态！我看书的时候，它冷不丁一跃趴伏在书页正下方，仰着肥美的小下巴圆鼓鼓对准我叫，像在严正抗议我太冷漠。罢了罢了，这本先合上，先揉乱你毛发！😸`
    ];
    
    const chosen = catDiaries[Math.floor(Math.random() * catDiaries.length)];
    setNewContent(chosen);
  };

  const handlePost = async () => {
    if ((!newContent.trim() && selectedMediaList.length === 0) || isLoading) return;

    const consoleLogs: string[] = [];
    const addLog = (msg: string) => {
      const formatted = `[${new Date().toISOString().split('T')[1].substring(0, 8)}] ${msg}`;
      console.log(formatted);
      consoleLogs.push(formatted);
    };

    try {
      addLog("开始发布流程...");
      setIsLoading(true);
      
      const activeCatId = storage.getActiveCatId();
      addLog(`活跃猫咪 ID: ${activeCatId}`);
      if (!activeCatId) throw new Error("未找到活跃猫咪，无法发布日记");

      // 模拟保存延迟与媒体文件处理耗时
      addLog("延时模拟开始...");
      await new Promise(resolve => setTimeout(resolve, 1200));
      addLog("延时模拟结束。");

      const diaryId = 'diary_' + Date.now();
      let mediaUrl: string | undefined = undefined;
      let mediaType: 'image' | 'video' | undefined = undefined;
      let imagesList: string[] = [];

      const isVideo = selectedMediaList.some(m => m.type === 'video');
      addLog(`媒体数量: ${selectedMediaList.length}, 是否包含视频: ${isVideo}`);

      if (isVideo) {
        const videoMedia = selectedMediaList.find(m => m.type === 'video')!;
        mediaType = 'video';
        if (videoMedia.file) {
          addLog(`开始处理视频文件: name=${videoMedia.file.name}, size=${(videoMedia.file.size / 1024 / 1024).toFixed(2)}MB`);
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(videoMedia.file!);
          });
          
          try {
            addLog("正在保存视频到 IndexedDB...");
            await mediaStorage.saveMedia(diaryId, base64);
            mediaUrl = `indexeddb:${diaryId}`;
            addLog("视频已成功存入 IndexedDB。");
          } catch (storageErr: any) {
            addLog(`IndexedDB 存储失败，退回到 Base64。原因: ${storageErr?.message || storageErr}`);
            mediaUrl = base64;
          }
        } else {
          addLog(`使用视频已有的 URL: ${videoMedia.url}`);
          mediaUrl = videoMedia.url;
        }
      } else if (selectedMediaList.length > 0) {
        mediaType = 'image';
        addLog(`开始遍历处理 ${selectedMediaList.length} 张图片...`);
        
        for (let i = 0; i < selectedMediaList.length; i++) {
          const m = selectedMediaList[i];
          const isBase64 = m.url.startsWith('data:image/');
          addLog(` ├─ 图片 [${i + 1}/${selectedMediaList.length}]: fileExists=${!!m.file}, isBase64=${isBase64}, size=${m.file ? (m.file.size / 1024).toFixed(2) + "KB" : "N/A"}`);
          
          let base64ToSave: string | null = null;
          
          if (m.file) {
            // Under normal circumstances, images have already been pre-compressed into base64 upon selection.
            // If they are not (e.g. edge cases where instant compression failed), we compress them here.
            addLog(` ├─ 正在压缩未预压缩的图片 [${i + 1}]...`);
            base64ToSave = await compressImage(m.file!);
          } else if (isBase64) {
            addLog(` ├─ 使用已预压缩的 Base64 数据 [${i + 1}]`);
            base64ToSave = m.url;
          }
          
          if (base64ToSave) {
            const imgKey = `${diaryId}_img_${i}`;
            try {
              addLog(` ├─ 正在将图片 [${i + 1}] 写入 IndexedDB (key: ${imgKey})...`);
              await mediaStorage.saveMedia(imgKey, base64ToSave);
              imagesList.push(`indexeddb:${imgKey}`);
              addLog(` ├─ 写入 IndexedDB 成功。`);
            } catch (storageErr: any) {
              addLog(` ├─ 写入 IndexedDB 失败: ${storageErr?.message || storageErr}。退回 Base64 直写。`);
              imagesList.push(base64ToSave);
            }
          } else {
            addLog(` ├─ 直接使用图片原生 URL: ${m.url}`);
            imagesList.push(m.url);
          }
        }

        mediaUrl = imagesList[0];
        addLog(`图片遍历完成。图片列表: ${JSON.stringify(imagesList.map(item => item.startsWith('data:') ? 'base64_data' : item))}`);
      }

      const newEntry: DiaryEntry = {
        id: diaryId,
        catId: activeCatId,
        content: newContent,
        media: mediaUrl,
        mediaType: mediaType,
        images: imagesList,
        createdAt: Date.now(),
        likes: 0,
        isLiked: false,
        comments: [],
      };

      addLog("日记对象模型构建完毕。");

      // 1. 写入持久化存储
      addLog("写入持久化存储 (storage.saveDiaries)...");
      const allDiaries = storage.getDiaries();
      const updatedAllDiaries = [newEntry, ...allDiaries];
      const success = storage.saveDiaries(updatedAllDiaries);
      
      addLog(`持久化存储写入结果: ${success}`);
      if (!success) {
        addLog("持久化存储写入失败，怀疑 LocalStorage 已满。");
        showAlert("存储失败", "存储空间不足，日记保存失败。请尝试删除一些旧记录或减小图片/视频大小。", true, consoleLogs);
        return; // finally will handle setIsLoading(false)
      }
      
      // 2. 更新本地状态刷新列表 (仅展示当前猫咪的)
      addLog("更新本地 React 状态 (setDiaries)...");
      setDiaries(prev => [newEntry, ...prev]);
      
      // 3. 显示成功提示
      setShowPostToast(true);
      setTimeout(() => setShowPostToast(false), 2000);

      // 4. 成功后关闭并重置
      addLog("关闭并重设弹窗状态...");
      closePostingModal();
      addLog("日记完美发布成功！");

    } catch (error) {
      console.error("发布日记失败:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      const errStack = error instanceof Error ? error.stack : "无堆栈";
      addLog(`[Error] 遇到未捕获异常: ${errMsg}`);
      showAlert("发布失败", errMsg, true, consoleLogs);
    } finally {
      // 无论成功还是失败，确保加载状态被重置
      setIsLoading(false);
    }
  };

  const handleLike = (id: string) => {
    if (activeTab === 'mine') {
      // 1. 获取所有日记并更新对应项
      const allDiaries = storage.getDiaries();
      const updatedAll = allDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      });
      // 2. 保存全量数据
      storage.saveDiaries(updatedAll);
      // 3. 同步更新本地过滤后的状态
      setDiaries(prev => prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      }));
    } else {
      const updated = friendDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            isLiked: !d.isLiked,
            likes: d.isLiked ? d.likes - 1 : d.likes + 1
          };
        }
        return d;
      });
      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }
  };

  const handleComment = (id: string) => {
    if (!commentText.trim() || commentText.length > MAX_COMMENT_LENGTH) return;
    
    if (activeTab === 'mine') {
      const allDiaries = storage.getDiaries();
      const newComment = { id: Date.now().toString(), content: commentText };
      
      const updatedAll = allDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            comments: [...d.comments, newComment]
          };
        }
        return d;
      });
      storage.saveDiaries(updatedAll);
      
      setDiaries(prev => prev.map(d => {
        if (d.id === id) {
          return {
            ...d,
            comments: [...d.comments, newComment]
          };
        }
        return d;
      }));
    } else {
      const updated = friendDiaries.map(d => {
        if (d.id === id) {
          return {
            ...d,
            comments: [...d.comments, { id: Date.now().toString(), content: commentText }]
          };
        }
        return d;
      });
      storage.saveFriendDiaries(updated);
      setFriendDiaries(updated);
    }
    
    setCommentText("");
    setCommentingId(null);
  };

  const handleShare = (entry: DiaryEntry) => {
    setSharingEntry(entry);
  };

  const handleDelete = (id: string) => {
    // 1. 从全量存储中删除
    storage.deleteDiary(id);
    // 2. 从本地过滤列表中移除
    setDiaries(prev => prev.filter(d => d.id !== id));
    setDeletingId(null);
  };

  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const processUploadedFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // If there is any video in the chosen list, we only accept that first video
    const firstVideo = fileArray.find(file => file.type.startsWith('video'));
    if (firstVideo) {
      const sizeLimit = 20 * 1024 * 1024;
      if (firstVideo.size > sizeLimit) {
        showAlert("文件过大", "视频文件太大啦，请选择 20MB 以内的文件哦");
        return;
      }
      setSelectedMediaList(prev => {
        prev.forEach(m => {
          if (m.url && m.url.startsWith('blob:')) {
            URL.revokeObjectURL(m.url);
          }
        });
        return [{ url: URL.createObjectURL(firstVideo), type: 'video', file: firstVideo }];
      });
      return;
    }

    // Process of images selection
    setIsReadingFile(true);
    try {
      let currentImages = selectedMediaList.filter(item => item.type === 'image');
      const hasVideo = selectedMediaList.some(item => item.type === 'video');
      
      if (hasVideo) {
        selectedMediaList.forEach(m => {
          if (m.url && m.url.startsWith('blob:')) {
            URL.revokeObjectURL(m.url);
          }
        });
        currentImages = [];
      }

      const maxAllowed = 9 - currentImages.length;
      if (maxAllowed <= 0) {
        showAlert("提示", "最多只能上传 9 张图片哦");
        return;
      }

      const sizeLimit = 15 * 1024 * 1024; // Compress up to 15MB immediately
      const addedImages: { url: string; type: 'image' | 'video'; file?: File }[] = [];

      for (const file of fileArray) {
        const isImg = file.type.startsWith('image/') || 
                      /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(file.name);
        if (!isImg) continue;

        if (addedImages.length + currentImages.length >= 9) {
          showAlert("提示", "最多只能选择 9 张图片哦，超出部分已忽略");
          break;
        }

        if (file.size > sizeLimit) {
          showAlert("文件过大", `图片 ${file.name} 太大啦，请选择 15MB 以内的图片哦`);
          continue;
        }

        try {
          console.log(`[Selection] Compressing ${file.name} immediately during selection...`);
          const base64 = await compressImage(file);
          if (base64) {
            addedImages.push({
              url: base64,
              type: 'image',
              // We do not set the file field so we signal to handlePost that it is pre-compressed
              file: undefined
            });
          } else {
            addedImages.push({
              url: URL.createObjectURL(file),
              type: 'image',
              file
            });
          }
        } catch (err) {
          console.error("[Selection] Instant compression failed, fallback to ObjectURL", err);
          addedImages.push({
            url: URL.createObjectURL(file),
            type: 'image',
            file
          });
        }
      }

      if (addedImages.length > 0) {
        setSelectedMediaList([...currentImages, ...addedImages]);
      }
    } catch (err) {
      console.error("[Selection] Error processing uploaded files:", err);
      showAlert("提示", "处理选择的图片时遇到格式错误，请尝试其他格式的文件。");
    } finally {
      setIsReadingFile(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processUploadedFiles(files);
    e.target.value = '';
  };

  const handleWechatInvite = async () => {
    if (!selectedCatForQR) return;

    const invite = await friendService.createInvite({
      id: selectedCatForQR.id,
      name: selectedCatForQR.name,
      avatar: selectedCatForQR.avatar,
    });
    const inviteUrl = friendService.buildInvitePayload(invite.code);
    const options = {
      title: `快来 Miao 看看我的小猫 ${selectedCatForQR.name} 吧！`,
      text: "我正在 Miao 养猫，邀请你成为我的好友，一起记录萌宠瞬间～",
      url: inviteUrl,
    };

    const result = await shareService.share(options);
    
    if (result.method === 'wechat') {
      setShowWeChatGuide(true);
    } else if (result.method === 'copy') {
      setShareMessage(result.success ? "链接已复制，请手动去微信发给好友吧～" : "复制失败，请手动复制链接");
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    }
  };

  const handleShareAction = async () => {
    if (!sharingEntry) return;

    const options = {
      title: "Miao - 日常记录",
      text: sharingEntry.content.substring(0, 30) + (sharingEntry.content.length > 30 ? "..." : ""),
      url: window.location.href,
    };

    const result = await shareService.share(options);

    if (result.method === 'wechat') {
      setSharingEntry(null);
      setShowWeChatGuide(true);
    } else if (result.method === 'copy') {
      setSharingEntry(null);
      setShareMessage(result.success ? "链接已复制，快去发给好友吧～" : "复制失败，请手动复制链接");
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
    } else if (result.method === 'native') {
      setSharingEntry(null);
      if (!result.success) {
        // 用户取消或失败，不显示提示
      }
    }
  };

  const handlePrivateShare = () => {
    setShowPrivateShare(true);
  };

  const onSendPrivateMessage = (userIds: string[], msg: string) => {
    console.log('Sending message to:', userIds, 'message:', msg);
    // 这里未来可以调用 API 发送私信
    setSharingEntry(null);
    setShareMessage("已成功私信给好友！");
    setShowShareToast(true);
    setTimeout(() => setShowShareToast(false), 3000);
  };

  const { recentGroups, olderGroups } = processDiaries(diaries);

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <PageHeader 
        title="日常记录" 
        subtitle="Daily Moments" 
        action={
          <div className="flex gap-2">
            <button 
              onClick={() => setShowAddFriendMenu(true)}
              className="w-12 h-12 bg-white text-on-surface-variant rounded-2xl flex items-center justify-center shadow-sm active:scale-90 transition-all border border-outline-variant/30"
            >
              <UserPlus size={24} />
            </button>
            <button 
              onClick={() => setIsPosting(true)}
              className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 active:scale-90 transition-all"
            >
              <Plus size={28} />
            </button>
          </div>
        }
      />

      <div className="shrink-0 overflow-visible">
        <div className="px-6 mb-8">
          <div className="bg-[#FF9D76]/10 p-1.5 rounded-full flex relative overflow-hidden">
            <LayoutGroup id="diary-tabs">
              <button 
                onClick={() => setActiveTab('mine')}
                className={`flex-1 py-3 rounded-full text-sm font-black transition-all relative z-10 ${activeTab === 'mine' ? 'text-white' : 'text-[#5D4037]/60 hover:bg-black/5'}`}
              >
                我的记录
                {activeTab === 'mine' && (
                  <motion.div 
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
              <button 
                onClick={() => setActiveTab('friends')}
                className={`flex-1 py-3 rounded-full text-sm font-black transition-all relative z-10 ${activeTab === 'friends' ? 'text-white' : 'text-[#5D4037]/60 hover:bg-black/5'}`}
              >
                好友动态
                {activeTab === 'friends' && (
                  <motion.div 
                    layoutId="tab-bg"
                    className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </button>
            </LayoutGroup>
          </div>
        </div>

        <div className="px-1 flex flex-col pb-24 relative">
          {/* 全局极细时间轴背景线 (仅在'mine'标签且有数据时绘制) */}
          {activeTab === 'mine' && diaries.length > 0 && (
            <div className="absolute left-[16px] top-4 bottom-12 w-[1px] bg-[#5D4037]/10 pointer-events-none z-0" />
          )}

          {activeTab === 'mine' ? (
            diaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
                  <ImageIcon size={40} />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-2">还没有记录</h3>
                <p className="text-sm text-on-surface-variant max-w-[200px]">
                  还没有关于 {activeCat?.name || '猫咪'} 的记录，快去分享你们的第一个温暖瞬间吧～
                </p>
              </div>
            ) : (
              <div className="w-full relative z-10">
                {/* 1. 近期记录分组 */}
                {recentGroups.map((group) => (
                  <div key={group.dateLabel} className="w-full">
                    {/* 日期断点标题 */}
                    <div className="flex items-center w-full py-3">
                      <div className="w-[32px] flex justify-center shrink-0">
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF9D76] bg-[#FFF9F5] flex items-center justify-center shadow-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#FF9D76]"></div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pl-2">
                        <span className={`text-sm font-bold ${group.dateLabel === '今天' ? 'text-[#FF9D76] text-base font-extrabold' : 'text-[#5D4037]/80'}`}>
                          {group.dateLabel}
                        </span>
                      </div>
                    </div>
                    
                    {/* 该日期的日记列表 */}
                    <div className="w-full">
                      {group.items.map((entry) => (
                        <DiaryCard
                          key={entry.id}
                          entry={entry}
                          userAvatar={user?.avatar}
                          userNickname={user?.nickname}
                          onLike={handleLike}
                          onComment={setCommentingId}
                          onShare={handleShare}
                          onDelete={(id) => setDeletingId(id)}
                          onDeleteComment={(dId, cId) => {
                            const allDiaries = storage.getDiaries();
                            const updatedAll = allDiaries.map(d => {
                              if (d.id === dId) {
                                  return {
                                    ...d,
                                    comments: d.comments.filter(c => c.id !== cId)
                                  };
                              }
                              return d;
                            });
                            storage.saveDiaries(updatedAll);
                            setDiaries(prev => prev.map(d => {
                              if (d.id === dId) {
                                return {
                                  ...d,
                                  comments: d.comments.filter(c => c.id !== cId)
                                };
                              }
                              return d;
                            }));
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}

                {/* 2. 超过一个月的日记折叠组 */}
                {olderGroups.map((group) => {
                  const isExpanded = !!expandedMonths[group.monthLabel];
                  return (
                    <div key={group.monthLabel} className="w-full">
                      {/* 可点击的折叠节点 */}
                      <button 
                        onClick={() => toggleMonth(group.monthLabel)}
                        className="w-full flex items-center py-4 relative z-10 hover:bg-[#5D4037]/5 transition-all text-left focus:outline-none rounded-xl"
                      >
                        <div className="w-[32px] flex justify-center shrink-0">
                          <div className="w-3.5 h-3.5 rounded-full border-2 border-[#FF9D76]/50 bg-[#FFF9F5] flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FF9D76]/60"></div>
                          </div>
                        </div>
                        <div className="flex-1 flex items-center justify-between pr-4 pl-2">
                          <span className="text-sm font-bold text-[#5D4037]">
                            {group.monthLabel} (共 {group.items.length} 篇)
                          </span>
                          <span className="text-xs text-[#5D4037]/60 font-semibold">
                            {isExpanded ? "▲ 收起" : "▼ 展开"}
                          </span>
                        </div>
                      </button>

                      {/* 展开的具体内容列表 */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="overflow-hidden"
                          >
                            {group.items.map((entry) => (
                              <DiaryCard
                                key={entry.id}
                                entry={entry}
                                userAvatar={user?.avatar}
                                userNickname={user?.nickname}
                                onLike={handleLike}
                                onComment={setCommentingId}
                                onShare={handleShare}
                                onDelete={(id) => setDeletingId(id)}
                                onDeleteComment={(dId, cId) => {
                                  const allDiaries = storage.getDiaries();
                                  const updatedAll = allDiaries.map(d => {
                                    if (d.id === dId) {
                                      return {
                                        ...d,
                                        comments: d.comments.filter(c => c.id !== cId)
                                      };
                                    }
                                    return d;
                                  });
                                  storage.saveDiaries(updatedAll);
                                  setDiaries(prev => prev.map(d => {
                                    if (d.id === dId) {
                                      return {
                                        ...d,
                                        comments: d.comments.filter(c => c.id !== cId)
                                      };
                                    }
                                    return d;
                                  }));
                                }}
                              />
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            friendDiaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 text-center">
                <div className="w-24 h-24 bg-surface-container rounded-[40px] flex items-center justify-center mb-6 text-on-surface-variant/20">
                  <UserPlus size={40} />
                </div>
                <h3 className="text-xl font-black text-on-surface mb-2">还没有好友动态</h3>
                <p className="text-sm text-on-surface-variant max-w-[200px]">快去添加好友，看看 TA 们的猫咪在做什么吧</p>
              </div>
            ) : (
              friendDiaries.map((entry) => (
                <DiaryCard
                  key={entry.id}
                  entry={entry}
                  isFriend
                  onLike={handleLike}
                  onComment={setCommentingId}
                  onShare={handleShare}
                />
              ))
            )
          )}
        </div>
      </div>

      {createPortal(
        <>
          {/* 发布弹窗 */}
          <AnimatePresence>
            {isPosting && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="backdrop-overlay !z-[450] flex items-end sm:items-center justify-center p-[100px]"
                onClick={closePostingModal}
              >
                <motion.div 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                  className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[40px] shadow-2xl flex flex-col h-[75vh] sm:h-[70vh] max-h-[85vh] sm:max-h-[80vh] overflow-hidden"
                  onClick={e => e.stopPropagation()}
                >
                  {/* 头部标题区域 */}
                  <div className="p-6 pb-4 flex items-center justify-between border-b border-outline-variant/30 shrink-0">
                    <div>
                      <h3 className="text-xl font-black text-on-surface">记录此刻</h3>
                      <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-0.5">Share a warm moment</p>
                    </div>
                    <button 
                      onClick={closePostingModal}
                      className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center text-on-surface-variant active:scale-90 transition-all cursor-pointer"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* 中间编辑区域 */}
                  <div 
                    className="flex-1 overflow-y-auto p-6 no-scrollbar border-2 border-transparent hover:border-dashed hover:border-[#FF9D76]/30 rounded-2xl transition-all duration-200"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer.files;
                      if (files && files.length > 0) {
                        processUploadedFiles(files);
                      }
                    }}
                  >
                    <textarea
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder={activeCat ? `分享关于 ${activeCat.name} 的第一个温暖瞬间吧～` : "写下你和猫咪的温暖日常吧..."}
                      className="w-full min-h-[120px] bg-transparent text-on-surface placeholder-on-surface-variant/40 resize-none outline-none text-base border-0 focus:ring-0 p-0 leading-relaxed font-semibold"
                      disabled={isLoading}
                    />

                    {/* 未选择媒体时，显示舒适直观的“点击或拖拽上传”提示框（极度方便批量选择） */}
                    {selectedMediaList.length === 0 && (
                      <div 
                        onClick={() => imageInputRef.current?.click()}
                        className="mt-4 mb-6 border-2 border-dashed border-[#5D4037]/15 hover:border-[#FF9D76]/40 bg-[#5D4037]/2 hover:bg-[#FF9D76]/5 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 group active:scale-[0.99]"
                      >
                        <div className="w-12 h-12 rounded-full bg-[#5D4037]/5 group-hover:bg-[#FF9D76]/10 flex items-center justify-center text-[#5D4037]/50 group-hover:text-[#FF9D76] transition-colors duration-200">
                          <ImageIcon size={24} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold text-[#5D4037]/75 group-hover:text-[#FF9D76] transition-colors duration-200">点击上传 / 拖拽多张图片到这里</p>
                          <p className="text-[11px] font-bold text-[#5D4037]/40 mt-1">支持批量选择（微信/相册中可按住/多选，最高 9 张）</p>
                        </div>
                      </div>
                    )}

                    {/* 多图/视频预览区域 */}
                    {selectedMediaList.length > 0 && (
                      <div className="mb-6">
                        {selectedMediaList[0].type === 'video' ? (
                          <div className="relative w-32 h-32 rounded-3xl overflow-hidden shadow-lg bg-black group">
                            <video 
                              src={selectedMediaList[0].url} 
                              className="w-full h-full object-cover" 
                              muted 
                              playsInline 
                              autoPlay 
                              loop 
                            />
                            <button 
                              onClick={() => setSelectedMediaList([])}
                              className="absolute top-2 right-2 w-7 h-7 bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform z-10"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-3">
                            {selectedMediaList.map((media, idx) => (
                              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden shadow-md bg-stone-100 group">
                                <img src={media.url} className="w-full h-full object-cover" alt="" />
                                <button 
                                  onClick={() => {
                                    const updatedList = [...selectedMediaList];
                                    if (media.url.startsWith('blob:')) {
                                      URL.revokeObjectURL(media.url);
                                    }
                                    updatedList.splice(idx, 1);
                                    setSelectedMediaList(updatedList);
                                  }}
                                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center backdrop-blur-xs active:scale-95 transition-transform z-10"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            {selectedMediaList.length < 9 && (
                              <button
                                onClick={() => {
                                  imageInputRef.current?.click();
                                }}
                                className="aspect-square border-2 border-dashed border-[#5D4037]/20 hover:border-[#FF9D76]/50 rounded-2xl flex flex-col items-center justify-center gap-1.5 text-[#5D4037]/45 hover:text-[#FF9D76] bg-[#5D4037]/2 transition-colors duration-200 cursor-pointer"
                              >
                                <ImageIcon size={22} />
                                <span className="text-[10px] font-bold">添加图片</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    {isReadingFile && (
                      <div className="w-32 h-32 rounded-3xl bg-surface-container flex flex-col items-center justify-center mb-2 animate-pulse">
                        <Loader2 className="w-6 h-6 animate-spin text-primary mb-2" />
                        <span className="text-[10px] font-bold text-on-surface-variant">读取中...</span>
                      </div>
                    )}
                  </div>

                  {/* 弹窗底部操作栏 (固定) */}
                  <div className="flex items-center justify-between p-6 pt-4 border-t border-outline-variant/30 shrink-0 bg-background">
                    <div className="flex gap-3">
                      <button 
                        onClick={() => {
                          imageInputRef.current?.click();
                        }}
                        className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                        title="上传图片"
                        disabled={selectedMediaList.some(m => m.type === 'video') || selectedMediaList.length >= 9}
                      >
                        <ImageIcon size={24} />
                      </button>
                      <button 
                        onClick={() => {
                          videoInputRef.current?.click();
                        }}
                        className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant hover:text-primary transition-all active:scale-90"
                        title="上传视频"
                        disabled={selectedMediaList.length > 0}
                      >
                        <Video size={24} />
                      </button>
                      <button 
                        onClick={handleAutoWriteDiary}
                        className="w-12 h-12 bg-surface-container rounded-2xl flex items-center justify-center transition-all active:scale-90"
                        style={{ color: '#FF9D76' }}
                        title="喵咪智写"
                        type="button"
                      >
                        <Sparkles size={24} className="animate-pulse" />
                      </button>
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        hidden 
                        multiple={true} 
                        accept="image/*,image/png,image/jpeg,image/gif,image/webp" 
                        onChange={handleFileChange} 
                      />
                      <input 
                        type="file" 
                        ref={videoInputRef} 
                        hidden 
                        accept="video/*" 
                        onChange={handleFileChange} 
                      />
                    </div>
                    {/* [FIX] 发布按钮位置：确保在右下角，并使用品牌色 */}
                    <button 
                      onClick={handlePost}
                      disabled={(!newContent.trim() && selectedMediaList.length === 0) || isLoading}
                      className="px-8 h-12 rounded-full font-bold flex items-center gap-2 transition-all disabled:opacity-30 disabled:scale-100 active:scale-95 cursor-pointer"
                      style={{ backgroundColor: '#FF9D76', color: 'white' }}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>发布中...</span>
                        </>
                      ) : (
                        "发布"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

      {/* 添加好友菜单 */}
      <AnimatePresence>
        {showAddFriendMenu && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="backdrop-overlay !z-[110] !bg-black/60 flex items-end sm:items-center justify-center p-[100px]"
            onClick={() => {
              setShowAddFriendMenu(false);
              setAddFriendStep(1);
            }}
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-background w-full max-w-lg rounded-t-[32px] sm:rounded-[40px] shadow-2xl p-8 pb-12"
              onClick={e => e.stopPropagation()}
            >
              {addFriendStep === 1 ? (
                <>
                  <div className="text-center mb-8">
                    <h3 className="text-xl font-black text-on-surface">选择代表猫咪</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Select your cat representative</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-8 max-h-[300px] overflow-y-auto p-2">
                    {catList.map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => {
                          setSelectedCatForQR(cat);
                          setAddFriendStep(2);
                        }}
                        className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${selectedCatForQR?.id === cat.id ? 'bg-primary/10 ring-2 ring-primary' : 'bg-surface-container'}`}
                      >
                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm">
                          <img src={cat.avatar} alt={cat.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                        <span className="text-xs font-bold text-on-surface truncate w-full text-center">{cat.name}</span>
                      </button>
                    ))}
                    {catList.length === 0 && (
                      <div className="col-span-3 py-8 text-center text-on-surface-variant/40 text-sm font-bold">
                        还没有生成的猫咪哦
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center mb-10">
                    <h3 className="text-xl font-black text-on-surface">选择添加方式</h3>
                    <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-1">Choose addition method</p>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <button 
                      onClick={() => {
                        setShowAddFriendMenu(false);
                        setTimeout(() => {
                            setAddFriendStep(1);
                            navigate("/add-friend-qr", { state: { cat: selectedCatForQR } });
                        }, 300);
                      }}
                      className="flex flex-col items-center gap-3 group"
                    >
                      <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center text-white shadow-lg shadow-primary/20 active:scale-90 transition-all">
                        <QrCode size={32} />
                      </div>
                      <span className="text-sm font-bold text-on-surface">面对面添加</span>
                    </button>
                  </div>

                  <button 
                    onClick={() => setAddFriendStep(1)}
                    className="w-full mt-12 py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
                  >
                    返回上一步
                  </button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 分享面板 (重构为独立组件) */}
      <ShareSheet 
        isOpen={!!sharingEntry}
        onClose={() => setSharingEntry(null)}
        diaryData={sharingEntry ? {
            id: sharingEntry.id,
            title: sharingEntry.content,
            imageUrl: sharingEntry.media || 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2643&auto=format&fit=crop',
            authorName: user?.nickname || '猫咪主人',
            authorAvatar: user?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix'
        } : null}
        onPrivateShare={handlePrivateShare}
        onToast={(msg) => {
            setShareMessage(msg);
            setShowShareToast(true);
            setTimeout(() => setShowShareToast(false), 3000);
        }}
      />

      {/* 站内私信分享二级页面 */}
      <PrivateMessageShare 
        isOpen={showPrivateShare}
        onClose={() => setShowPrivateShare(false)}
        diaryData={sharingEntry ? {
          id: sharingEntry.id,
          title: sharingEntry.content.substring(0, 20) + (sharingEntry.content.length > 20 ? '...' : ''),
          imageUrl: (sharingEntry.mediaType === 'image' && sharingEntry.media) ? sharingEntry.media : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?q=80&w=2643&auto=format&fit=crop'
        } : { id: '', title: '', imageUrl: '' }}
        onSend={onSendPrivateMessage}
      />

      {/* 评论输入组件 */}
      <CommentInput
        isOpen={!!commentingId}
        value={commentText}
        onChange={setCommentText}
        onSend={() => handleComment(commentingId!)}
        onClose={() => setCommentingId(null)}
        maxLength={MAX_COMMENT_LENGTH}
      />

      {/* 微信分享引导 */}
          <AnimatePresence>
            {showWeChatGuide && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="backdrop-overlay !z-[500] !bg-black/90 flex flex-col items-end p-8"
                onClick={() => setShowWeChatGuide(false)}
              >
                <div className="flex flex-col items-end text-white mt-[10vh]">
                  <motion.div
                    animate={{ y: [0, -15, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="mb-6 mr-4"
                  >
                    <ArrowUpRight size={80} className="text-primary filter drop-shadow(0 0 20px rgba(232, 159, 113, 0.4))" />
                  </motion.div>
                  <div className="text-right space-y-2">
                    <h3 className="text-3xl font-black">点击右上角分享</h3>
                    <p className="text-xl opacity-80">点击右上角的三个点 <span className="inline-block px-2 py-0.5 bg-white/20 rounded-md font-bold">···</span></p>
                    <p className="text-xl opacity-80">选择分享给好友或朋友圈</p>
                  </div>
                </div>
                
                <div className="mt-auto w-full text-center pb-8">
                  <button 
                    onClick={() => setShowWeChatGuide(false)}
                    className="px-16 py-5 bg-primary text-white rounded-full font-black shadow-2xl active:scale-95 transition-all text-xl"
                  >
                    我知道了
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 删除确认弹窗 */}
      <AnimatePresence>
        {deletingId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setDeletingId(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-xs rounded-[40px] p-8 shadow-2xl text-center"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-16 h-16 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-6 text-red-500">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-on-surface mb-3">确定删除吗？</h3>
              <p className="text-sm text-on-surface-variant leading-relaxed mb-8">
                确定要删除这条记录吗？删除后将无法找回。
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deletingId)}
                  className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                >
                  确定删除
                </button>
                <button 
                  onClick={() => setDeletingId(null)}
                  className="w-full py-4 bg-surface-container text-on-surface-variant rounded-2xl font-black active:scale-95 transition-all"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 删除成功提示 */}
      <AnimatePresence>
        {showDeleteToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm font-black">记录已删除</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 发布成功提示 */}
      <AnimatePresence>
        {showPostToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle size={18} className="text-primary" />
            <span className="text-sm font-black">发布成功啦～</span>
          </motion.div>
        )}
      </AnimatePresence>
      {/* 分享提示 Toast */}
      <AnimatePresence>
        {showShareToast && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[130] bg-on-surface text-surface px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 max-w-[80vw]"
          >
            <Share2 size={20} className="text-primary flex-shrink-0" />
            <span className="text-sm font-black whitespace-pre-wrap leading-relaxed">{shareMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 自定义提示与排查弹窗 */}
      <AnimatePresence>
        {customAlert && customAlert.show && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[600] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={() => setCustomAlert(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background w-full max-w-sm rounded-[40px] p-8 shadow-2xl relative border border-outline-variant/50 max-h-[90vh] overflow-y-auto no-scrollbar"
              onClick={e => e.stopPropagation()}
            >
              {/* 关闭按钮 */}
              <button 
                onClick={() => setCustomAlert(null)}
                className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className={`w-14 h-14 ${customAlert.isError ? 'bg-red-50 text-red-500' : 'bg-primary/10 text-primary'} rounded-[20px] flex items-center justify-center mx-auto mb-5`}>
                <Sparkles size={28} />
              </div>

              <h3 className="text-lg font-black text-on-surface mb-3 text-center">{customAlert.title}</h3>
              
              <div className="text-sm text-[#5D4037]/80 leading-relaxed mb-6 text-center whitespace-pre-line max-h-[140px] overflow-y-auto no-scrollbar">
                {customAlert.message}
              </div>

              {/* 如果有排查工具包日志 */}
              {customAlert.logs && customAlert.logs.length > 0 && (
                <div className="mb-6 z-[610]">
                  <div className="text-[10px] font-black text-on-surface-variant uppercase tracking-wider mb-2 text-left">开发诊断日志 (Scroll & Tap to Select):</div>
                  <div className="bg-surface-container border border-outline-variant rounded-2xl p-4 text-left max-h-[120px] overflow-y-auto font-mono text-[9px] text-[#5D4037]/90 leading-relaxed whitespace-pre-wrap select-text selection:bg-primary/20">
                    {customAlert.logs.join('\n')}
                  </div>
                </div>
              )}

              <button
                onClick={() => setCustomAlert(null)}
                className="w-full py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm cursor-pointer"
              >
                我知道了
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </>,
        document.body
      )}
    </div>
  );
}
