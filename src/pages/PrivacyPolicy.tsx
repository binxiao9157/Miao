import { useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 1,
      title: "一、 我们如何收集和使用您的个人信息",
      content: [
        { 
          label: "账号注册与登录", 
          detail: <>为了提供基础服务，我们需要收集您的<span className="font-bold text-on-surface underline decoration-orange-300">手机号码</span>。我们通过发送<span className="font-bold text-on-surface">短信验证码</span>的方式来验证您的身份并实现实名认证，确保账号的安全性与合规性。</> 
        },
        { 
          label: "提供陪伴服务（核心业务）", 
          detail: <>为实现“数字猫咪生成”及互动，我们需要收集并处理您主动上传的<span className="font-bold text-on-surface">猫咪照片、视频素材</span>，以及您填写的猫咪名称、种类的资料。这些信息将用于为您生成专属的 AI 视频形象。</> 
        },
        { 
          label: "社交互动服务", 
          detail: <>在您使用“添加好友”、“日常记录”及“时光信件”功能时，我们会收集并展示您的<span className="font-bold text-on-surface">昵称、头像</span>、发布的日记内容（包括文字、图片、视频）、评论及点赞记录。上述信息将向您已添加的好友展示，并在特定互动场景下公开提示。</> 
        },
        { 
          label: "设备权限请求", 
          detail: <>
            我们在特定场景下会申请以下关键权限：
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><span className="font-bold">相机权限</span>：用于拍摄猫咪素材或扫描二维码添加好友。</li>
              <li><span className="font-bold">相册/存储权限</span>：用于读取本地照片视频素材、保存生成的陪伴视频到本地。</li>
            </ul>
          </> 
        },
      ]
    },
    {
      id: 2,
      title: "二、 我们如何共享、转让、公开披露您的个人信息",
      content: [
        { 
          label: "第三方接入说明（极其重要）", 
          detail: <>
            为了实现高品质的数字猫咪 AI 视频生成功能，我们会将您提供的猫咪原始图片/视频数据通过加密传输方式提供给技术合作伙伴：<span className="font-bold text-orange-600">火山引擎（北京字节跳动科技有限公司）</span>。
            <br/><br/>
            我们郑重承诺：我们会与合作伙伴签订严格的数据安全协议，要求其仅在提供本服务所必需的范围内处理数据，严禁将其用于任何未经授权的商业用途、广告推送或公开展示。
          </> 
        },
        { 
          label: "其他共享场景", 
          detail: "除非获得您的明确同意或法律法规另有要求，我们不会向除上述合作伙伴以外的任何第三方共享您的个人敏感信息。" 
        },
      ]
    },
    {
      id: 3,
      title: "三、 我们如何存储和保护您的个人信息",
      content: [
        { 
          label: "存储期限与位置", 
          detail: <>我们在中华人民共和国境内运营中收集和产生的个人信息，均<span className="font-bold text-on-surface">存储在中华人民共和国境内</span>。除法律另有规定外，我们仅在为提供服务所必需的最短期限内保留您的个人信息。</> 
        },
        { 
          label: "数据安全保障", 
          detail: "我们采用符合业界标准的 HTTPS 加密传输协议及多重身份验证机制，防止数据在传输过程中被窃取或篡改。对于存储在服务器端的数据，我们实施了严格的访问控制和加密存储策略。" 
        },
      ]
    },
    {
      id: 4,
      title: "四、 您的权利",
      content: [
        { 
          label: "管理与修正", 
          detail: "您有权通过“个人中心”访问、查询、更正您的个人资料信息（包括昵称、头像等）。" 
        },
        { 
          label: "账号注销", 
          detail: "您可以通过“设置-账号安全”申请注销您的账号。在注销完成后，我们将依法删除您的个人信息或进行匿名化处理，法律法规另有要求的除外。" 
        },
      ]
    }
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 pb-4 flex items-center border-b border-outline-variant/30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">隐私政策</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-6 space-y-8 pb-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-2xl font-black text-on-surface">合规与隐私保护</h2>
          <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mt-2">Miao Sanctuary Compliance Policy V2.0</p>
        </motion.div>

        <div className="bg-white/50 backdrop-blur-sm rounded-[32px] p-6 border border-outline-variant/30 space-y-12">
          {sections.map((section) => (
            <section key={section.id} className="space-y-5">
              <h3 className="text-lg font-black text-on-surface flex items-center gap-3">
                <span className="w-1 h-6 bg-orange-500 rounded-full"></span>
                {section.title}
              </h3>
              <div className="space-y-6">
                {section.content.map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <p className="text-sm font-bold text-on-surface">
                      {item.label}
                    </p>
                    <div className="text-sm text-on-surface-variant leading-relaxed">
                      {item.detail}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="pt-10 text-center">
          <p className="text-xs font-medium text-on-surface-variant/60 leading-relaxed max-w-[280px] mx-auto">
            保护您的隐私是我们的首要任务。我们将持续根据国家法律法规更新本政策。
          </p>
          <p className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest mt-6">
            最后更新日期：2026年4月16日
          </p>
        </footer>
      </main>
    </div>
  );
}
