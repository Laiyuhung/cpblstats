'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupLineup() {
  const router = useRouter()
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState('')
  const [homeBatters, setHomeBatters] = useState(Array(9).fill({ name: '', position: '' }))
  const [awayBatters, setAwayBatters] = useState(Array(9).fill({ name: '', position: '' }))
  const [homePitcher, setHomePitcher] = useState('')
  const [awayPitcher, setAwayPitcher] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [registeredTeams, setRegisteredTeams] = useState({ home: false, away: false })
  const [editingPlayer, setEditingPlayer] = useState({ team: null, index: null })
  const [isLoading, setIsLoading] = useState(false)
  const [lineupComplete, setLineupComplete] = useState(false)

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        console.log('📦 賽程資料:', data)
        setGames(data)
      })
  }, [])

  useEffect(() => {
    if (lineupComplete && selectedGame) {
      router.push(`/gameRecord/${selectedGame}`)
    }
  }, [lineupComplete, selectedGame])


  useEffect(() => {
    const game = games.find(g => g.game_no === Number(selectedGame));
    if (game) {
      setIsLoading(true) // 加這行
      setHomeTeam(game.home)
      setAwayTeam(game.away)

      fetch(`/api/check-lineup?game_id=${game.game_no}`)
        .then(res => res.json())
        .then(data => {
          const homeRegistered = data.battingOrders.some(order => order.team === game.home)
          const awayRegistered = data.battingOrders.some(order => order.team === game.away)
          setRegisteredTeams({ home: homeRegistered, away: awayRegistered })

          // 檢查兩隊是否都已完成登錄，且皆有9人打序和投手
          const homeComplete = homeRegistered && 
            data.battingOrders.filter(order => order.team === game.home).length === 9 && 
            data.startingPitchers.some(p => p.team === game.home);
          
          const awayComplete = awayRegistered && 
            data.battingOrders.filter(order => order.team === game.away).length === 9 && 
            data.startingPitchers.some(p => p.team === game.away);
          
          setLineupComplete(homeComplete && awayComplete);

          const homeBattersData = data.battingOrders
            .filter(order => order.team === game.home)
            .sort((a, b) => a.batter_order - b.batter_order)
            .map(order => ({ name: order.batter_name, position: order.position }))

          const awayBattersData = data.battingOrders
            .filter(order => order.team === game.away)
            .sort((a, b) => a.batter_order - b.batter_order)
            .map(order => ({ name: order.batter_name, position: order.position }))

          setHomeBatters(homeBattersData.length ? homeBattersData : Array(9).fill({ name: '', position: '' }))
          setAwayBatters(awayBattersData.length ? awayBattersData : Array(9).fill({ name: '', position: '' }))

          const homePitcherData = data.startingPitchers.find(p => p.team === game.home)
          const awayPitcherData = data.startingPitchers.find(p => p.team === game.away)

          setHomePitcher(homePitcherData ? homePitcherData.pitcher_name : '')
          setAwayPitcher(awayPitcherData ? awayPitcherData.pitcher_name : '')
        })
        .finally(() => setIsLoading(false)) // ✅ 最後關掉 loading
    }
  }, [selectedGame, games])

  const handleEditClick = (team, index, isPitcher = false) => {
    if (isPitcher) {
      setEditingPlayer({ team, index: 'pitcher' })
    } else {
      setEditingPlayer({ team, index })
    }
  }

  const handleInputChange = (team, index, field, value) => {
    if (team === 'home') {
      const copy = [...homeBatters]
      copy[index] = { ...copy[index], [field]: value }
      setHomeBatters(copy)
    } else if (team === 'away') {
      const copy = [...awayBatters]
      copy[index] = { ...copy[index], [field]: value }
      setAwayBatters(copy)
    }
  }

  const isCellEditable = (team, index) => {
    const isRegistered = registeredTeams[team]
    if (!isRegistered) return true
    return editingPlayer.team === team && editingPlayer.index === index
  }

  const isPitcherEditable = (team) => {
    const isRegistered = registeredTeams[team]
    if (!isRegistered) return true
    return editingPlayer.team === team && editingPlayer.index === 'pitcher'
  }

  const handleSubmit = async () => {
    if (!selectedGame) {
      alert('請選擇比賽')
      return
    }

    const batting_orders = []
    if (awayBatters.some(b => b.name && b.position)) {
      batting_orders.push(...awayBatters
        .filter(b => b.name && b.position)
        .map((b, i) => ({ team: awayTeam, batter_order: i + 1, batter_name: b.name, position: b.position })))
    }
    if (homeBatters.some(b => b.name && b.position)) {
      batting_orders.push(...homeBatters
        .filter(b => b.name && b.position)
        .map((b, i) => ({ team: homeTeam, batter_order: i + 1, batter_name: b.name, position: b.position })))
    }

    const starting_pitchers = []
    if (awayPitcher) starting_pitchers.push({ team: awayTeam, pitcher_name: awayPitcher })
    if (homePitcher) starting_pitchers.push({ team: homeTeam, pitcher_name: homePitcher })

    if (batting_orders.length === 0 || starting_pitchers.length === 0) {
      alert('請至少輸入一方完整的打序與投手')
      return
    }

    const res = await fetch('/api/setup-lineup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: selectedGame, batting_orders, starting_pitchers })
    })

    const result = await res.json()
    alert(result.message || '完成')
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">賽前登錄先發名單</h1>

      <label className="block font-semibold mb-2">選擇比賽</label>
      <select className="border p-2 w-full mb-4" value={selectedGame} onChange={e => setSelectedGame(e.target.value)}>
        <option value="">-- 請選擇 --</option>
        {games.map(game => (
          <option key={game.game_no} value={game.game_no}>
            {game.date} - {game.away} @ {game.home}
          </option>
        ))}
      </select>
      
      
        {selectedGame && (
          isLoading ? (
            <p className="text-center text-gray-600">載入中...</p>
          ) : (
            <>
              <div className="mb-4">
                <p>登錄狀態：</p>
                <p>{registeredTeams.away ? `${awayTeam} 已登錄` : `${awayTeam} 未登錄`}</p>
                <p>{registeredTeams.home ? `${homeTeam} 已登錄` : `${homeTeam} 未登錄`}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h2 className="font-semibold">{awayTeam || '客隊'}打序</h2>
                  {awayBatters.map((batter, idx) => (
                    <div key={idx} className="flex gap-2 mb-1 items-center">
                      <span className="font-bold text-red-500">{idx + 1}</span>
                      {isCellEditable('away', idx) ? (
                        <>
                          <input
                            className="border p-1 w-1/2"
                            placeholder="守位"
                            value={batter.position}
                            onChange={e => handleInputChange('away', idx, 'position', e.target.value)}
                          />
                          <input
                            className="border p-1 w-1/2"
                            placeholder={`第 ${idx + 1} 棒選手`}
                            value={batter.name}
                            onChange={e => handleInputChange('away', idx, 'name', e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <span className="w-1/2">{batter.position || '未設定'}</span>
                          <span className="w-1/2">{batter.name || '未設定'}</span>
                        </>
                      )}
                      {registeredTeams.away && (batter.name || batter.position) && (
                        <button
                          className="ml-2 text-blue-500"
                          onClick={() => handleEditClick('away', idx)}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 items-center mt-2">
                    <span className="font-bold text-red-500">P</span>
                    {isPitcherEditable('away') ? (
                      <input
                        value={awayPitcher}
                        onChange={e => setAwayPitcher(e.target.value)}
                        className="border p-1 w-full"
                        placeholder="客隊先發投手"
                      />
                    ) : (
                      <span className="w-full">{awayPitcher || '未設定'}</span>
                    )}
                    {registeredTeams.away && awayPitcher && (
                      <button
                        className="ml-2 text-blue-500"
                        onClick={() => handleEditClick('away', null, true)}
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="font-semibold">{homeTeam || '主隊'}打序</h2>
                  {homeBatters.map((batter, idx) => (
                    <div key={idx} className="flex gap-2 mb-1 items-center">
                      <span className="font-bold text-red-500">{idx + 1}</span>
                      {isCellEditable('home', idx) ? (
                        <>
                          <input
                            className="border p-1 w-1/2"
                            placeholder="守位"
                            value={batter.position}
                            onChange={e => handleInputChange('home', idx, 'position', e.target.value)}
                          />
                          <input
                            className="border p-1 w-1/2"
                            placeholder={`第 ${idx + 1} 棒選手`}
                            value={batter.name}
                            onChange={e => handleInputChange('home', idx, 'name', e.target.value)}
                          />
                        </>
                      ) : (
                        <>
                          <span className="w-1/2">{batter.position || '未設定'}</span>
                          <span className="w-1/2">{batter.name || '未設定'}</span>
                        </>
                      )}
                      {registeredTeams.home && (batter.name || batter.position) && (
                        <button
                          className="ml-2 text-blue-500"
                          onClick={() => handleEditClick('home', idx)}
                        >
                          ✏️
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 items-center mt-2">
                    <span className="font-bold text-red-500">P</span>
                    {isPitcherEditable('home') ? (
                      <input
                        value={homePitcher}
                        onChange={e => setHomePitcher(e.target.value)}
                        className="border p-1 w-full"
                        placeholder="主隊先發投手"
                      />
                    ) : (
                      <span className="w-full">{homePitcher || '未設定'}</span>
                    )}
                    {registeredTeams.home && homePitcher && (
                      <button
                        className="ml-2 text-blue-500"
                        onClick={() => handleEditClick('home', null, true)}
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
                onClick={handleSubmit}
              >
                提交
              </button>

              {/* {lineupComplete && (
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded mt-4 ml-4"
                  onClick={() => router.push(`/gameRecord/${selectedGame}`)}
                >
                  開始記錄比賽
                </button>
              )} */}
            </>
          )
        )}

      </div>
    

  )
}