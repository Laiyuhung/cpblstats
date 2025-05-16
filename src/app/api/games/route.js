// /app/api/games/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url)
    const gameId = searchParams.get('game_id')

    let query = supabase
      .from('cpbl_schedule')
      .select('game_no, date, home, away')
      .order('date', { ascending: true })

    if (gameId) {
      query = query.eq('game_no', gameId)
    }

    const { data, error } = await query

    if (error) {
      console.error('❌ 無法取得賽程:', error.message)
      return NextResponse.json({ error: '無法取得賽程' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
