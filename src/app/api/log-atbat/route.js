// /app/api/log-atbat/route.js
import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

export async function POST(req) {
  try {
    const body = await req.json()
    const { batterName, result, order, inning, pitcherName } = body

    if (!batterName || !result || !order || !inning || !pitcherName) {
      return NextResponse.json({ error: '參數不足' }, { status: 400 })
    }

    const { error } = await supabase.from('atbat_logs').insert({
      batter_name: batterName,
      result,
      batting_order: order,
      inning,
      pitcher_name: pitcherName,
      timestamp: new Date().toISOString(),
    })

    if (error) throw error

    return NextResponse.json({ message: '打席紀錄成功' })
  } catch (err) {
    console.error('❌ 錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
