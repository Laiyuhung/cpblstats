'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function GameRecord({ params }) {
  const router = useRouter()
  const { gameId } = params
  const [game, setGame] = useState(null)
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [homeBatters, setHomeBatters] = useState([])
  const [awayBatters, setAwayBatters] = useState([])
  const [homePitcher, setHomePitcher] = useState('')
  const [awayPitcher, setAwayPitcher] = useState('')
  const [inning, setInning] = useState(1)
  const [halfInning, setHalfInning] = useState('top') // top or bottom
  const [currentBatter, setCurrentBatter] = useState(null)
  const [currentPitcher, setCurrentPitcher] = useState(null)
  const [atBatCount, setAtBatCount] = useState(1)
  const [outs, setOuts] = useState(0)
  const [bases, setBases] = useState({ first: false, second: false, third: false })
  const [isLoading, setIsLoading] = useState(true)
  const [sequence, setSequence] = useState(1)

  const resultOptions = [
    { value: 'IH', label: '內野安打' },
    { value: '1B', label: '一壘安打' },
    { value: '2B', label: '二壘安打' },
    { value: '3B', label: '三壘安打' },
    { value: 'HR', label: '全壘打' },
    { value: 'BB', label: '四壞球' },
    { value: 'IBB', label: '故意四壞' },
    { value: 'HBP', label: '觸身球' },
    { value: 'SF', label: '高飛犧牲打' },
    { value: 'SAC', label: '犧牲短打' },
    { value: 'FC', label: '野手選擇' },
    { value: 'F', label: '飛球出局' },
    { value: 'FO', label: '界外飛球出局' },
    { value: 'G', label: '滾地球出局' },
    { value: 'DP', label: '雙殺' },
    { value: 'TP', label: '三殺' },
    { value: 'K', label: '三振' },
    { value: 'E', label: '失誤' },
    { value: 'INT-O', label: '妨礙守備' },
    { value: 'INT-D', label: '妨礙打擊' },
  ]

  useEffect(() => {
    if (!gameId) return
    
    // 加載比賽資訊與先發名單
    setIsLoading(true)
    fetch(`/api/check-lineup?game_id=${gameId}`)
      .then(res => res.json())
      .then(data => {
        // 取得比賽基本資訊
        fetch(`/api/games?game_id=${gameId}`)
          .then(res => res.json())
          .then(gameData => {
            if (gameData && gameData.length > 0) {
              const currentGame = gameData[0]
              setGame(currentGame)
              setHomeTeam(currentGame.home)
              setAwayTeam(currentGame.away)
              
              // 解析打序
              const homeBattersData = data.battingOrders
                .filter(order => order.team === currentGame.home)
                .sort((a, b) => a.batter_order - b.batter_order)
                .map(order => ({ 
                  name: order.batter_name, 
                  position: order.position,
                  order: order.batter_order
                }))

              const awayBattersData = data.battingOrders
                .filter(order => order.team === currentGame.away)
                .sort((a, b) => a.batter_order - b.batter_order)
                .map(order => ({ 
                  name: order.batter_name, 
                  position: order.position,
                  order: order.batter_order
                }))

              setHomeBatters(homeBattersData)
              setAwayBatters(awayBattersData)

              // 設定投手
              const homePitcherData = data.startingPitchers.find(p => p.team === currentGame.home)
              const awayPitcherData = data.startingPitchers.find(p => p.team === currentGame.away)
              setHomePitcher(homePitcherData ? homePitcherData.pitcher_name : '')
              setAwayPitcher(awayPitcherData ? awayPitcherData.pitcher_name : '')

              // 初始化第一棒打者與投手
              setCurrentBatter(awayBattersData[0])
              setCurrentPitcher(homePitcherData ? homePitcherData.pitcher_name : '')
            }
          })
          .finally(() => setIsLoading(false))
      })
      .catch(err => {
        console.error('載入資料失敗:', err)
        setIsLoading(false)
      })
  }, [gameId])

  const getBaseCondition = () => {
    const { first, second, third } = bases
    if (!first && !second && !third) return '無人'
    return `${first ? '一' : ''}${second ? '二' : ''}${third ? '三' : ''}`
  }

  const handleRecordAtBat = async (result, rbis = 0) => {
    if (!currentBatter || !currentPitcher) return

    const atBatData = {
      game_no: Number(gameId),
      batter_name: currentBatter.name,
      pitcher_name: currentPitcher,
      inning,
      half_inning: halfInning === 'top' ? '上' : '下',
      result,
      at_bat: atBatCount,
      rbis,
      sequence,
      base_condition: getBaseCondition(),
      out_condition: outs
    }

    try {
      const res = await fetch('/api/record-at-bat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atBatData)
      })

      if (!res.ok) {
        throw new Error('記錄打席失敗')
      }

      // 更新計數
      setSequence(seq => seq + 1)
      setAtBatCount(count => count + 1)

      // 更新壘包狀態、出局數、換邊等邏輯
      updateGameState(result, rbis)
    } catch (error) {
      console.error('記錄失敗:', error)
      alert('記錄打席時發生錯誤')
    }
  }

  // 根據打擊結果更新比賽狀態
  const updateGameState = (result, rbis) => {
    // 處理出局數變化
    let newOuts = outs
    if (['K', 'F', 'FO', 'G', 'SF'].includes(result)) {
      newOuts += 1
    } else if (result === 'DP') {
      newOuts += 2
    }

    // 處理壘包狀態變化
    let newBases = { ...bases }
    if (['1B', 'BB', 'IBB', 'HBP', 'E'].includes(result)) {
      // 一壘安打或四壞球：跑者前進一個壘包，打者上一壘
      if (newBases.third) newBases.third = false // 三壘跑者回本壘得分
      if (newBases.second) {
        newBases.third = true
        newBases.second = false
      }
      if (newBases.first) {
        newBases.second = true
      }
      newBases.first = true
    } else if (result === '2B') {
      // 二壘安打：跑者前進兩個壘包，打者上二壘
      if (newBases.third || newBases.second) {
        // 二三壘跑者回本壘得分
        newBases.third = false
        newBases.second = false
      }
      if (newBases.first) {
        newBases.third = true
        newBases.first = false
      }
      newBases.second = true
    } else if (result === '3B') {
      // 三壘安打：所有跑者回本壘得分，打者上三壘
      newBases = { first: false, second: false, third: true }
    } else if (result === 'HR') {
      // 全壘打：所有跑者和打者都回本壘得分
      newBases = { first: false, second: false, third: false }
    }

    // 更新狀態
    setOuts(newOuts)
    setBases(newBases)

    // 檢查是否需要換邊
    if (newOuts >= 3) {
      // 換邊，重置出局數和壘包
      setOuts(0)
      setBases({ first: false, second: false, third: false })

      if (halfInning === 'top') {
        // 上半局結束，換下半局
        setHalfInning('bottom')
        // 設定新的打者和投手
        setCurrentBatter(homeBatters[0])
        setCurrentPitcher(awayPitcher)
      } else {
        // 下半局結束，換上半局，局數+1
        setHalfInning('top')
        setInning(inning + 1)
        // 設定新的打者和投手
        setCurrentBatter(awayBatters[0])
        setCurrentPitcher(homePitcher)
      }
    } else {
      // 同一半局，換下一位打者
      const currentTeamBatters = halfInning === 'top' ? awayBatters : homeBatters
      const currentBatterIndex = currentTeamBatters.findIndex(b => b.name === currentBatter.name)
      const nextBatterIndex = (currentBatterIndex + 1) % 9 // 循環到第9棒後回到第1棒
      setCurrentBatter(currentTeamBatters[nextBatterIndex])
    }
  }

  if (isLoading) {
    return <div className="max-w-2xl mx-auto p-4 text-center">載入比賽資料中...</div>
  }

  if (!game) {
    return <div className="max-w-2xl mx-auto p-4 text-center">找不到比賽資料</div>
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">比賽記錄</h1>
      
      <div className="bg-gray-100 p-4 rounded-lg mb-6">
        <div className="text-xl font-bold mb-2">
          {game.date} - {awayTeam} @ {homeTeam}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="font-semibold">{awayTeam} 打序</h3>
            {awayBatters.map((batter, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <span className="font-bold text-red-500">{batter.order}</span>
                <span className="w-1/3">{batter.position}</span>
                <span className="w-2/3">{batter.name}</span>
              </div>
            ))}
            <div className="mt-2">
              <span className="font-bold text-red-500">P</span>
              <span className="ml-2">{awayPitcher}</span>
            </div>
          </div>
          <div>
            <h3 className="font-semibold">{homeTeam} 打序</h3>
            {homeBatters.map((batter, idx) => (
              <div key={idx} className="flex gap-2 mb-1">
                <span className="font-bold text-red-500">{batter.order}</span>
                <span className="w-1/3">{batter.position}</span>
                <span className="w-2/3">{batter.name}</span>
              </div>
            ))}
            <div className="mt-2">
              <span className="font-bold text-red-500">P</span>
              <span className="ml-2">{homePitcher}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-2">目前狀況</h2>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="font-semibold">第 {inning} 局 {halfInning === 'top' ? '上' : '下'}</p>
            <p>出局數: {outs}</p>
            <p>壘包: {bases.first ? '一' : ''}{bases.second ? '二' : ''}{bases.third ? '三' : ''}壘 {!bases.first && !bases.second && !bases.third && '無人'}</p>
          </div>
          <div>
            <p className="font-semibold">目前打者: {currentBatter?.name || '未設定'}</p>
            <p>打序位置: {currentBatter?.order || '-'}</p>
            <p>守備位置: {currentBatter?.position || '-'}</p>
            <p>投手: {currentPitcher || '未設定'}</p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-bold mb-4">記錄打席結果</h2>
        
        <div className="grid grid-cols-3 gap-2 mb-4">
          {resultOptions.map(option => (
            <button
              key={option.value}
              className="bg-white border border-gray-300 p-2 rounded hover:bg-gray-100"
              onClick={() => handleRecordAtBat(option.value, 0)}
            >
              {option.label} ({option.value})
            </button>
          ))}
        </div>
        
        <div className="mt-4">
          <h3 className="font-semibold mb-2">打點 (RBI)</h3>
          <div className="flex gap-2">
            {[0, 1, 2, 3, 4].map(rbi => (
              <button
                key={rbi}
                className="bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-100"
                onClick={() => {
                  const result = prompt('請輸入打擊結果代碼 (1B, 2B, 3B, HR, SF 等)');
                  if (result) handleRecordAtBat(result, rbi);
                }}
              >
                {rbi}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <button
        className="bg-red-600 text-white px-4 py-2 rounded"
        onClick={() => router.push('/gameLog')}
      >
        返回
      </button>
    </div>
  )
}
