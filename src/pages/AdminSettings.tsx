import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Bug, Cpu, FastForward, Image as ImageIcon, Loader2, Plus, Save, 
  Star, Trash2, Upload, RotateCcw, Users, MessageSquare, BarChart3, 
  Settings, Coins, Lock, ShieldCheck, Search, ArrowRight, Trash, CheckCircle2
} from "lucide-react";
import { LayoutGroup, motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";
import { aiConfig, DEFAULT_AI_PROFILES } from "../services/ai/aiConfig";
import { AIProfile, AIProvider } from "../services/ai/types";
import { adminService, AdminStats, AdminUser, isAdminUnlockCode } from "../services/adminService";
import { PresetCat, storage } from "../services/storage";
import { useTimedMessage } from "../hooks/useTimedMessage";

export default function AdminSettings() {
  const navigate = useNavigate();
  
  // Security Authentication Gate
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem("miao_admin_authorized") === "true";
  });
  const [pinInput, setPinInput] = useState("");
  const [authError, setAuthError] = useState("");

  // Tabs management
  const [activeTab, setActiveTab] = useState<"stats" | "ai" | "presets" | "users" | "feedback">("stats");

  // Data states from backend
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Preset Cats state (local fallback sync)
  const [presets, setPresets] = useState<PresetCat[]>([]);
  const [newName, setNewName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // AI profile state
  const [profile, setProfile] = useState<AIProfile>(DEFAULT_AI_PROFILES.dashscope);
  const { message: showToast, show: triggerToast } = useTimedMessage(2500);

  // Debug settings
  const [isPointsCheat, setIsPointsCheat] = useState(() => storage.getIsPointsCheat());
  const [isFastForward, setIsFastForward] = useState(() => storage.getIsFastForward());

  // Points adjustment modal
  const [editingUserPoints, setEditingUserPoints] = useState<AdminUser | null>(null);
  const [pointsAdjustAmount, setPointsAdjustAmount] = useState<number>(50);
  const [pointsAdjustType, setPointsAdjustType] = useState<"earn" | "spend">("earn");
  const [pointsAdjustReason, setPointsAdjustReason] = useState("管理员后台调整积分");
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);

  const fieldLabelClass = "text-[10px] font-black text-on-surface-variant/55 uppercase tracking-[0.16em] ml-1";
  const modelInputClass = "w-full min-w-0 h-12 px-4 bg-white rounded-[18px] text-[13px] sm:text-sm leading-none font-semibold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20 font-mono tracking-normal shadow-sm";
  const compactInputClass = "w-full min-w-0 h-12 px-3 bg-white rounded-[18px] text-[13px] sm:text-sm font-semibold text-[#5D4037] outline-none focus:ring-2 focus:ring-[#FF9D76]/20 shadow-sm font-mono tabular-nums tracking-normal";
  const switchClass = "flex min-h-13 items-center justify-between gap-2 bg-white rounded-[18px] px-3 py-2 text-[12px] leading-tight font-extrabold text-[#5D4037]/70 shadow-sm";

  // Check custom credentials automatically
  useEffect(() => {
    setPresets(storage.getPresetCats());
    setProfile(aiConfig.getProfile());
  }, []);

  // Fetch metrics when unlocked
  useEffect(() => {
    if (isAdminUnlocked) {
      fetchAdminStats();
    }
  }, [isAdminUnlocked]);

  const handleUnlock = () => {
    if (isAdminUnlockCode(pinInput)) {
      setIsAdminUnlocked(true);
      sessionStorage.setItem("miao_admin_authorized", "true");
      setAuthError("");
    } else {
      setAuthError("管理员密令不匹配，请重试！");
    }
  };

  const fetchAdminStats = async () => {
    setIsLoadingStats(true);
    try {
      setStats(await adminService.fetchStats());
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleProviderChange = (provider: AIProvider) => {
    const defaults = DEFAULT_AI_PROFILES[provider];
    setProfile(prev => ({
      ...defaults,
      mockMode: prev.mockMode,
      resolution: prev.resolution || defaults.resolution,
      duration: prev.duration || defaults.duration,
      seed: prev.seed || defaults.seed,
      promptExtend: prev.promptExtend,
    }));
  };

  const handleSaveAIConfig = () => {
    aiConfig.saveProfile(profile);
    triggerToast("AI 核心模型配置已保存！");
  };

  const handleResetAIConfig = () => {
    aiConfig.reset();
    setProfile(aiConfig.getProfile());
    triggerToast("已恢复默认配置");
  };

  const handleAddPresetCompanion = () => {
    if (!newName || !newImageUrl) {
      alert("请输入品种名称并上传/粘贴图片地址");
      return;
    }

    const updated = [
      ...presets,
      {
        id: `preset_${Date.now()}`,
        name: newName,
        imageUrl: newImageUrl
      }
    ];
    setPresets(updated);
    storage.savePresetCats(updated);
    setNewName("");
    setNewImageUrl("");
    triggerToast("成功新增数字猫咪预设种群");
  };

  const handleDeletePresetCompanion = (id: string) => {
    const updated = presets.filter(p => p.id !== id);
    setPresets(updated);
    storage.savePresetCats(updated);
    triggerToast("已移除选中猫咪预设图谱");
  };

  // Submit manual point adjustments to standard server points file
  const handlePointsAdjustmentSave = async () => {
    if (!editingUserPoints) return;
    setIsAdjustingPoints(true);
    try {
      await adminService.adjustUserPoints(editingUserPoints.username, {
        amount: Number(pointsAdjustAmount),
        type: pointsAdjustType,
        reason: pointsAdjustReason
      });
      triggerToast(`成功为 ${editingUserPoints.nickname} ${pointsAdjustType === "earn" ? "赠送" : "扣除"} ${pointsAdjustAmount} 积分！`);
      setEditingUserPoints(null);
      fetchAdminStats(); // Refresh board
    } catch (err: any) {
      alert(`调整失败: ${err.message}`);
    } finally {
      setIsAdjustingPoints(false);
    }
  };

  // Delete malicious accounts cascade
  const handleUserDelete = async (username: string, nickname: string) => {
    if (!window.confirm(`警告：您确认要【永久注销并清除】用户 ${nickname} (${username}) 吗？\n该操作会立即清除其名下的所有猫咪、所有日记帖、社交圈子与积分账目，且不可逆转！`)) {
      return;
    }

    try {
      await adminService.deleteUser(username);
      triggerToast(`已成功清除违规用户 ${nickname}`);
      fetchAdminStats();
    } catch (err: any) {
      alert(`清除失败: ${err.message || "拒绝访问"}`);
    }
  };

  // Purge/Archive feedback logs
  const handleFeedbackDelete = async (id: string) => {
    try {
      await adminService.deleteFeedback(id);
      triggerToast("该意见反馈已成功归档和清除！");
      fetchAdminStats();
    } catch (err: any) {
      alert(`操作失败: ${err.message || "未知错误"}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const compressed = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const maxSide = 600;
          let w = img.width;
          let h = img.height;
          if (w > maxSide || h > maxSide) {
            const ratio = Math.min(maxSide / w, maxSide / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => resolve(base64);
        img.src = base64;
      });

      setNewImageUrl(compressed);
    } catch (err) {
      console.error("Upload process error:", err);
      alert("上传失败，请重试");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  // Pre-filtered users list
  const filteredUsers = stats?.users.filter(u => {
    const q = searchQuery.toLowerCase();
    return u.username.toLowerCase().includes(q) || u.nickname.toLowerCase().includes(q) || u.phone.includes(q);
  }) || [];

  // Gated Access Screen
  if (!isAdminUnlocked) {
    return (
      <div className="h-dvh bg-background flex flex-col justify-center items-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-md bg-white p-8 rounded-[36px] shadow-2xl border border-outline-variant/30 text-center"
        >
          <div className="w-16 h-16 bg-[#FF9D76]/10 rounded-3xl flex items-center justify-center text-[#FF9D76] mx-auto mb-5 shadow-sm">
            <Lock size={28} className="stroke-[2.5]" />
          </div>
          
          <h1 className="text-xl font-black text-on-surface tracking-normal">安全管控区</h1>
          <p className="text-xs text-on-surface-variant font-medium mt-2 leading-relaxed">
            系统管理工具已被隔离。请输入专属解锁密码，未获授权的访问将被记录。
          </p>

          <div className="mt-8 space-y-4">
            <div className="relative">
              <input
                type="password"
                placeholder="密令 passcode (如 888888)"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                className="w-full h-14 px-5 bg-surface-container rounded-[22px] border-none text-base font-black text-center tracking-widest text-[#5D4037] outline-none shadow-inner focus:ring-4 focus:ring-[#FF9D76]/10"
              />
            </div>

            {authError && (
              <p className="text-[11px] text-red-500 font-bold tracking-wide animate-pulse">
                ⚠️ {authError}
              </p>
            )}

            <button
              onClick={handleUnlock}
              className="w-full h-14 bg-[#FF9D76] text-white font-black text-base rounded-[22px] shadow-lg shadow-[#FF9D76]/25 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <ShieldCheck size={20} />
              验证安全令牌
            </button>
          </div>

          <p className="text-[10px] text-on-surface-variant/40 font-mono tracking-wider mt-6">
            MIAO COMPANION PORTAL SECURITY SHIELD
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-[#FDF9F6] flex flex-col overflow-hidden">
      <PageHeader
        title="云管后台"
        subtitle="MIAO SYSTEM COMMANDER"
        onBack={() => navigate("/")}
      />

      {/* Tabs list */}
      <div className="shrink-0 px-4 pt-1 pb-3 overflow-x-auto no-scrollbar flex gap-2 border-b border-outline-variant/30 bg-white/70 backdrop-blur-md">
        <button
          onClick={() => setActiveTab("stats")}
          className={`px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all ${
            activeTab === "stats" ? "bg-[#FF9D76] text-white shadow-md shadow-[#FF9D76]/25" : "bg-surface-container/60 text-[#5D4037]/65 hover:bg-surface-container"
          }`}
        >
          <BarChart3 size={15} />
          运营主页
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all ${
            activeTab === "users" ? "bg-[#FF9D76] text-white shadow-md shadow-[#FF9D76]/25" : "bg-surface-container/60 text-[#5D4037]/65 hover:bg-surface-container"
          }`}
        >
          <Users size={15} />
          用户治理
          {stats?.users && stats.users.length > 0 && (
            <span className="bg-black/10 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
              {stats.users.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ai")}
          className={`px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all ${
            activeTab === "ai" ? "bg-[#FF9D76] text-white shadow-md shadow-[#FF9D76]/25" : "bg-surface-container/60 text-[#5D4037]/65 hover:bg-surface-container"
          }`}
        >
          <Cpu size={15} />
          AI参数
        </button>
        <button
          onClick={() => setActiveTab("presets")}
          className={`px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all ${
            activeTab === "presets" ? "bg-[#FF9D76] text-white shadow-md shadow-[#FF9D76]/25" : "bg-surface-container/60 text-[#5D4037]/65 hover:bg-surface-container"
          }`}
        >
          <ImageIcon size={15} />
          品种预设
        </button>
        <button
          onClick={() => setActiveTab("feedback")}
          className={`px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all ${
            activeTab === "feedback" ? "bg-[#FF9D76] text-white shadow-md shadow-[#FF9D76]/25" : "bg-surface-container/60 text-[#5D4037]/65 hover:bg-surface-container"
          }`}
        >
          <MessageSquare size={15} />
          反馈工单指针
          {stats?.summary?.totalFeedbacks ? (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              {stats.summary.totalFeedbacks}
            </span>
          ) : null}
        </button>

        <button
          onClick={() => {
            setIsAdminUnlocked(false);
            setPinInput("");
            sessionStorage.removeItem("miao_admin_authorized");
            triggerToast("管理控制台已安全锁定并离线");
          }}
          className="px-4 py-2.5 rounded-full text-[12px] font-black shrink-0 flex items-center gap-1.5 transition-all bg-red-50 hover:bg-red-500 text-red-600 hover:text-white ml-auto"
        >
          <Lock size={14} />
          安全锁定退出
        </button>
      </div>

      <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-5 py-4 pb-24">
        
        {/* TAB 1: OPERATIONAL STATISTICS */}
        {activeTab === "stats" && (
          <div className="space-y-5">
            {isLoadingStats && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 className="animate-spin text-[#FF9D76]" size={36} />
                <p className="text-xs font-bold text-on-surface-variant font-mono">RETRIEVING MATRIX DATABASE...</p>
              </div>
            )}

            {!isLoadingStats && stats && (
              <div className="space-y-5">
                {/* Statistics bento grid layout */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-4 bg-white rounded-[28px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
                    <span className="text-[10px] font-black text-[#5D4037]/45 uppercase tracking-widest block font-sans">平台注册用户</span>
                    <div>
                      <span className="text-3xl font-black text-[#5D4037] block font-mono tracking-tight leading-none">{stats.summary.totalUsers}</span>
                      <span className="text-[10px] text-green-500 font-bold mt-1 inline-block">100% 真实活跃</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-[28px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
                    <span className="text-[10px] font-black text-[#5D4037]/45 uppercase tracking-widest block font-sans">解锁猫咪数字生命</span>
                    <div>
                      <span className="text-3xl font-black text-[#5D4037] block font-mono tracking-tight leading-none">{stats.summary.totalCats}</span>
                      <span className="text-[10px] text-orange-400 font-bold mt-1 inline-block">平均每人 {Number(stats.summary.totalCats / (stats.summary.totalUsers || 1)).toFixed(1)} 只</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-[28px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
                    <span className="text-[10px] font-black text-[#5D4037]/45 uppercase tracking-widest block font-sans">社区发表日记</span>
                    <div>
                      <span className="text-3xl font-black text-[#5D4037] block font-mono tracking-tight leading-none">{stats.summary.totalDiaries}</span>
                      <span className="text-[10px] text-pink-500 font-bold mt-1 inline-block">日记交互极速上升</span>
                    </div>
                  </div>

                  <div className="p-4 bg-white rounded-[28px] border border-outline-variant/30 shadow-sm flex flex-col justify-between h-28">
                    <span className="text-[10px] font-black text-[#5D4037]/45 uppercase tracking-widest block font-sans">总代币与积分池</span>
                    <div>
                      <span className="text-2xl font-black text-[#FF9D76] block font-mono tracking-tight leading-none truncate">{stats.summary.totalPoints} pts</span>
                      <span className="text-[10px] text-on-surface-variant/50 font-bold mt-1 inline-block block mt-1">云服务硬度保障</span>
                    </div>
                  </div>
                </div>

                {/* Growth and Activity Visualization */}
                <section className="bg-white p-5 rounded-[32px] border border-outline-variant/40 shadow-sm">
                  <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-100 flex items-center justify-center text-orange-500">
                        <BarChart3 size={16} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-[#5D4037]">平台近几日曲线趋势</h2>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider font-mono">ACTIVITIES VISUALIZATION</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-green-50 text-green-600 px-2 py-1 rounded-full font-black">系统正常运行</span>
                  </div>

                  {/* Simple beautiful inline vector bar design for chart representation */}
                  <div className="mt-6 space-y-4">
                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-[#5D4037]/75">
                        <span>日均注册增数 (每日注册/24h)</span>
                        <span className="font-mono">{stats.summary.totalUsers} 名用户</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, stats.summary.totalUsers * 8)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-[#5D4037]/75">
                        <span>猫咪绑定生成率 (总猫咪/40只预设)</span>
                        <span className="font-mono">{stats.summary.totalCats} 只数字生命</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-[#FF9D76] h-full rounded-full" style={{ width: `${Math.min(100, stats.summary.totalCats * 10)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-[11px] font-bold text-[#5D4037]/75">
                        <span>用户发布频度 (日记总发帖)</span>
                        <span className="font-mono">{stats.summary.totalDiaries} 论坛帖</span>
                      </div>
                      <div className="w-full h-3 bg-surface-container rounded-full mt-1.5 overflow-hidden">
                        <div className="bg-pink-400 h-full rounded-full" style={{ width: `${Math.min(100, stats.summary.totalDiaries * 12)}%` }} />
                      </div>
                    </div>
                  </div>
                </section>

                {/* Fast operational debug config logs */}
                <section className="bg-white p-5 rounded-[32px] border border-outline-variant/40 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-500 flex items-center justify-center">
                      <Bug size={16} />
                    </div>
                    <h3 className="text-sm font-black text-[#5D4037]">实时快速调节与环境检查</h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center justify-between gap-3 rounded-[20px] bg-[#FDF9F6] px-4 py-3 border border-outline-variant/40">
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-[#5D4037] tracking-normal mb-0.5">积分作弊(DEBUG)</span>
                        <span className="block text-[10px] font-bold text-[#5D4037]/45">免任务全无限增送</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isPointsCheat}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setIsPointsCheat(next);
                          storage.setIsPointsCheat(next);
                          triggerToast(next ? "作弊积分阀门已敞开" : "已恢复标准积分机制");
                        }}
                        className="w-5 h-5 accent-[#FF9D76]"
                      />
                    </label>

                    <label className="flex items-center justify-between gap-3 rounded-[20px] bg-[#FDF9F6] px-4 py-3 border border-outline-variant/40">
                      <span className="min-w-0">
                        <span className="block text-xs font-black text-[#5D4037] tracking-normal mb-0.5">时光机快进模式</span>
                        <span className="block text-[10px] font-bold text-[#5D4037]/45">跳过交互CD与时隔</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={isFastForward}
                        onChange={(e) => {
                          const next = e.target.checked;
                          setIsFastForward(next);
                          storage.setIsFastForward(next);
                          triggerToast(next ? "快进引擎点火成功" : "已归位标准时间流速");
                        }}
                        className="w-5 h-5 accent-[#FF9D76]"
                      />
                    </label>
                  </div>
                </section>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REGISTERED USERS DIRECTORY */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center bg-white rounded-3xl h-13 px-4 border border-outline-variant/40 shadow-sm">
              <Search size={18} className="text-on-surface-variant/40 shrink-0" />
              <input
                type="text"
                placeholder="键入用户名/昵称/电话检索账户..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 ml-2.5 bg-transparent border-none outline-none text-xs font-semibold text-[#5D4037] placeholder:text-on-surface-variant/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="text-xs text-orange-400 font-bold hover:underline px-2">清除</button>
              )}
            </div>

            {isLoadingStats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#FF9D76]" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="bg-white/60 text-center py-14 rounded-3xl border border-dashed border-[#5D4037]/20 text-on-surface-variant/50 text-xs font-bold">
                没有找到匹配以上条件的注册会员账号
              </div>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map(user => (
                  <div key={user.username} className="bg-white p-4 rounded-[28px] border border-outline-variant/40 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-surface-container overflow-hidden shrink-0 border border-outline-variant/50">
                        {user.avatar ? (
                          <img src={user.avatar} className="w-full h-full object-cover" alt="avatar" />
                        ) : (
                          <div className="w-full h-full bg-[#FF9D76]/10 text-[#FF9D76] flex items-center justify-center font-black text-xs font-mono">{user.username.slice(0, 2).toUpperCase()}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="font-black text-[13px] text-on-surface leading-none truncate">{user.nickname}</span>
                          <span className="text-[9px] bg-[#5E35B1]/10 text-[#5E35B1] font-mono px-1.5 py-0.5 rounded-full font-bold shrink-0">{user.username}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-2.5 gap-y-1 mt-2 text-[10px] text-on-surface-variant/60 font-bold font-mono">
                          {user.phone && <span>📞 {user.phone}</span>}
                          <span>🐱 猫咪：{user.catsCount}只</span>
                          <span>📝 日记帖：{user.diariesCount}条</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="block text-xs font-black text-[#5D4037]">{user.points} pts</span>
                        <button
                          onClick={() => {
                            setEditingUserPoints(user);
                            setPointsAdjustAmount(100);
                            setPointsAdjustType("earn");
                            setPointsAdjustReason("后台管理员赠送积分");
                          }}
                          className="mt-1.5 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-lg text-[9px] font-black transition-all flex items-center gap-0.5"
                        >
                          <Coins size={10} />
                          划转资金
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-dashed border-outline-variant/30 text-[10px] font-bold text-on-surface-variant/40">
                      <span>注册时间：{new Date(user.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => handleUserDelete(user.username, user.nickname)}
                        disabled={user.username === "admin"}
                        className={`text-[9px] px-2.5 py-1 font-semibold flex items-center gap-1 rounded-lg transition-all ${
                          user.username === "admin" 
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                            : "bg-red-50 hover:bg-red-500 text-red-500 hover:text-white"
                        }`}
                      >
                        <Trash size={11} />
                        销毁违规账号
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MODEL PARAMETRIC CONTROL */}
        {activeTab === "ai" && (
          <div className="space-y-4">
            <section className="bg-white p-5 rounded-[32px] border border-outline-variant/40 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 bg-white text-[#FF9D76] rounded-2xl flex items-center justify-center shadow-sm shrink-0">
                  <Cpu size={22} className="stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-[17px] font-black text-on-surface leading-none tracking-normal">AI 生成核心机理</h2>
                  <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mt-2 font-mono">GLOBAL ENGINE PROFILES</p>
                </div>
              </div>

              <div className="bg-[#FF9D76]/5 p-1.5 rounded-full grid grid-cols-2 relative overflow-hidden mb-5">
                <LayoutGroup id="admin-ai-providers">
                  {(["dashscope", "volcengine"] as AIProvider[]).map(provider => (
                    <button
                      key={provider}
                      onClick={() => handleProviderChange(provider)}
                      className={`py-3 rounded-full text-[13px] font-black transition-all relative z-10 ${
                        profile.provider === provider ? "text-white" : "text-[#5D4037]/60 hover:bg-black/5"
                      }`}
                    >
                      {provider === "dashscope" ? "阿里百炼 API" : "火山引擎 API"}
                      {profile.provider === provider && (
                        <motion.div
                          layoutId="admin-ai-providers-bg"
                          className="absolute inset-0 bg-[#FF9D76] rounded-full -z-10 shadow-sm"
                          transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                        />
                      )}
                    </button>
                  ))}
                </LayoutGroup>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className={fieldLabelClass}>图生成核心主模型</span>
                  <input
                    value={profile.imageModel}
                    onChange={(e) => setProfile(prev => ({ ...prev, imageModel: e.target.value }))}
                    className={`${modelInputClass} mt-2`}
                  />
                </label>
                <label className="block">
                  <span className={fieldLabelClass}>数字流视频主模型</span>
                  <input
                    value={profile.videoModel}
                    onChange={(e) => setProfile(prev => ({ ...prev, videoModel: e.target.value }))}
                    className={`${modelInputClass} mt-2`}
                  />
                </label>

                <div className="grid grid-cols-3 gap-2">
                  <label className="block min-w-0">
                    <span className={fieldLabelClass}>比例格式</span>
                    <input
                      value={profile.resolution}
                      onChange={(e) => setProfile(prev => ({ ...prev, resolution: e.target.value }))}
                      className={`${compactInputClass} mt-2`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className={fieldLabelClass}>视频长度</span>
                    <input
                      type="number"
                      min={1}
                      value={profile.duration}
                      onChange={(e) => setProfile(prev => ({ ...prev, duration: Number(e.target.value) || 5 }))}
                      className={`${compactInputClass} mt-2`}
                    />
                  </label>
                  <label className="block min-w-0">
                    <span className={fieldLabelClass}>随机数SEED</span>
                    <input
                      type="number"
                      value={profile.seed ?? 12345}
                      onChange={(e) => setProfile(prev => ({ ...prev, seed: Number(e.target.value) || 12345 }))}
                      className={`${compactInputClass} mt-2`}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className={switchClass}>
                    提示词智能扩展
                    <input
                      type="checkbox"
                      checked={profile.promptExtend}
                      onChange={(e) => setProfile(prev => ({ ...prev, promptExtend: e.target.checked }))}
                      className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                    />
                  </label>
                  <label className={switchClass}>
                    MOCK本地测试
                    <input
                      type="checkbox"
                      checked={profile.mockMode}
                      onChange={(e) => setProfile(prev => ({ ...prev, mockMode: e.target.checked }))}
                      className="w-4 h-4 shrink-0 accent-[#FF9D76]"
                    />
                  </label>
                </div>
              </div>
            </section>

            <div className="flex gap-3">
              <button
                onClick={handleResetAIConfig}
                className="flex-1 py-4 bg-white text-[#5D4037]/75 rounded-full font-black text-sm shadow-sm border border-outline-variant/40 hover:bg-surface-container active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <RotateCcw size={16} />
                恢复初始默认
              </button>
              <button
                onClick={handleSaveAIConfig}
                className="flex-[2] py-4 bg-[#FF9D76] text-white rounded-full font-black text-sm shadow-lg shadow-[#FF9D76]/20 hover:shadow-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <Save size={16} />
                应用并保存参数
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: BREED PRESETS */}
        {activeTab === "presets" && (
          <div className="space-y-4">
            <section className="bg-white p-5 rounded-[32px] border border-outline-variant/40 shadow-sm">
              <h2 className="text-[15px] font-black text-on-surface mb-3 tracking-normal">注入全新数字生命预设配型</h2>
              <div className="flex gap-4">
                <div className="relative w-24 h-24 bg-surface-container rounded-[24px] border-2 border-white shadow-sm overflow-hidden flex items-center justify-center group cursor-pointer shrink-0">
                  {isUploading ? (
                    <Loader2 className="animate-spin text-[#FF9D76]" size={24} />
                  ) : newImageUrl ? (
                    <img src={newImageUrl} className="w-full h-full object-cover" alt="Previewing companion preset" />
                  ) : (
                    <ImageIcon className="text-on-surface-variant/30" size={32} />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-20"
                    disabled={isUploading}
                  />
                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10 pointer-events-none">
                    <Upload className="text-white" size={18} />
                  </div>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <input
                    type="text"
                    placeholder="例如：苏格兰折耳猫, 暹罗猫"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full h-11 px-4 bg-surface-container rounded-[18px] border-none shadow-inner text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-[#FF9D76]/15 placeholder:text-on-surface-variant/40"
                  />
                  <button
                    onClick={handleAddPresetCompanion}
                    className="w-full h-11 bg-primary text-white rounded-[18px] font-black text-xs shadow-md shadow-primary/25 hover:bg-opacity-95 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Plus size={15} />
                    添加至库
                  </button>
                </div>
              </div>
            </section>

            <div className="space-y-2">
              <p className="text-[10px] font-black text-on-surface-variant opacity-60 uppercase tracking-[0.2em] ml-2">
                数字生命种群图谱 <span className="tabular-nums font-mono font-bold">({presets.length} 个)</span>
              </p>
              {presets.map((preset) => (
                <div key={preset.id} className="flex items-center gap-3.5 p-3 bg-white rounded-[24px] border border-outline-variant/30 shadow-sm hover:border-[#FF9D76]/20 transition-all">
                  <div className="w-13 h-13 rounded-2xl overflow-hidden shadow-sm bg-surface-container shrink-0">
                    <img src={preset.imageUrl} className="w-full h-full object-cover" alt={preset.name} referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-on-surface text-xs truncate">{preset.name}</p>
                    <p className="text-[10px] text-on-surface-variant/40 font-mono truncate mt-0.5">{preset.id}</p>
                  </div>
                  <button
                    onClick={() => handleDeletePresetCompanion(preset.id)}
                    className="w-10 h-10 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center shrink-0"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: PLATFORM USERS FEEDBACKS */}
        {activeTab === "feedback" && (
          <div className="space-y-4">
            {isLoadingStats ? (
              <div className="flex justify-center py-12"><Loader2 className="animate-spin text-[#FF9D76]" /></div>
            ) : !stats?.feedbacks || stats.feedbacks.length === 0 ? (
              <div className="bg-white/60 text-center py-16 rounded-3xl border border-dashed border-[#5D4037]/20 text-on-surface-variant/40 text-xs font-bold font-mono">
                🎉 ENVIRONMENT STABLE: NO PENDING CUSTOMER TICKETS
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[10px] font-black text-[#5D4037]/50 uppercase tracking-widest pl-1 font-mono">ALL TICKETS ({stats.feedbacks.length})</p>
                {stats.feedbacks.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-[28px] border border-outline-variant/40 shadow-sm relative overflow-hidden group">
                    
                    <div className="flex items-center gap-2.5 pb-2 border-b border-dashed border-outline-variant/30 mb-2.5">
                      <div className="w-6 h-6 rounded-lg overflow-hidden bg-surface-container shrink-0">
                        {item.userAvatar ? (
                          <img src={item.userAvatar} className="w-full h-full object-cover" alt="feedback avatar" />
                        ) : (
                          <div className="w-full h-full bg-[#FF9D76]/15 text-[#FF9D76] flex items-center justify-center font-black text-[9px]">{item.userId.substring(0, 2)}</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black text-[#5D4037] leading-none truncate block">{item.userNickname}</span>
                      </div>
                      <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black ${
                        item.type === "bug" ? "bg-red-50 text-red-600 border border-red-200" : "bg-blue-50 text-blue-600 border border-blue-200"
                      }`}>
                        {item.type === "bug" ? "系统漏洞" : "体验优化意向"}
                      </span>
                    </div>

                    <div className="text-[12px] font-semibold text-[#5D4037]/85 leading-relaxed bg-[#FDF9F6] p-3 rounded-2xl">
                      {item.content || "该用户发表了无文本评价"}
                    </div>

                    {item.answers && (
                      <div className="mt-2 text-[10px] bg-slate-50 text-slate-600 p-2.5 rounded-xl font-mono">
                        <p className="font-extrabold text-[9px] text-[#5D4037]/55 mb-1">SURVEY CONTEXTS:</p>
                        {Object.entries(item.answers).map(([k, v]) => (
                          <div key={k} className="flex justify-between mt-0.5">
                            <span className="opacity-70">{k}:</span>
                            <span className="font-bold">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[9px] font-bold text-on-surface-variant/40 font-mono mt-3">
                      <span>递交时间：{new Date(item.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => handleFeedbackDelete(item.id)}
                        className="text-red-400 hover:text-red-600 font-extrabold bg-red-50/50 hover:bg-red-50 px-2 py-1 rounded-md transition-all flex items-center gap-0.5"
                      >
                        <Trash size={10} />
                        删除工单
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FLOAT MANUAL POINT ADJUSTMENT DRAWER / MODAL */}
      <AnimatePresence>
        {editingUserPoints && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end justify-center">
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="w-full max-w-lg bg-white rounded-t-[40px] px-6 pt-5 pb-8 shadow-2xl border-t border-[#FF9D76]/20 relative"
            >
              <div className="w-12 h-1.5 bg-[#5D4037]/15 rounded-full mx-auto mb-5" />
              
              <div className="text-center">
                <h3 className="text-base font-black text-[#5D4037]">手工划转数字积分余额</h3>
                <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider mt-1">Manual Points Wire Transfer</p>
                <div className="bg-[#FF9D76]/10 py-1.5 px-3 rounded-full mt-3 inline-flex items-center gap-1">
                  <span className="text-[10px] font-black text-[#FF9D76]">接收人:</span>
                  <span className="text-[11px] font-black text-[#5D4037]">{editingUserPoints.nickname} ({editingUserPoints.username})</span>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                {/* Earn/spend toggles */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-surface-container rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPointsAdjustType("earn")}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      pointsAdjustType === "earn" ? "bg-[#FF9D76] text-white shadow-sm" : "text-[#5D4037]/65 hover:bg-black/5"
                    }`}
                  >
                    充值 (Credit)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPointsAdjustType("spend")}
                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                      pointsAdjustType === "spend" ? "bg-red-500 text-white shadow-sm" : "text-[#5D4037]/65 hover:bg-black/5"
                    }`}
                  >
                    扣减 (Debit)
                  </button>
                </div>

                {/* Amount input */}
                <div>
                  <span className={fieldLabelClass}>划转数额</span>
                  <input
                    type="number"
                    min={1}
                    value={pointsAdjustAmount}
                    onChange={(e) => setPointsAdjustAmount(Number(e.target.value) || 0)}
                    className="w-full h-12 px-4 bg-surface-container rounded-[18px] text-sm font-black text-on-surface outline-none focus:ring-2 focus:ring-[#FF9D76]/20 mt-1.5 font-mono text-center text-[#5D4037]"
                  />
                </div>

                {/* Reason input */}
                <div>
                  <span className={fieldLabelClass}>转账附言 / 调整理由</span>
                  <input
                    type="text"
                    value={pointsAdjustReason}
                    onChange={(e) => setPointsAdjustReason(e.target.value)}
                    className="w-full h-12 px-4 bg-surface-container rounded-[18px] text-xs font-semibold text-on-surface outline-none focus:ring-2 focus:ring-[#FF9D76]/20 mt-1.5 text-[#5D4037]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUserPoints(null)}
                    className="flex-1 h-12 rounded-full border border-outline-variant bg-white text-[#5D4037] font-black text-xs active:scale-95 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handlePointsAdjustmentSave}
                    disabled={isAdjustingPoints}
                    className="flex-1 h-12 rounded-full bg-[#FF9D76] text-white font-black text-xs shadow-lg shadow-[#FF9D76]/25 active:scale-95 transition-all flex items-center justify-center gap-1"
                  >
                    {isAdjustingPoints ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />}
                    确认划转
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Dynamic system feedback toasts */}
      <AnimatePresence>
        {showToast && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[250] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              className="bg-black/85 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 border border-white/10"
            >
              <CheckCircle2 size={15} className="text-green-400 stroke-[2.5]" />
              {showToast}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
