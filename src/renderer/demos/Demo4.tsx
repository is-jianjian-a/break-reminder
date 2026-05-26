import { useNavigate } from 'react-router-dom'

export default function Demo4() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-lg flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-lg p-8 w-[400px] border border-gray-200">
        <div className="text-5xl text-center mb-4">⏰</div>
        <div className="text-xl font-bold text-gray-800 text-center mb-2">该休息一下啦！</div>
        <div className="text-gray-600 text-center mb-6">久坐伤身，动起来吧 💪</div>
        
        <div className="flex gap-3 justify-center mb-6">
          <button className="px-7 py-3 bg-indigo-600 text-white rounded-xl text-base font-semibold hover:bg-indigo-700 transition-colors shadow-md">
            🧍 站一站
          </button>
          <button className="px-7 py-3 bg-emerald-600 text-white rounded-xl text-base font-semibold hover:bg-emerald-700 transition-colors shadow-md">
            🚶 走一走
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-4">
          <input type="checkbox" className="w-5 h-5 rounded" />
          <span className="text-gray-700">🥤 装个水</span>
        </div>

        <div className="text-center">
          <button onClick={() => navigate('/demo')} className="text-gray-500 hover:text-gray-700 text-sm">
            返回 Demo 选择
          </button>
        </div>
      </div>
    </div>
  )
}
