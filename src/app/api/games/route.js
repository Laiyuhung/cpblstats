// /app/api/games/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('cpbl_schedule')
      .select('game_no, date, home, away')
      .order('date', { ascending: true })

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
