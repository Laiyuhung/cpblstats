'use client'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'

export default function GameRecord({ params }) {
  const { gameId } = params
  const [game, setGame] = useState(null)
  const [homeBatters, setHomeBatters] = useState([])
  const [awayBatters, setAwayBatters] = useState([])
  const [homePitcher, setHomePitcher] = useState('')
  const [awayPitcher, setAwayPitcher] = useState('')
  const [inning, setInning] = useState(1)
  const [halfInning, setHalfInning] = useState('top') // top or bottom
  const [currentBatter, setCurrentBatter] = useState(null)
  const [currentPitcher, setCurrentPitcher] = useState(null)
  const [outs, setOuts] = useState(0)
  const [bases, setBases] = useState({ first: false, second: false, third: false })
  const [isLoading, setIsLoading] = useState(true)
  const [rbis, setRbis] = useState(0)
  const [playByPlay, setPlayByPlay] = useState([]) // 用於存放 Play-by-Play 記錄
  const [selectedResult, setSelectedResult] = useState('');


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

  const groupPlaysByInning = (plays) => {
    const groups = {};

    plays.forEach(play => {
      const label = `${play.inning}${play.half_inning === 'top' ? '上' : '下'}`;
      if (!groups[label]) groups[label] = [];
      groups[label].push(play);
    });

    return groups;
  };


  const getBaseCondition = () => {
    const { first, second, third } = bases
    if (!first && !second && !third) return '無人'
    return `${first ? '一' : ''}${second ? '二' : ''}${third ? '三' : ''}`
  }
  const handleRecordAtBat = async (result) => {
    if (!currentBatter || !currentPitcher) return

    // 計算 at_bat 為當前打者的打序
    const atBat = currentBatter?.order || 0

    // 計算 sequence 為歷史記錄的最大值加 1
    const newSequence = playByPlay.length > 0 ? Math.max(...playByPlay.map(play => play.sequence)) + 1 : 1

    const atBatData = {
      game_no: Number(gameId),
      batter_name: currentBatter.name,
      pitcher_name: currentPitcher,
      inning,
      half_inning: halfInning === 'top' ? 'top' : 'bottom',
      result,
      at_bat: atBat, // 使用打序表的打序
      rbis,
      sequence: newSequence, // 使用歷史記錄最大值加 1
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

      // 更新 Play-by-Play 記錄
      setPlayByPlay(prev => [...prev, atBatData])

      // 重置打點計數
      setRbis(0)

      // 更新壘包狀態、出局數、換邊等邏輯
      updateGameState(result)
      setSelectedResult('');

      // 重置回初始模式，設定下一打席的壘包狀態
      // setEditMode('state') // 已移除，不再需要
    } catch (error) {
      console.error('記錄失敗:', error)
      alert('記錄打席時發生錯誤')
    }
  }

  const handleRunnerOut = () => {
    const newOuts = outs + 1;

    setOuts(newOuts);

    if (newOuts >= 3) {
      // 換局：清空壘包與出局數
      setOuts(0);
      setBases({ first: false, second: false, third: false });

      if (halfInning === 'top') {
        setHalfInning('bottom');
        setCurrentBatter(homeBatters[0]);
        setCurrentPitcher(awayPitcher);
      } else {
        setHalfInning('top');
        setInning(prev => prev + 1);
        setCurrentBatter(awayBatters[0]);
        setCurrentPitcher(homePitcher);
      }
    }
  };


  // 根據打擊結果更新比賽狀態
  const updateGameState = (result) => {
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
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-2 gap-4">
      {/* 左側：紀錄區域 */}
      <div>
        <h1 className="text-2xl font-bold mb-4">比賽記錄</h1>

        <div className="bg-gray-100 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">目前狀況</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="font-semibold">{halfInning === 'top' ? 'Top' : 'Bot'} {inning} </p>
              <div className="flex items-center gap-2">
                <span>壘包:</span>
                <div className="relative w-16 h-16">
                  <div
                    className={`absolute top-0 left-1/2 transform -translate-x-1/2 rotate-45 w-4 h-4 border ${bases.second ? 'bg-yellow-500' : 'bg-gray-200'}`}
                    onClick={() => setBases(prev => ({ ...prev, second: !prev.second }))
                    }
                  ></div>
                  <div
                    className={`absolute top-1/2 right-0 transform -translate-y-1/2 rotate-45 w-4 h-4 border ${bases.first ? 'bg-yellow-500' : 'bg-gray-200'}`}
                    onClick={() => setBases(prev => ({ ...prev, first: !prev.first }))
                    }
                  ></div>
                  <div
                    className={`absolute top-1/2 left-0 transform -translate-y-1/2 rotate-45 w-4 h-4 border ${bases.third ? 'bg-yellow-500' : 'bg-gray-200'}`}
                    onClick={() => setBases(prev => ({ ...prev, third: !prev.third }))
                    }
                  ></div>
                </div>
                {/* <p className="text-xs text-gray-500">壘包狀態: {getBaseCondition()}</p> */}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span>出局數:</span>
                <div className="flex gap-1">
                  {[0, 1].map(o => (
                    <div
                      key={o}
                      className={`w-6 h-6 border rounded-full ${outs > o ? 'bg-red-500' : 'bg-gray-200'}`}
                      onClick={() => setOuts(o + 1)}
                    ></div>
                  ))}
                </div>
                <div className="mt-2">
                  <button
                    className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
                    onClick={handleRunnerOut}
                  >
                    壘間出局 +1
                  </button>
                </div>
                {/* <p className="text-xs text-gray-500">出局數: {outs}</p> */}
              </div>
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-lg">
                第 {currentBatter?.order || '-'} 棒 {currentBatter?.position?.toUpperCase() || '-'}  {currentBatter?.name || '未設定'}
              </p>
              <p className="text-gray-600">投手：{currentPitcher || '未設定'}</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <h2 className="text-xl font-bold mb-4">記錄打擊結果</h2>
          <div className="mb-4">
            <label htmlFor="result" className="block font-semibold mb-2">打擊結果</label>
            <select
              id="result"
              className="w-full border rounded p-2"
              value={selectedResult}
              onChange={e => setSelectedResult(e.target.value)}
            >
              <option value="">選擇結果</option>
              {resultOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="rbis" className="block font-semibold mb-2">打點 (RBI)</label>
            <select
              id="rbis"
              className="w-full border rounded p-2"
              onChange={e => setRbis(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4].map(rbi => (
                <option key={rbi} value={rbi}>{rbi}</option>
              ))}
            </select>
          </div>
          
          <button
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            onClick={() => handleRecordAtBat(selectedResult)}
            disabled={!selectedResult}
          >
            送出
          </button>
        </div>
      </div>

      {/* 右側：單場 log 區域 */}
      <div>
        <h2 className="text-xl font-bold mb-4">單場紀錄</h2>
        <ul className="space-y-2">
          <ul className="space-y-4">
            {Object.entries(groupPlaysByInning(playByPlay)).map(([inningLabel, plays]) => (
              <div key={inningLabel} className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold">{inningLabel}</h3>
                  <div className="h-px flex-1 bg-gray-300"></div>
                </div>
                <ul className="space-y-2">
                  {plays.map((play, index) => {
                    const base = play.base_condition || '';
                    const out = play.out_condition || 0;
                    const result = play.result;

                    const getResultColor = (type) => {
                      if (['K', 'SF', 'FO', 'F', 'G', 'FC', 'E', 'INT-O', 'DP', 'TP'].includes(type)) {
                        return 'bg-[#1E3A8A]'; // 深藍 - 出局類
                      }
                      if (['IH', '1B', '2B', '3B', 'HR'].includes(type)) {
                        return 'bg-[#DC2626]'; // 紅色 - 安打類
                      }
                      if (['BB', 'IBB', 'HBP', 'SAC', 'INT-D'].includes(type)) {
                        return 'bg-[#CA8A04]'; // 土黃 - 保送類
                      }
                      return 'bg-gray-600'; // 其他
                    };

                    return (
                      <li key={index} className="flex justify-between items-center gap-4">
                        {/* 左：打者與投手資訊 */}
                        <div className="w-1/3">
                          <p className="text-lg font-bold text-left">{play.batter_name}</p>
                          <p className="text-sm text-gray-600 text-left">投手：{play.pitcher_name}</p>
                        </div>

                        {/* 中：壘包與出局數 */}
                        <div className="w-1/3 flex flex-col items-center justify-center">
                          <div className="relative w-12 h-12 mb-2">
                            <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('二') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                            <div className={`absolute top-1/2 right-0 transform -translate-y-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('一') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                            <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('三') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                          </div>
                          <div className="flex gap-1">
                            {[0, 1].map(o => (
                              <div
                                key={o}
                                className={`w-3 h-3 border rounded-full ${out > o ? 'bg-red-500' : 'bg-gray-200'}`}
                              ></div>
                            ))}
                          </div>
                        </div>

                        {/* 右：打擊結果 */}
                        <div className="w-1/3 flex justify-start">
                          <div className={`${getResultColor(result)} px-3 py-1 rounded text-white text-sm font-bold`}>
                            {result}
                          </div>
                        </div>
                      </li>

                    );
                  })}
                </ul>
              </div>
            ))}

          </ul>

        </ul>
      </div>
    </div>
  )
}
