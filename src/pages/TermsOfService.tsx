import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white p-6">
      <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-gray-600">
        <ArrowLeft className="mr-2" size={20} /> 返回
      </button>
      <h1 className="text-2xl font-bold mb-4">Miao 服务条款</h1>
      <div className="text-gray-700 space-y-4">
        <p>欢迎使用 Miao。在使用本服务前，请仔细阅读以下条款。</p>
        <p>1. 服务内容：本应用提供宠物陪伴及相关功能。</p>
        <p>2. 用户责任：用户需保证账号信息的真实性与安全性。</p>
        <p>3. 免责声明：本应用不对因网络问题导致的任何损失负责。</p>
        <p>（此处为占位文本，实际内容请根据业务需求填充）</p>
      </div>
    </div>
  );
};

export default TermsOfService;
