import { NextResponse } from 'next/server'
import supabase from '@/lib/supabaseServer'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const gameId = searchParams.get('game_id')

    if (!gameId) {
      return NextResponse.json({ error: '缺少 game_id 參數' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('game_results_for_stats')
      .select('*')
      .eq('game_no', gameId)
      .order('sequence', { ascending: true })

    if (error) {
      console.error('❌ 查詢逐打席紀錄失敗:', error.message)
      return NextResponse.json({ error: '資料查詢失敗' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ 後端錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
