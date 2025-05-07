'use client'

import { useState } from 'react'

export default function BaseballLogger() {
  const [battingOrder, setBattingOrder] = useState(Array(9).fill(''))
  const [pitcher, setPitcher] = useState('')
  const [isLineupLocked, setIsLineupLocked] = useState(false)
  const [atBats, setAtBats] = useState([])
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0)
  const [result, setResult] = useState('')

  const handleLockLineup = () => {
    if (battingOrder.some(name => name.trim() === '') || pitcher.trim() === '') {
      alert('請輸入完整的先發打序與投手')
      return
    }
    setIsLineupLocked(true)
  }

  const handleRecordAtBat = () => {
    if (!result) return

    const batter = battingOrder[currentBatterIndex]
    const newEntry = {
      batter,
      result,
      pitcher,
      atBatNumber: atBats.length + 1,
    }

    setAtBats([...atBats, newEntry])
    setCurrentBatterIndex((currentBatterIndex + 1) % battingOrder.length)
    setResult('')
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">棒球逐打席紀錄</h1>

      {!isLineupLocked && (
        <div>
          <h2 className="font-semibold">先發打序</h2>
          {battingOrder.map((name, idx) => (
            <input
              key={idx}
              type="text"
              className="border p-1 my-1 w-full"
              placeholder={`第 ${idx + 1} 棒`}
              value={name}
              onChange={(e) => {
                const copy = [...battingOrder]
                copy[idx] = e.target.value
                setBattingOrder(copy)
              }}
            />
          ))}

          <h2 className="font-semibold mt-4">投手</h2>
          <input
            type="text"
            className="border p-1 w-full"
            value={pitcher}
            onChange={(e) => setPitcher(e.target.value)}
            placeholder="投手名稱"
          />

          <button className="bg-blue-500 text-white px-4 py-2 mt-4 rounded" onClick={handleLockLineup}>
            確認打序與投手
          </button>
        </div>
      )}

      {isLineupLocked && (
        <div>
          <h2 className="mt-4 font-semibold">目前打者：{battingOrder[currentBatterIndex]}</h2>
          <input
            type="text"
            className="border p-1 w-full mt-2"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="打席結果（如：安打、三振、四壞）"
          />
          <button className="bg-green-600 text-white px-4 py-2 mt-2 rounded" onClick={handleRecordAtBat}>
            紀錄打席
          </button>

          <h3 className="mt-6 font-bold">紀錄結果：</h3>
          <ul className="list-disc pl-6">
            {atBats.map((entry, idx) => (
              <li key={idx}>
                第 {entry.atBatNumber} 打席 - {entry.batter} 對 {entry.pitcher}：{entry.result}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
