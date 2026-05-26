import { useNavigate } from 'react-router-dom'

export default function Demo3() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-2xl flex items-center justify-center">
      <div className="bg-white rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] p-10 w-[420px] border border-white/20">
        <div className="text-7xl text-center mb-5">⏰</div>
        <div className="text-3xl font-bold text-gray-900 text-center mb-3">该休息一下啦！</div>
        <div className="text-gray-600 text-center mb-8">久坐伤身，动起来吧 💪</div>
        
        <div className="flex gap-5 justify-center mb-8">
          <button className="px-10 py-5 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-3xl text-xl font-bold hover:scale-105 transition-transform shadow-2xl">
            🧍 站一站
          </button>
          <button className="px-10 py-5 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-3xl text-xl font-bold hover:scale-105 transition-transform shadow-2xl">
            🚶 走一走
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 mb-5">
          <input type="checkbox" className="w-7 h-7 rounded-xl" />
          <span className="text-gray-800 text-lg">🥤 装个水</span>
        </div>

        <div className="text-center">
          <button onClick={() => navigate('/demo')} className="text-gray-500 hover:text-gray-700 text-base">
            返回 Demo 选择
          </button>
        </div>
      </div>
    </div>
  )
}
