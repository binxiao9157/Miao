import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Send, CheckCircle2, MessageSquare, ClipboardList, Star } from "lucide-react";
import { storage } from "../services/storage";
import { motion, AnimatePresence } from "motion/react";
import PageHeader from "../components/PageHeader";

type Question = {
  id: string;
  type: "radio" | "checkbox" | "rating" | "text";
  question: string;
  options?: string[];
  required: boolean;
};

const SURVEY_QUESTIONS: Question[] = [
  {
    id: "style",
    type: "radio",
    question: "1. 您对 Miao 的整体界面风格（淡橘色治愈系）满意吗？",
    options: ["非常满意", "满意", "一般", "不满意"],
    required: true,
  },
  {
    id: "speed",
    type: "radio",
    question: "2. 您认为首页猫咪互动的 6 秒视频加载速度如何？",
    options: ["极快", "还能接受", "太慢了，影响体验"],
    required: true,
  },
  {
    id: "actions",
    type: "radio",
    question: "3. 您觉得目前的 4 种互动动作（蹭镜头、摸头、踩奶、逗猫棒）够玩吗？",
    options: ["非常丰富", "刚刚好", "太少了，希望增加"],
    required: true,
  },
  {
    id: "new_actions",
    type: "checkbox",
    question: "4. 您最希望 Miao 未来增加哪类新动作？（多选）",
    options: ["睡觉打呼", "吃饭喝水", "玩毛线球", "翻肚皮求摸", "其他"],
    required: true,
  },
  {
    id: "ai_quality",
    type: "rating",
    question: "5. 您对 AI 生成猫咪的“真实度/不崩坏程度”打几分？",
    required: true,
  },
  {
    id: "points_earn",
    type: "radio",
    question: "6. 积分系统（签到、互动赚积分）对您有吸引力吗？",
    options: ["每天都想赚", "偶尔想起来", "完全没兴趣"],
    required: true,
  },
  {
    id: "threshold",
    type: "radio",
    question: "7. 您认为 200 积分解锁一只新猫咪的门槛高吗？",
    options: ["太高了", "合理", "太低了"],
    required: true,
  },
  {
    id: "letters",
    type: "checkbox",
    question: "8. 时光信件功能中，您最看重什么？（多选）",
    options: ["倒计时的期待感", "隐秘的情感寄托", "猫咪专属相册", "其他"],
    required: true,
  },
  {
    id: "social",
    type: "radio",
    question: "9. 扫码添加好友（喵友圈）的社交功能，您目前的体验如何？",
    options: ["很棒，经常看", "没好友，很少用", "觉得没必要做社交"],
    required: true,
  },
  {
    id: "issues",
    type: "checkbox",
    question: "10. 在使用过程中，您遇到过哪些“使用限制”或不爽的地方？（多选）",
    options: ["黑屏卡顿", "按钮点不到", "视频耗流量", "找不到某功能", "其他"],
    required: true,
  },
  {
    id: "suggestions",
    type: "text",
    question: "11. 您还有什么更好的建议或想对开发者说的话？（选填）",
    required: false,
  },
];

export default function Feedback() {
  const navigate = useNavigate();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Survey State
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});
  
  // Simple Mode State
  const [feedbackType, setFeedbackType] = useState("功能建议");
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    setHasSubmitted(storage.getHasSubmittedSurvey());
  }, []);

  const handleSurveySubmit = () => {
    // Validate required questions (1-10)
    for (const q of SURVEY_QUESTIONS.slice(0, 10)) {
      const answer = surveyAnswers[q.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        alert(`请完成第 ${q.question.split('.')[0]} 题`);
        return;
      }
    }

    // Success
    storage.setHasSubmittedSurvey(true);
    setIsSuccess(true);
    setTimeout(() => navigate(-1), 2000);
  };

  const handleSimpleSubmit = () => {
    if (feedbackText.trim().length < 10) {
      alert("请至少输入 10 个字的反馈内容");
      return;
    }
    // Success
    setIsSuccess(true);
    setTimeout(() => {
      setFeedbackText("");
      setIsSuccess(false);
      navigate(-1);
    }, 2000);
  };

  const toggleCheckbox = (id: string, option: string) => {
    const current = surveyAnswers[id] || [];
    if (current.includes(option)) {
      setSurveyAnswers({ ...surveyAnswers, [id]: current.filter((o: string) => o !== option) });
    } else {
      setSurveyAnswers({ ...surveyAnswers, [id]: [...current, option] });
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-dvh bg-background flex flex-center items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-[32px] p-10 shadow-xl flex flex-col items-center text-center"
        >
          <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h3 className="text-xl font-black text-on-surface mb-2">感谢您的宝贵意见！</h3>
          <p className="text-sm text-on-surface-variant">我们会尽快优化，给您更好的体验</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto no-scrollbar">
      <PageHeader 
        title="意见反馈"
        subtitle={hasSubmitted ? "倾听您的每一次吐槽与建议" : "告诉我们您的真实感受～"}
        onBack={() => navigate(-1)}
      />

      <main className="px-6 pb-12 shrink-0 overflow-visible">
        <AnimatePresence mode="wait">
          {!hasSubmitted ? (
            <motion.div 
              key="survey"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8 py-4"
            >
              <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <p className="text-xs text-primary font-bold leading-relaxed">
                  为了给喵星人提供更好的陪伴，请花 2 分钟完成以下调研。您的反馈对我们至关重要！
                </p>
              </div>

              {SURVEY_QUESTIONS.map((q) => (
                <section key={q.id} className="space-y-4">
                  <h4 className="text-sm font-black text-on-surface leading-snug">
                    {q.question} {q.required && <span className="text-red-500">*</span>}
                  </h4>

                  {q.type === "radio" && (
                    <div className="grid grid-cols-1 gap-2">
                      {q.options?.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}
                          className={`flex items-center p-3 rounded-2xl border-2 transition-all text-left ${
                            surveyAnswers[q.id] === opt 
                            ? "border-primary bg-primary/5 text-primary" 
                            : "border-outline-variant/30 bg-white text-on-surface-variant"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${surveyAnswers[q.id] === opt ? "border-primary" : "border-outline-variant/50"}`}>
                            {surveyAnswers[q.id] === opt && <div className="w-2 h-2 rounded-full bg-primary" />}
                          </div>
                          <span className="text-xs font-bold">{opt}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "checkbox" && (
                    <div className="grid grid-cols-1 gap-2">
                      {q.options?.map((opt) => {
                        const isSelected = (surveyAnswers[q.id] || []).includes(opt);
                        return (
                          <button
                            key={opt}
                            onClick={() => toggleCheckbox(q.id, opt)}
                            className={`flex items-center p-3 rounded-2xl border-2 transition-all text-left ${
                              isSelected 
                              ? "border-primary bg-primary/5 text-primary" 
                              : "border-outline-variant/30 bg-white text-on-surface-variant"
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 mr-3 flex items-center justify-center ${isSelected ? "border-primary bg-primary" : "border-outline-variant/50"}`}>
                              {isSelected && <div className="w-2 h-2 text-white flex items-center justify-center">✓</div>}
                            </div>
                            <span className="text-xs font-bold">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "rating" && (
                    <div className="flex justify-between items-center px-4">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: num })}
                          className="flex flex-col items-center gap-1"
                        >
                          <Star 
                            size={32} 
                            className={surveyAnswers[q.id] >= num ? "fill-orange-400 text-orange-400" : "text-gray-200"} 
                          />
                          <span className="text-[10px] font-bold text-on-surface-variant">{num}分</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "text" && (
                    <textarea
                      placeholder="请填写您的建议..."
                      value={surveyAnswers[q.id] || ""}
                      onChange={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.target.value })}
                      maxLength={500}
                      className="w-full px-6 py-4 bg-surface-container rounded-[32px] border-none outline-none text-on-surface placeholder:text-on-surface-variant/40 transition-all focus:ring-2 focus:ring-primary/20 text-sm min-h-[120px] resize-none"
                    />
                  )}
                </section>
              ))}

              <button 
                onClick={handleSurveySubmit}
                className="miao-btn-primary py-4 shadow-lg shadow-primary/20 sticky bottom-4 z-10"
              >
                提交问卷
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="simple"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 py-4"
            >
              <div className="bg-white p-6 rounded-[32px] shadow-sm border border-outline-variant/20 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant opacity-40 uppercase tracking-widest ml-2">问题类型</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Bug反馈", "功能建议", "界面优化", "其他"].map((type) => (
                      <button
                        key={type}
                        onClick={() => setFeedbackType(type)}
                        className={`py-2 px-4 rounded-xl text-xs font-bold border-2 transition-all ${
                          feedbackType === type 
                          ? "border-primary bg-primary text-white" 
                          : "border-outline-variant/30 text-on-surface-variant"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-on-surface-variant opacity-40 uppercase tracking-widest ml-2">反馈内容</label>
                  <textarea
                    placeholder="请详细描述您遇到的问题或建议...（至少 10 个字）"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    className="w-full px-6 py-4 bg-surface-container rounded-[32px] border-none outline-none text-on-surface placeholder:text-on-surface-variant/40 transition-all focus:ring-2 focus:ring-primary/20 text-sm min-h-[200px] resize-none"
                  />
                </div>
              </div>

              <button 
                onClick={handleSimpleSubmit}
                className="w-full miao-btn-primary py-4 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                发送反馈
              </button>

              <div className="text-center pt-8">
                <p className="text-[10px] text-on-surface-variant/40 font-bold tracking-widest uppercase">
                  感谢您的支持，Miao 正在变更好
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
