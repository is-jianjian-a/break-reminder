import { useNavigate } from 'react-router-dom'

export default function Demo1() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-96">
        <div className="text-6xl text-center mb-4">⏰</div>
        <div className="text-2xl font-bold text-gray-800 text-center mb-2">该休息一下啦！</div>
        <div className="text-gray-600 text-center mb-6">久坐伤身，动起来吧 💪</div>
        
        <div className="flex gap-4 justify-center mb-6">
          <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl text-lg font-semibold hover:bg-indigo-700 transition-colors shadow-lg">
            🧍 站一站
          </button>
          <button className="px-8 py-4 bg-emerald-600 text-white rounded-2xl text-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg">
            🚶 走一走
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <input type="checkbox" className="w-6 h-6 rounded" />
          <span className="text-gray-700">🥤 装个水</span>
        </div>

        <div className="text-center">
          <button onClick={() => navigate('/demo')} className="text-gray-500 hover:text-gray-700">
            返回 Demo 选择
          </button>
        </div>
      </div>
    </div>
  )
}
