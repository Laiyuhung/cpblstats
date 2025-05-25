// /app/api/scoreboard/[gameid]/route.js

import { NextResponse } from 'next/server'
import supabase from '@/lib/supabase'

// 讀取記分板
export async function GET(req, context) {
  console.log('➡️ 進入 GET /api/scoreboard/[gameid]', context?.params);
  const gameId = context?.params?.gameid;
  if (!gameId) {
    return NextResponse.json({ error: '缺少 gameid' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('game_scoreboards_for_stats')
    .select('*')
    .eq('game_no', gameId)
    .order('team_type', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}


// 更新記分板
export async function PUT(req, { params }) {
  const gameId = params.gameid
  const body = await req.json() // 包含 team_type, score_1 ~ score_15, R, H, E

  if (!['home', 'away'].includes(body.team_type)) {
    return NextResponse.json({ error: 'team_type 必須為 home 或 away' }, { status: 400 })
  }

  const { error } = await supabase
    .from('game_scoreboards_for_stats')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('game_no', gameId)
    .eq('team_type', body.team_type)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: '✅ 記分板已更新' })
}

// 建立記分板（如果該隊尚未建立）
export async function POST(req, { params }) {
  const gameId = params.gameid
  const body = await req.json() // 包含 team_type 與 team_name

  if (!['home', 'away'].includes(body.team_type)) {
    return NextResponse.json({ error: 'team_type 必須為 home 或 away' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('game_scoreboards_for_stats')
    .select('*')
    .eq('game_no', gameId)
    .eq('team_type', body.team_type)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ message: '已存在，不重複建立' })
  }

  const { error } = await supabase.from('game_scoreboards_for_stats').insert({
    game_no: gameId,
    team_type: body.team_type,
    team_name: body.team_name,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: '✅ 記分板已建立' })
}
