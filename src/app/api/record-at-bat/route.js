import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const atBatData = await req.json()

    // 只檢查最基本欄位
    if (!atBatData.game_no || !atBatData.result || !atBatData.inning || !atBatData.half_inning) {
      return NextResponse.json({ error: '參數不完整' }, { status: 400 })
    }

    // 允許 batter_name、at_bat、pitcher_name 等為 null
    const gameResult = {
      game_no: atBatData.game_no,
      batter_name: atBatData.batter_name || null,
      inning: atBatData.inning,
      half_inning: atBatData.half_inning,
      result: atBatData.result,
      at_bat: atBatData.at_bat ?? null,
      rbis: atBatData.rbis ?? 0,
      sequence: atBatData.sequence ?? 1,
      pitcher_name: atBatData.pitcher_name || null,
      base_condition: atBatData.base_condition || null,
      out_condition: atBatData.out_condition ?? null
    }

    const { error } = await supabase
      .from('game_results_for_stats')
      .insert(gameResult)

    if (error) {
      console.error('❌ 記錄打席失敗:', error.message)
      return NextResponse.json({ error: '打席記錄寫入失敗' }, { status: 500 })
    }

    return NextResponse.json({ message: '記錄成功' })
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
