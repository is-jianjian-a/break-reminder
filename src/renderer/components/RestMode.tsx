import { useState, useEffect, useCallback } from 'react'

const encouragements = [
  '久坐伤身，动起来吧 💪',
  '站起来伸个懒腰～',
  '去装杯水，补充水分！',
  '活动一下，效率更高 ✨',
  '休息是为了更好地出发',
  '身体是革命的本本 🏃',
  '走两步，醒醒脑',
  '别久坐，腰会抗议的',
  '起来活动，远离颈椎病',
  '动一动，精神百倍',
  '喝水+走动=最佳休息',
  '你的身体在呼唤你 🧘',
]

const ipc = () => window.electron?.ipcRenderer

export default function RestMode() {
  const [isWalking, setIsWalking] = useState(false)
  const [walkStartTime, setWalkStartTime] = useState<number>(0)
  const [walkElapsed, setWalkElapsed] = useState(0)
  const [waterChecked, setWaterChecked] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'stand' | 'walk' | null>(null)
  const [encouragement, setEncouragement] = useState(
    encouragements[Math.floor(Math.random() * encouragements.length)]
  )

  useEffect(() => {
    const api = ipc()
    if (!api) return

    const unsub1 = api.on('show-rest-mode', () => {
      setIsWalking(false)
      setWaterChecked(false)
      setSelectedAction(null)
      setEncouragement(encouragements[Math.floor(Math.random() * encouragements.length)])
    })

    const unsub2 = api.on('walk-started', () => {
      setIsWalking(true)
      setWalkStartTime(Date.now())
      setWalkElapsed(0)
    })

    return () => {
      unsub1()
      unsub2()
    }
  }, [])

  useEffect(() => {
    if (!isWalking) return
    const interval = setInterval(() => {
      setWalkElapsed(Math.floor((Date.now() - walkStartTime) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [isWalking, walkStartTime])

  const handleStand = useCallback(() => {
    setSelectedAction('stand')
    ipc()?.send('rest-action', { action: 'stand', waterChecked })
  }, [waterChecked])

  const handleWalk = useCallback(() => {
    setSelectedAction('walk')
    ipc()?.send('rest-action', { action: 'walk', waterChecked })
  }, [waterChecked])

  const handleWalkComplete = useCallback(() => {
    ipc()?.send('walk-complete', walkElapsed)
  }, [walkElapsed])

  const handleSkip = useCallback(() => {
    ipc()?.send('rest-action', { action: 'skip', waterChecked: false })
  }, [])

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="rest-root">
      {isWalking ? (
        <div className="flex flex-col items-center justify-center gap-8 animate-rest-slide-up">
          <div className="text-8xl">🚶</div>
          <div className="text-4xl font-bold text-white">走一走进行中</div>
          <div className="text-7xl font-mono font-bold text-white tabular-nums animate-pulse-slow">
            {formatTime(walkElapsed)}
          </div>
          <button
            onClick={handleWalkComplete}
            className="mt-6 px-16 py-5 bg-white text-indigo-700 rounded-2xl text-2xl font-bold hover:bg-indigo-50 transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95"
          >
            ✅ 结束走路
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-8 animate-rest-slide-up">
          <div className="text-8xl animate-bounce">⏰</div>
          <div className="text-4xl font-bold text-white">该休息一下啦！</div>
          {encouragement && (
            <div className="text-xl text-white/80">{encouragement}</div>
          )}

          <div className="flex gap-8 mt-4">
            <button
              onClick={handleStand}
              className={`flex flex-col items-center gap-4 w-52 py-10 rounded-3xl border-3 transition-all duration-300 ${
                selectedAction === 'stand'
                  ? 'border-white bg-white/25 shadow-2xl scale-105'
                  : 'border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 hover:scale-102'
              }`}
            >
              <span className="text-7xl">🧍</span>
              <span className="text-2xl font-bold text-white">站一站</span>
            </button>

            <button
              onClick={handleWalk}
              className={`flex flex-col items-center gap-4 w-52 py-10 rounded-3xl border-3 transition-all duration-300 ${
                selectedAction === 'walk'
                  ? 'border-white bg-white/25 shadow-2xl scale-105'
                  : 'border-white/30 bg-white/10 hover:bg-white/20 hover:border-white/50 hover:scale-102'
              }`}
            >
              <span className="text-7xl">🚶</span>
              <span className="text-2xl font-bold text-white">走一走</span>
            </button>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mt-4">
            <input
              type="checkbox"
              checked={waterChecked}
              onChange={(e) => setWaterChecked(e.target.checked)}
              className="w-7 h-7 rounded border-white/50 text-indigo-600 focus:ring-indigo-500 bg-white/20"
            />
            <span className="text-2xl text-white">🥤 装个水</span>
          </label>

          <button
            onClick={handleSkip}
            className="text-xl text-white/50 hover:text-white/80 transition-all duration-300 mt-4 hover:scale-105"
          >
            跳过本次
          </button>
        </div>
      )}
    </div>
  )
}
