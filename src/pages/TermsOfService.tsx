import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import { motion } from 'motion/react';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  const sections = [
    {
      id: 1,
      title: "一、 服务内容与使用规则",
      isHighlighted: false,
      paragraphs: [
        {
          subtitle: "1.1 服务定义",
          content: "Miao（以下简称“本平台”）是一款提供数字宠物 AI 形象生成、情感记录（时光信件）、宠物陪伴及好友互动社交服务的移动互联网应用程序。"
        },
        {
          subtitle: "1.2 账号规范",
          content: "用户通过手机验证码注册并登录本平台。用户应妥善保管账号密码，账号仅限用户本人使用。严禁任何形式的账号转让、出借、租用或售卖行为。因用户保管不当导致的账号权益丢失归由用户本人承担。"
        },
        {
          subtitle: "1.3 使用限制",
          content: "用户承诺在使用服务过程中严格遵守国家法律法规，严禁盗用他人图像素材。禁止利用本平台发布、传播任何色情、暴力恐怖、诈骗、虚假信息或侵犯第三方知识产权的内容。"
        }
      ]
    },
    {
      id: 2,
      title: "二、 AIGC（AI 生成内容）特别声明",
      isHighlighted: true,
      paragraphs: [
        {
          subtitle: "2.1 技术局限性提示",
          content: "本平台中的“数字猫咪视频”系基于第三方人工智能模型（包括但不限于火山引擎）生成。用户理解并认可：受限于 AIGC 技术发展现状，生成的内容可能存在画质瑕疵、与物理常识不符或不尽如人意的情形。本平台对此类内容的审美质量、科学准确性不作绝对担保。"
        },
        {
          subtitle: "2.2 使用限制与版权",
          content: "用户明白并同意，生成的 AI 形象及视频仅供个人娱乐、情感陪伴及在本平台内进行社交展示使用。用户禁止将本平台生成的任何 AI 素材直接或间接用于商业盈利目的，或用于任何侵犯第三方合法权益的活动。"
        },
        {
          subtitle: "2.3 责任声明",
          content: "若用户上传违法违规图片、提示词而导致生成的输出内容存在法律风险，由此产生的法律责任由用户自行承担。本平台有权对违规生成的记录进行清理并采取封禁措施。"
        }
      ]
    },
    {
      id: 3,
      title: "三、 UGC（用户生成内容）规范",
      isHighlighted: false,
      paragraphs: [
        {
          subtitle: "3.1 内容审核",
          content: "用户在“日常记录”、“时光信件”及社交评论中发布的内容必须符合相关法律。本平台保留运用人工或机器手段进行内容审查的权利，并可自主决定对违规内容执行屏蔽、删除乃至账号永久封禁。"
        },
        {
          subtitle: "3.2 内容授权",
          content: "用户在平台公开发布（对好友可见）的内容，视为授予本平台在提供本产品服务及品牌宣传范围内的、全球范围内的、非独家的、免费的许可使用权。"
        }
      ]
    },
    {
      id: 4,
      title: "四、 免责声明与服务变更",
      isHighlighted: true,
      paragraphs: [
        {
          subtitle: "4.1 不可抗力免责",
          content: "对于因极端天气、网络故障、第三方 API 接口维护（如火山引擎服务器宕机）、黑客攻击或政府指令等不可抗力因素造成的服务中断、数据丢失或任务失败，本平台在法律允许的范围内免除赔偿责任。"
        },
        {
          subtitle: "4.2 服务调整",
          content: "本平台保留根据业务运营需求随时修改、暂停或终止部分或全部服务的权利。包括但不限于调整积分获取规则、关闭特定互动功能、回收不活跃账号等，该等调整将通过端内公告形式发布。"
        }
      ]
    }
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      {/* 顶部标题栏 */}
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-md px-6 pb-4 flex items-center border-b border-outline-variant/30"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 1rem)' }}
      >
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">服务条款</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-6 space-y-10 pb-12">
        {/* 顶部引导视图 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Scale size={32} />
          </div>
          <h2 className="text-2xl font-black text-on-surface tracking-tight">法律协议与使用须知</h2>
          <p className="text-[10px] font-bold text-on-surface-variant opacity-40 uppercase tracking-widest mt-2">Miao Terms Of Service V2.0</p>
        </motion.div>

        {/* 条款主体内容 */}
        <div className="space-y-12">
          {sections.map((section) => (
            <section key={section.id} className="space-y-6">
              <h3 className={`text-lg font-black flex items-center gap-3 ${section.id === 2 || section.id === 4 ? 'text-primary' : 'text-on-surface'}`}>
                <span className={`w-1 h-6 rounded-full ${section.id === 2 || section.id === 4 ? 'bg-primary' : 'bg-on-surface/20'}`}></span>
                {section.title}
              </h3>
              
              <div className="space-y-8 pl-4 border-l border-outline-variant/10">
                {section.paragraphs.map((p, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="text-sm font-black text-on-surface">
                      {p.subtitle}
                    </h4>
                    <p className={`text-sm leading-relaxed ${section.isHighlighted ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                      {p.content}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* 底部版权与更新说明 */}
        <div className="pt-12 border-t border-outline-variant/30 text-center">
          <p className="text-xs font-semibold text-on-surface-variant/60 leading-relaxed max-w-[300px] mx-auto">
            点击“同意”或继续使用本应用，即表示您已充分阅读、理解并接受上述所有条款。
          </p>
          <p className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-[0.3em] mt-8">
            © 2026 MIAO SANCTUARY · LAST UPDATE: 04.16
          </p>
        </div>
      </main>
    </div>
  );
};

export default TermsOfService;
