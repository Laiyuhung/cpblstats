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
    }))    // 檢查每隊是否已經存在打序
    const teamsToCheck = [...new Set(batting_orders.map(order => order.team))];
    
    for (const team of teamsToCheck) {
      const teamBattingRows = battingRows.filter(row => row.team === team);
      
      const { data: existingTeamBatters, error: fetchTeamError } = await supabase
        .from('batting_orders_for_stats')
        .select('*')
        .eq('game_id', game_id)
        .eq('team', team);
      
      if (fetchTeamError) {
        console.error(`❌ 查詢 ${team} 打序失敗:`, fetchTeamError.message);
        return NextResponse.json({ error: `查詢 ${team} 打序失敗` }, { status: 500 });
      }
        if (existingTeamBatters && existingTeamBatters.length > 0) {
        console.log(`🔄 ${team} 隊已有打序記錄，先刪除再新增`);
        // 該隊已有記錄，先刪除舊記錄
        const { error: deleteError } = await supabase
          .from('batting_orders_for_stats')
          .delete()
          .eq('game_id', game_id)
          .eq('team', team);
        
        if (deleteError) {
          console.error(`❌ 刪除 ${team} 打序失敗:`, deleteError.message);
          return NextResponse.json({ error: `${team} 打序刪除失敗` }, { status: 500 });
        }
        
        // 然後插入新記錄
        const { error: insertError } = await supabase
          .from('batting_orders_for_stats')
          .insert(teamBattingRows);
        
        if (insertError) {
          console.error(`❌ 更新 ${team} 打序失敗:`, insertError.message);
          return NextResponse.json({ error: `${team} 打序更新失敗` }, { status: 500 });
        }
      } else {
        console.log(`➕ 新增 ${team} 隊打序記錄`);
        // 該隊無記錄，進行插入
        const { error: insertError } = await supabase
          .from('batting_orders_for_stats')
          .insert(teamBattingRows);
        
        if (insertError) {
          console.error(`❌ 插入 ${team} 打序失敗:`, insertError.message);
          return NextResponse.json({ error: `${team} 打序寫入失敗` }, { status: 500 });
        }
      }
    }    // 檢查每隊是否已經存在先發投手
    for (const pitcher of starting_pitchers) {
      const pitcherRow = {
        game_id,
        pitcher_name: pitcher.pitcher_name,
        team: pitcher.team
      };
      
      const { data: existingPitcher, error: fetchPitcherError } = await supabase
        .from('starting_pitchers_for_stats')
        .select('*')
        .eq('game_id', game_id)
        .eq('team', pitcher.team);
      
      if (fetchPitcherError) {
        console.error(`❌ 查詢 ${pitcher.team} 投手失敗:`, fetchPitcherError.message);
        return NextResponse.json({ error: `查詢 ${pitcher.team} 投手失敗` }, { status: 500 });
      }
        if (existingPitcher && existingPitcher.length > 0) {
        console.log(`🔄 更新 ${pitcher.team} 隊先發投手: ${pitcher.pitcher_name}`);
        // 該隊已有記錄，先刪除舊記錄
        const { error: deleteError } = await supabase
          .from('starting_pitchers_for_stats')
          .delete()
          .eq('game_id', game_id)
          .eq('team', pitcher.team);
        
        if (deleteError) {
          console.error(`❌ 刪除 ${pitcher.team} 投手失敗:`, deleteError.message);
          return NextResponse.json({ error: `${pitcher.team} 投手刪除失敗` }, { status: 500 });
        }
        
        // 然後插入新記錄
        const { error: insertError } = await supabase
          .from('starting_pitchers_for_stats')
          .insert(pitcherRow);
        
        if (insertError) {
          console.error(`❌ 更新 ${pitcher.team} 投手失敗:`, insertError.message);
          return NextResponse.json({ error: `${pitcher.team} 投手更新失敗` }, { status: 500 });
        }
      } else {
        console.log(`➕ 新增 ${pitcher.team} 隊先發投手: ${pitcher.pitcher_name}`);
        // 該隊無記錄，進行插入
        const { error: insertError } = await supabase
          .from('starting_pitchers_for_stats')
          .insert(pitcherRow);
        
        if (insertError) {
          console.error(`❌ 插入 ${pitcher.team} 投手失敗:`, insertError.message);
          return NextResponse.json({ error: `${pitcher.team} 投手寫入失敗` }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ message: '登錄成功' })
  } catch (err) {
    console.error('❌ 發生錯誤:', err)
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 })
  }
}
