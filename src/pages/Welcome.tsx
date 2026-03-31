import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex flex-col p-8 bg-background">
      <h1 className="text-3xl font-bold text-on-surface mb-2">遇见你的数字猫咪</h1>
      <p className="text-on-surface-variant mb-12">开启一段温暖的治愈旅程。</p>
      <div className="space-y-4 flex-grow flex flex-col justify-center">
        <button 
          onClick={() => navigate("/upload-material")}
          className="w-full p-6 bg-surface-container-low rounded-xl text-left border border-outline-variant"
        >
          <h2 className="text-lg font-bold">我有猫咪</h2>
          <p className="text-sm text-on-surface-variant">上传照片，生成专属数字形象。</p>
        </button>
        <button 
          onClick={() => navigate("/create-companion")}
          className="w-full p-6 bg-surface-container-low rounded-xl text-left border border-outline-variant"
        >
          <h2 className="text-lg font-bold">我想养猫</h2>
          <p className="text-sm text-on-surface-variant">选择心仪品种，领养第一只猫咪。</p>
        </button>
      </div>
    </div>
  );
}
