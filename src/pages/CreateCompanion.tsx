import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { catService } from "../services/catService";

export default function CreateCompanion() {
  const navigate = useNavigate();
  const [selectedBreed, setSelectedBreed] = useState(catService.breeds[0].id);
  const [selectedColor, setSelectedColor] = useState(catService.colors[0].id);
  const [catName, setCatName] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!catName.trim()) {
      alert("请给您的猫咪起个名字吧！");
      return;
    }
    
    setIsGenerating(true);
    
    // 模拟生成过程
    setTimeout(() => {
      const breed = catService.breeds.find(b => b.id === selectedBreed);
      const color = catService.colors.find(c => c.id === selectedColor);
      
      catService.saveCat({
        id: 'cat_' + Date.now(),
        name: catName,
        breed: breed?.name || "",
        color: color?.name || "",
        avatar: breed?.image || "",
        source: 'created'
      });
      
      setIsGenerating(false);
      navigate("/");
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col">
      <header className="flex items-center mb-8">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-on-surface-variant">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-on-surface ml-2">捏出您的猫咪</h1>
      </header>

      <div className="flex-grow space-y-8 overflow-y-auto pb-24">
        {/* 预览区域 */}
        <div className="relative w-full aspect-square bg-white rounded-3xl shadow-xl flex items-center justify-center overflow-hidden border-4 border-white">
          <img 
            src={catService.breeds.find(b => b.id === selectedBreed)?.image} 
            alt="Cat Preview" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/5"></div>
          {isGenerating && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-primary font-bold animate-pulse">正在赋予灵魂...</p>
            </div>
          )}
        </div>

        {/* 名字输入 */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">猫咪昵称</label>
          <input 
            type="text" 
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="给它起个好听的名字"
            className="w-full p-4 bg-white rounded-2xl border-none shadow-sm focus:ring-2 focus:ring-primary/20 outline-none" 
          />
        </div>

        {/* 品种选择 */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">选择品种</label>
          <div className="grid grid-cols-2 gap-3">
            {catService.breeds.map((breed) => (
              <button
                key={breed.id}
                onClick={() => setSelectedBreed(breed.id)}
                className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedBreed === breed.id 
                    ? "border-primary bg-primary/5" 
                    : "border-transparent bg-white shadow-sm"
                }`}
              >
                <img src={breed.image} alt={breed.name} className="w-12 h-12 rounded-full object-cover" referrerPolicy="no-referrer" />
                <span className={`text-sm font-medium ${selectedBreed === breed.id ? "text-primary" : "text-on-surface"}`}>
                  {breed.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 毛色选择 */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1">选择毛色</label>
          <div className="flex flex-wrap gap-4 px-1">
            {catService.colors.map((color) => (
              <button
                key={color.id}
                onClick={() => setSelectedColor(color.id)}
                className={`w-12 h-12 rounded-full border-4 flex items-center justify-center transition-all ${
                  selectedColor === color.id ? "border-primary scale-110 shadow-lg" : "border-white shadow-sm"
                }`}
                style={{ background: color.hex }}
              >
                {selectedColor === color.id && (
                  <Check size={20} className={color.id === 'white' ? "text-primary" : "text-white"} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="fixed bottom-8 left-6 right-6">
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full py-5 bg-primary-container text-white rounded-full font-bold text-lg shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-50"
        >
          <Sparkles size={20} />
          {isGenerating ? "生成中..." : "确认生成"}
        </button>
      </div>
    </div>
  );
}
