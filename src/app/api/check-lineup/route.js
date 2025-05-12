import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const game_id = searchParams.get('game_id');

    if (!game_id) {
      return NextResponse.json({ error: '缺少 game_id 參數' }, { status: 400 });
    }

    const { data: battingOrders, error: battingError } = await supabase
      .from('batting_orders_for_stats')
      .select('*')
      .eq('game_id', game_id);

    const { data: startingPitchers, error: pitchersError } = await supabase
      .from('starting_pitchers_for_stats')
      .select('*')
      .eq('game_id', game_id);

    if (battingError || pitchersError) {
      console.error('❌ 查詢失敗:', battingError || pitchersError);
      return NextResponse.json({ error: '查詢失敗' }, { status: 500 });
    }

    return NextResponse.json({
      battingOrders,
      startingPitchers,
    });
  } catch (err) {
    console.error('❌ 發生錯誤:', err);
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
