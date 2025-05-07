import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const { game_id, batting_orders, starting_pitchers } = await req.json()

    if (!game_id || !batting_orders?.length || !starting_pitchers?.length) {
      return NextResponse.json({ error: '參數不完整' }, { status: 400 })
    }

    const battingRows = batting_orders.map(order => ({
      game_id,
      batter_order: order.batter_order,
      batter_name: order.batter_name,
      position: order.position,  // 🟢 指的是守備位置，如 "SS", "2B"
      team: order.team           // 🟢 A 或 B，表示是主隊或客隊
    }))

    const { error: insertBattingError } = await supabase
      .from('batting_orders_for_stats')
      .insert(battingRows)

    if (insertBattingError) {
      console.error('❌ 插入打序失敗:', insertBattingError.message)
      return NextResponse.json({ error: '打序寫入失敗' }, { status: 500 })
    }

    const pitcherRows = starting_pitchers.map(p => ({
      game_id,
      pitcher_name: p.pitcher_name,
      team: p.team
    }))

    const { error: insertPitcherError } = await supabase
      .from('starting_pitchers_for_stats')
      .insert(pitcherRows)

    if (insertPitcherError) {
      console.error('❌ 插入投手失敗:', insertPitcherError.message)
      return NextResponse.json({ error: '投手寫入失敗' }, { status: 500 })
    }

    return NextResponse.json({ message: '登錄成功' })
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
