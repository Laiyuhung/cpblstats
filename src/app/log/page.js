'use client'

import { useEffect, useState } from 'react'

export default function SetupLineup() {
  const [games, setGames] = useState([])
  const [selectedGame, setSelectedGame] = useState('')
  const [homeBatters, setHomeBatters] = useState(Array(9).fill({ name: '', position: '' }))
  const [awayBatters, setAwayBatters] = useState(Array(9).fill({ name: '', position: '' }))
  const [homePitcher, setHomePitcher] = useState('')
  const [awayPitcher, setAwayPitcher] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')

  useEffect(() => {
    fetch('/api/games')
      .then(res => res.json())
      .then(data => {
        console.log('📦 賽程資料:', data)
        setGames(data)
      })
  }, [])

  useEffect(() => {
    const game = games.find(g => g.game_no === selectedGame)
    if (game) {
      setHomeTeam(game.home)
      setAwayTeam(game.away)
    }
  }, [selectedGame, games])

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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h2 className="font-semibold">{awayTeam || '客隊'}打序</h2>
          {awayBatters.map((batter, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <input
                className="border p-1 w-1/2"
                placeholder="守位"
                value={batter.position}
                onChange={e => {
                  const copy = [...awayBatters]
                  copy[idx] = { ...copy[idx], position: e.target.value }
                  setAwayBatters(copy)
                }}
              />
              <input
                className="border p-1 w-1/2"
                placeholder={`第 ${idx + 1} 棒選手`}
                value={batter.name}
                onChange={e => {
                  const copy = [...awayBatters]
                  copy[idx] = { ...copy[idx], name: e.target.value }
                  setAwayBatters(copy)
                }}
              />
            </div>
          ))}
          <input value={awayPitcher} onChange={e => setAwayPitcher(e.target.value)} className="border p-1 w-full mt-2" placeholder="客隊先發投手" />
        </div>

        <div>
          <h2 className="font-semibold">{homeTeam || '主隊'}打序</h2>
          {homeBatters.map((batter, idx) => (
            <div key={idx} className="flex gap-2 mb-1">
              <input
                className="border p-1 w-1/2"
                placeholder="守位"
                value={batter.position}
                onChange={e => {
                  const copy = [...homeBatters]
                  copy[idx] = { ...copy[idx], position: e.target.value }
                  setHomeBatters(copy)
                }}
              />
              <input
                className="border p-1 w-1/2"
                placeholder={`第 ${idx + 1} 棒選手`}
                value={batter.name}
                onChange={e => {
                  const copy = [...homeBatters]
                  copy[idx] = { ...copy[idx], name: e.target.value }
                  setHomeBatters(copy)
                }}
              />
            </div>
          ))}
          <input value={homePitcher} onChange={e => setHomePitcher(e.target.value)} className="border p-1 w-full mt-2" placeholder="主隊先發投手" />
        </div>
      </div>

      <button className="bg-blue-600 text-white px-4 py-2 rounded mt-4" onClick={handleSubmit}>提交</button>
    </div>
  )
}
