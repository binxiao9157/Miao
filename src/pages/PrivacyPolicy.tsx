import { useNavigate } from "react-router-dom";

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  return (
    <div className="p-6 flex flex-col">
      <button onClick={() => navigate(-1)} className="self-start mb-8">返回</button>
      <h1 className="text-3xl font-bold text-primary mb-8">隐私政策</h1>
      <div className="space-y-8 text-on-surface-variant">
        <section>
          <h3 className="text-xl font-bold text-on-surface mb-4">1. 我们收集的信息</h3>
          <p>当您使用 Miao 应用程序时，我们可能会收集个人信息、宠物资料和位置数据。</p>
        </section>
        <section>
          <h3 className="text-xl font-bold text-on-surface mb-4">2. 信息用途</h3>
          <p>您的数据主要用于优化宠物管理体验，包括提醒接种疫苗、定制饮食建议等。</p>
        </section>
        <section className="p-6 bg-primary text-white rounded-xl">
          <h3 className="text-xl font-bold mb-4">5. 安全保障</h3>
          <p>我们采用业界领先的加密技术来保护您的数据安全。</p>
        </section>
      </div>
    </div>
  );
}
