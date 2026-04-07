import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 1,
      title: "一、 我们收集的信息",
      content: [
        { label: "账号信息", detail: "用户名、密码。" },
        { label: "宠物资料", detail: "您为猫咪生成的配置信息（品种、毛色、昵称）。" },
        { label: "媒体内容", detail: "您主动上传用于 AI 生成的图片/视频，以及在“日常记录”和“时光信件”中保存的文字与媒体文件。" },
      ]
    },
    {
      id: 2,
      title: "二、 信息的使用用途",
      content: [
        { label: "提供核心服务", detail: "用于为您生成专属的 AI 视频形象。" },
        { label: "情感记录", detail: "保存您的日记与时光信件。" },
        { label: "激励体系", detail: "记录积分获取与兑换状态。" },
      ]
    },
    {
      id: 3,
      title: "三、 数据的存储与保护",
      content: [
        { label: "本地存储优先", detail: "您的日常记录、时光信件等私密数据默认存储在您的本地设备中。" },
        { label: "加密传输", detail: "备份至云端的数据均采用业界领先的加密技术处理。" },
      ]
    },
    {
      id: 4,
      title: "四、 第三方服务",
      content: [
        { label: "AI 视频生成", detail: "为了实现 AI 视频生成，我们会将您提供的基础参数或图片传输至 AI 服务商 API 接口，我们承诺不会将其用于除此之外的其他用途。" },
        { label: "分享功能", detail: "为了实现分享功能，我们会接入微信 SDK。" },
      ]
    },
    {
      id: 5,
      title: "五、 您的权利",
      content: [
        { label: "资料管理", detail: "您可以随时修改个人资料、更换/切换猫咪形象。" },
        { label: "账户注销", detail: "您拥有注销账户并删除所有云端备份数据的权利。" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 pb-4 flex items-center border-b border-outline-variant/30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">隐私政策</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-6 space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-orange-500">隐私政策</h2>
          <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mt-2">Miao Privacy Policy V1.0</p>
        </motion.div>

        <div className="space-y-10 pb-12">
          {sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <h3 className="text-lg font-bold text-[#4B3621] border-l-4 border-orange-400 pl-3">
                {section.title}
              </h3>
              <div className="space-y-4 pl-4">
                {section.content.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-sm font-bold text-on-surface flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-orange-300 rounded-full"></span>
                      {item.label}
                    </p>
                    <p className="text-sm text-gray-500 leading-[1.8] pl-3.5">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pt-8 border-t border-outline-variant/30 text-center">
          <p className="text-[10px] font-medium text-on-surface-variant opacity-40 leading-relaxed">
            如果您对本隐私政策有任何疑问，请通过应用内的“意见反馈”与我们联系。
            <br/>
            最后更新日期：2026年4月2日
          </p>
        </footer>
      </main>
    </div>
  );
}
