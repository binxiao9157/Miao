export default function Points() {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-primary-container p-8 rounded-2xl text-white text-center shadow-lg">
        <p className="text-xs opacity-80 mb-2">MY BALANCE</p>
        <h2 className="text-5xl font-bold">2,840</h2>
      </div>
      <h2 className="text-xl font-bold text-primary">今日任务</h2>
      <div className="space-y-3">
        {['每日首次登录', '完成1次猫咪互动', '单日登录时长超10分钟'].map(task => (
          <div key={task} className="flex items-center justify-between bg-surface-container-low p-4 rounded-xl">
            <div>
              <h3 className="font-bold text-sm">{task}</h3>
              <p className="text-xs text-on-surface-variant">+10 积分</p>
            </div>
            <button className="px-4 py-2 bg-primary-container text-white rounded-full text-xs font-bold">去完成</button>
          </div>
        ))}
      </div>
    </div>
  );
}
