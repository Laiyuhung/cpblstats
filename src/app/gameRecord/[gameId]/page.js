'use client'

import { useState, useEffect } from 'react'
// import { useRouter } from 'next/navigation'

export default function GameRecord({ params }) {
  const { gameId } = params
  const [game, setGame] = useState(null)
  const [homeBatters, setHomeBatters] = useState([])
  const [awayBatters, setAwayBatters] = useState([])
  const [homePitcher, setHomePitcher] = useState('')
  const [awayPitcher, setAwayPitcher] = useState('')
  const [inning, setInning] = useState(1)
  const [halfInning, setHalfInning] = useState('top') // top or bottom
  const [currentBatter, setCurrentBatter] = useState(null)
  const [currentPitcher, setCurrentPitcher] = useState(null)
  const [outs, setOuts] = useState(0)
  const [bases, setBases] = useState({ first: false, second: false, third: false })
  const [isLoading, setIsLoading] = useState(true)
  const [rbis, setRbis] = useState(0)
  const [playByPlay, setPlayByPlay] = useState([]) // 用於存放 Play-by-Play 記錄
  const [selectedResult, setSelectedResult] = useState('');
  const [scoreboard, setScoreboard] = useState(null)
  const [homeCurrentBatterIndex, setHomeCurrentBatterIndex] = useState(0);
  const [awayCurrentBatterIndex, setAwayCurrentBatterIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('record'); // 'record' or 'lineup'
  const [showPitcherModal, setShowPitcherModal] = useState(false);
  const [showBatterModal, setShowBatterModal] = useState(false);
  const [newPitcher, setNewPitcher] = useState('');
  const [newBatter, setNewBatter] = useState('');
  const [subBatterOrder, setSubBatterOrder] = useState('');
  const [showDefenseModal, setShowDefenseModal] = useState(false);
  const [currentDefense, setCurrentDefense] = useState([]);


  const resultOptions = [
    { value: 'IH', label: '內野安打' },
    { value: '1B', label: '一壘安打' },
    { value: '2B', label: '二壘安打' },
    { value: '3B', label: '三壘安打' },
    { value: 'HR', label: '全壘打' },
    { value: 'BB', label: '四壞球' },
    { value: 'IBB', label: '故意四壞' },
    { value: 'HBP', label: '觸身球' },
    { value: 'SF', label: '高飛犧牲打' },
    { value: 'SAC', label: '犧牲短打' },
    { value: 'FC', label: '野手選擇' },
    { value: 'F', label: '飛球出局' },
    { value: 'FO', label: '界外飛球出局' },
    { value: 'G', label: '滾地球出局' },
    { value: 'DP', label: '雙殺' },
    { value: 'TP', label: '三殺' },
    { value: 'K', label: '三振' },
    { value: 'E', label: '失誤' },
    { value: 'INT-O', label: '妨礙守備' },
    { value: 'INT-D', label: '妨礙打擊' },
  ]

  useEffect(() => {
    if (!gameId) return

    // 嘗試讀取該場記分板
    fetch(`/api/scoreboard/${gameId}`)
      .then(res => res.json())
      .then(async (data) => {
        console.log('📋 初始記分板資料:', data);
        if (!data || data.length === 0) {
          console.log('⚠️ 記分板不存在，嘗試建立記分板');
          const gameRes = await fetch(`/api/games?game_id=${gameId}`);
          const gameData = await gameRes.json();
          console.log('📋 比賽資料:', gameData);
          const game = gameData[0];

          if (game) {
            await Promise.all([
              fetch(`/api/scoreboard/${gameId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_type: 'home', team_name: game.home })
              }),
              fetch(`/api/scoreboard/${gameId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_type: 'away', team_name: game.away })
              })
            ]);

            console.log('✅ 記分板建立完成，重新抓取資料');
            const reloadRes = await fetch(`/api/scoreboard/${gameId}`);
            const reloadData = await reloadRes.json();
            console.log('📋 重新載入的記分板資料:', reloadData);
            setScoreboard(reloadData);
          }
        } else {
          console.log('✅ 記分板已存在:', data);
          setScoreboard(data);
        }
      })
      .catch(err => {
        console.error('❌ 無法讀取或建立記分板:', err);
      })
  }, [gameId])

  // 重新計算棒次，每次 playByPlay 更新都執行（只同步棒次顯示，不動 bases/outs）
  useEffect(() => {
    // 只計算有 at_bat 值的 play
    const awayPlays = playByPlay.filter(p => p.half_inning === 'top' && p.at_bat != null);
    const homePlays = playByPlay.filter(p => p.half_inning === 'bottom' && p.at_bat != null);
    const awayIndex = awayBatters.length > 0 ? (awayPlays.length % awayBatters.length) : 0;
    const homeIndex = homeBatters.length > 0 ? (homePlays.length % homeBatters.length) : 0;
    console.log('[棒次計算] awayPlays.length:', awayPlays.length, 'awayBatters.length:', awayBatters.length, 'awayIndex:', awayIndex + 1);
    console.log('[棒次計算] homePlays.length:', homePlays.length, 'homeBatters.length:', homeBatters.length, 'homeIndex:', homeIndex + 1);
    setAwayCurrentBatterIndex(awayIndex);
    setHomeCurrentBatterIndex(homeIndex);
  }, [playByPlay, homeBatters, awayBatters]);

  // 僅在紀錄打席時自動推進壘位與出局數
  useEffect(() => {
    if (isLoading || playByPlay.length === 0 || homeBatters.length === 0 || awayBatters.length === 0 || !homePitcher || !awayPitcher) return;

    const awayPlays = playByPlay.filter(p => p.half_inning === 'top');
    const homePlays = playByPlay.filter(p => p.half_inning === 'bottom');
    const awayIndex = awayBatters.length > 0 ? (awayPlays.length % awayBatters.length) : 0;
    const homeIndex = homeBatters.length > 0 ? (homePlays.length % homeBatters.length) : 0;

    const latest = playByPlay[playByPlay.length - 1];
    if (!latest) return;

    // 1. 先根據 log 的 base_condition/out_condition 設定初始狀態
    const parseBaseCondition = (condition) => ({
      first: condition.includes('一'),
      second: condition.includes('二'),
      third: condition.includes('三'),
    });
    let basesState = parseBaseCondition(latest.base_condition || '');
    let outsState = latest.out_condition || 0;
    console.log('[推算前] base_condition:', latest.base_condition, 'basesState:', basesState, 'out_condition:', outsState);

    // 2. 根據 result 推進壘包與出局數
    const resultOutMap = {
      K: 1, F: 1, FO: 1, G: 1, SF: 1,
      DP: 2,
      TP: 3,
      runner_out: 1,
    };
    const outAdded = resultOutMap[latest.result] || 0;
    let outs = Math.min(outsState + outAdded, 3);
    console.log('[推算中] result:', latest.result, 'outAdded:', outAdded, 'outs:', outs);

    // 進階壘包推進（仿 handleRecordAtBat 的 predictBasesAfterPlay）
    const predictBasesAfterPlay = (result, bases) => {
      const { first, second, third } = bases;
      const newBases = { first: false, second: false, third: false };
      switch (result) {
        case '1B':
        case 'BB':
        case 'IBB':
        case 'HBP':
        case 'E':
          if (third) newBases.third = false;
          if (second) newBases.third = true;
          if (first) newBases.second = true;
          newBases.first = true;
          break;
        case '2B':
          if (third || second) {
            newBases.third = false;
            newBases.second = false;
          }
          if (first) {
            newBases.third = true;
          }
          newBases.second = true;
          break;
        case '3B':
          newBases.third = true;
          break;
        case 'HR':
          // 全壘打，壘包清空
          break;
        default:
          return bases;
      }
      return newBases;
    };
    const basesAfter = predictBasesAfterPlay(latest.result, basesState);
    console.log('[推算後] result:', latest.result, 'basesAfter:', basesAfter);
    basesState = basesAfter;

    // 3. 換局處理：如果出局數>=3，壘包清空、出局歸零，並切換局數與半局
    let inningState = latest.inning;
    let halfInningState = latest.half_inning;
    let pitcherState = latest.half_inning === 'top' ? homePitcher : awayPitcher;
    let batterState = latest.half_inning === 'top' ? awayBatters[awayIndex] : homeBatters[homeIndex];
    if (outs >= 3) {
      outs = 0;
      basesState = { first: false, second: false, third: false };
      // 切換半局與局數
      if (latest.half_inning === 'top') {
        halfInningState = 'bottom';
        pitcherState = awayPitcher;
        batterState = homeBatters[homeIndex];
      } else {
        halfInningState = 'top';
        inningState = latest.inning + 1;
        pitcherState = homePitcher;
        batterState = awayBatters[awayIndex];
      }
      console.log('[換局] outs>=3，壘包清空，切換為', inningState, halfInningState);
    }

    setOuts(outs);
    setBases(basesState);
    setInning(inningState);
    setHalfInning(halfInningState);
    setCurrentPitcher(pitcherState);
    setCurrentBatter(batterState);
  }, [isLoading, playByPlay, homeBatters, awayBatters, homePitcher, awayPitcher]);



  useEffect(() => {
    if (!gameId) return
    
    // 加載比賽資訊與先發名單
    setIsLoading(true)
    fetch(`/api/check-lineup?game_id=${gameId}`)
      .then(res => res.json())
      .then(data => {
        // 取得比賽基本資訊
        fetch(`/api/games?game_id=${gameId}`)
          .then(res => res.json())
          .then(gameData => {
            if (gameData && gameData.length > 0) {
              const currentGame = gameData[0]
              setGame(currentGame)
              
              // 解析打序
              const homeBattersData = data.battingOrders
                .filter(order => order.team === currentGame.home)
                .sort((a, b) => a.batter_order - b.batter_order)
                .map(order => ({ 
                  name: order.batter_name, 
                  position: order.position,
                  order: order.batter_order
                }))

              const awayBattersData = data.battingOrders
                .filter(order => order.team === currentGame.away)
                .sort((a, b) => a.batter_order - b.batter_order)
                .map(order => ({ 
                  name: order.batter_name, 
                  position: order.position,
                  order: order.batter_order
                }))

              setHomeBatters(homeBattersData)
              setAwayBatters(awayBattersData)

              // 設定投手
              const homePitcherData = data.startingPitchers.find(p => p.team === currentGame.home)
              const awayPitcherData = data.startingPitchers.find(p => p.team === currentGame.away)
              setHomePitcher(homePitcherData ? homePitcherData.pitcher_name : '')
              setAwayPitcher(awayPitcherData ? awayPitcherData.pitcher_name : '')

              // 初始化第一棒打者與投手
              setCurrentBatter(awayBattersData[0])
              setCurrentPitcher(homePitcherData ? homePitcherData.pitcher_name : '')
            }
          })
          .finally(() => setIsLoading(false))
      })
      .catch(err => {
        console.error('載入資料失敗:', err)
        setIsLoading(false)
      })
  }, [gameId])

  useEffect(() => {
    if (!gameId) return

    fetch(`/api/atbat-log?game_id=${gameId}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setPlayByPlay(data)
          console.log('📋 載入逐打席紀錄:', data)
        } else {
          console.warn('⚠️ 無法讀取打席紀錄:', data)
        }
      })
      .catch(err => {
        console.error('❌ 無法讀取逐打席紀錄:', err)
      })
  }, [gameId])


  const groupPlaysByInning = (plays) => {
    const groups = {};

    plays.forEach(play => {
      const label = `${play.inning}${play.half_inning === 'top' ? '上' : '下'}`;
      if (!groups[label]) groups[label] = [];
      groups[label].push(play);
    });

    return groups;
  };


  const getBaseCondition = () => {
    const { first, second, third } = bases
    if (!first && !second && !third) return '無人'
    return `${first ? '一' : ''}${second ? '二' : ''}${third ? '三' : ''}`
  }
  const handleRecordAtBat = async (result) => {
    if (!currentBatter || !currentPitcher) return;

    const atBat = currentBatter?.order || 0;

    const predictBasesAfterPlay = (result) => {
      const { first, second, third } = bases;
      const newBases = { first: false, second: false, third: false };

      switch (result) {
        case '1B':
        case 'BB':
        case 'IBB':
        case 'HBP':
        case 'E':
          if (third) newBases.third = false;
          if (second) newBases.third = true;
          if (first) newBases.second = true;
          newBases.first = true;
          break;
        case '2B':
          if (third || second) {
            newBases.third = false;
            newBases.second = false;
          }
          if (first) {
            newBases.third = true;
          }
          newBases.second = true;
          break;
        case '3B':
          newBases.third = true;
          break;
        case 'HR':
          break;
        default:
          return bases;
      }

      return newBases;
    };

    const newSequence = playByPlay.length > 0 ? Math.max(...playByPlay.map(play => play.sequence)) + 1 : 1;

    const outAddedByResult = {
      K: 1, F: 1, FO: 1, G: 1, SF: 1,
      DP: 2,
      TP: 3,
      runner_out: 1,
    };
    const addedOuts = outAddedByResult[result] || 0;
    const computedOuts = Math.min(outs + addedOuts, 3);

    const atBatData = {
      game_no: Number(gameId),
      batter_name: currentBatter.name,
      pitcher_name: currentPitcher,
      inning,
      half_inning: halfInning === 'top' ? 'top' : 'bottom',
      result,
      at_bat: atBat,
      rbis,
      sequence: newSequence,
      base_condition: getBaseCondition(),
      out_condition: outs, // 先記錄當前的出局數
    };

    try {
      const res = await fetch('/api/record-at-bat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(atBatData),
      });

      if (!res.ok) {
        throw new Error('記錄打席失敗');
      }

      setPlayByPlay(prev => [...prev, atBatData]);
      setRbis(0); // 送出後歸0
      setSelectedResult('');

      const nextBases = predictBasesAfterPlay(result);
      setOuts(computedOuts); // 更新出局數
      setBases(nextBases); // 更新壘包狀態

      if (computedOuts >= 3) {
        const nextHalf = halfInning === 'top' ? 'bottom' : 'top';
        const nextInning = halfInning === 'bottom' ? inning + 1 : inning;
        setHalfInning(nextHalf);
        setInning(nextInning);

        // 自動補0寫入API
        if (scoreboard) {
          // 客隊（上半局）: 進入下半局時補0
          if (halfInning === 'top') {
            const away = scoreboard.find(t => t.team_type === 'away');
            const inningKey = `score_${inning}`;
            if (away && (away[inningKey] === null || away[inningKey] === undefined)) {
              setScoreboard(prev => prev.map(t => t.team_type === 'away' ? { ...t, [inningKey]: 0 } : t));
              fetch(`/api/scoreboard/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_type: 'away', [inningKey]: 0 })
              });
            }
          }
          // 主隊（下半局）: 進入下一局時補0
          if (halfInning === 'bottom') {
            const home = scoreboard.find(t => t.team_type === 'home');
            const inningKey = `score_${inning}`;
            if (home && (home[inningKey] === null || home[inningKey] === undefined)) {
              setScoreboard(prev => prev.map(t => t.team_type === 'home' ? { ...t, [inningKey]: 0 } : t));
              fetch(`/api/scoreboard/${gameId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ team_type: 'home', [inningKey]: 0 })
              });
            }
          }
        }

        if (nextHalf === 'top') {
          const nextIndex = (awayCurrentBatterIndex + 1) % awayBatters.length;
          setAwayCurrentBatterIndex(nextIndex);
          setCurrentBatter(awayBatters[nextIndex]);
          setCurrentPitcher(homePitcher);
        } else {
          const nextIndex = (homeCurrentBatterIndex + 1) % homeBatters.length;
          setHomeCurrentBatterIndex(nextIndex);
          setCurrentBatter(homeBatters[nextIndex]);
          setCurrentPitcher(awayPitcher);
        }

        setOuts(0);
        setBases({ first: false, second: false, third: false });
      } else {
        const batters = halfInning === 'top' ? awayBatters : homeBatters;
        const currentIndex = halfInning === 'top' ? awayCurrentBatterIndex : homeCurrentBatterIndex;
        const nextIndex = (currentIndex + 1) % batters.length;

        if (halfInning === 'top') {
          setAwayCurrentBatterIndex(nextIndex);
        } else {
          setHomeCurrentBatterIndex(nextIndex);
        }

        setCurrentBatter(batters[nextIndex]);
      }
    } catch (error) {
      console.error('記錄失敗:', error);
      alert('記錄打席時發生錯誤');
    }
  }

  // 換投
  const handlePitchingChange = async () => {
    if (!newPitcher) return;
    const newSequence = playByPlay.length > 0 ? Math.max(...playByPlay.map(play => play.sequence)) + 1 : 1;
    const eventData = {
      game_no: Number(gameId),
      inning,
      half_inning: halfInning,
      result: 'pitching_change',
      pitcher_name: newPitcher,
      sequence: newSequence,
      base_condition: getBaseCondition(),
      out_condition: outs,
    };
    console.log('[換投] eventData:', eventData); // 新增
    try {
      const res = await fetch('/api/record-at-bat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('記錄換投失敗');
      setPlayByPlay(prev => [...prev, eventData]);
      setShowPitcherModal(false);
      setNewPitcher('');
      if (halfInning === 'top') setHomePitcher(newPitcher);
      else setAwayPitcher(newPitcher);
      setCurrentPitcher(newPitcher);
    } catch {
      alert('記錄換投時發生錯誤');
    }
  };

  // 記錄代打
  const handleSubstituteBatter = async () => {
    if (!newBatter || !subBatterOrder) return;
    const newSequence = playByPlay.length > 0 ? Math.max(...playByPlay.map(play => play.sequence)) + 1 : 1;
    const eventData = {
      game_no: Number(gameId),
      inning,
      half_inning: halfInning,
      result: 'substitute_batter',
      batter_name: newBatter,
      at_bat: Number(subBatterOrder),
      sequence: newSequence,
      base_condition: getBaseCondition(),
      out_condition: outs,
    };
    console.log('[代打] eventData:', eventData); // 新增
    try {
      const res = await fetch('/api/record-at-bat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('記錄代打失敗');
      setPlayByPlay(prev => [...prev, eventData]);
      setShowBatterModal(false);
      setNewBatter('');
      setSubBatterOrder('');
      if (halfInning === 'top') {
        setAwayBatters(prev => prev.map(b => b.order === Number(subBatterOrder) ? { ...b, name: newBatter } : b));
      } else {
        setHomeBatters(prev => prev.map(b => b.order === Number(subBatterOrder) ? { ...b, name: newBatter } : b));
      }
    } catch {
      alert('記錄代打時發生錯誤');
    }
  };

  // 記錄代守（如有）
  // 你可依照 handleSubstituteBatter 複製一份 handleSubstituteFielder，並加 console.log('[代守] eventData:', eventData);


  // 記錄壘間出局
  const handleRunnerOut = async () => {
    const newOuts = outs + 1;
    const newSequence = playByPlay.length > 0 ? Math.max(...playByPlay.map(play => play.sequence)) + 1 : 1;
    const eventData = {
      game_no: Number(gameId),
      inning,
      half_inning: halfInning,
      result: 'runner_out',
      sequence: newSequence,
      base_condition: getBaseCondition(),
      out_condition: outs,
    };
    console.log('[壘間出局] eventData:', eventData);
    try {
      const res = await fetch('/api/record-at-bat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(eventData),
      });
      if (!res.ok) throw new Error('記錄壘間出局失敗');
      setPlayByPlay(prev => [...prev, eventData]);
    } catch {
      alert('記錄壘間出局時發生錯誤');
    }
    setOuts(newOuts);
    // 出局數達 3 自動換局
    if (newOuts >= 3) {
      setOuts(0);
      setBases({ first: false, second: false, third: false });
      if (halfInning === 'top') {
        setHalfInning('bottom');
        setCurrentBatter(homeBatters.find(b => b.order === 1) || homeBatters[0]);
        setCurrentPitcher(awayPitcher);
      } else {
        setHalfInning('top');
        setInning(prev => prev + 1);
        setCurrentBatter(awayBatters.find(b => b.order === 1) || awayBatters[0]);
        setCurrentPitcher(homePitcher);
      }
    } else {
      // 出局未滿三，左側出局數自動加
      setOuts(newOuts);
    }
  };


  // 計算總分與安打
  const getTotalScore = (team) => {
    let total = 0;
    for (let i = 1; i <= 12; i++) {
      const v = team[`score_${i}`];
      if (typeof v === 'number') total += v;
    }
    return total;
  };
  const getTotalHits = (team) => {
    if (!playByPlay || !game) return 0;
    // 客隊（away）只算 half_inning === 'top'，主隊（home）只算 half_inning === 'bottom'
    const isAway = team.team_type === 'away';
    const teamName = team.team_name;
    return playByPlay.filter(
      p => p.half_inning === (isAway ? 'top' : 'bottom') && p.result && [
        'IH', '1B', '2B', '3B', 'HR'
      ].includes(p.result) && p.batter_name && (
        (isAway ? game.away : game.home) === teamName
      )
    ).length;
  };

  // --- 新增：playByPlay 變動時自動同步 H 到 supabase ---
  useEffect(() => {
    if (!scoreboard || !Array.isArray(scoreboard) || !gameId) return;
    // 只在 playByPlay 變動時同步 H
    scoreboard.forEach(async (team) => {
      const newH = getTotalHits(team);
      if (team.h !== newH) {
        // 更新 local scoreboard 狀態
        setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, h: newH } : t));
        // 更新 supabase
        await fetch(`/api/scoreboard/${gameId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team_type: team.team_type, h: newH })
        });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playByPlay]);


  // 🧪 Debug：目前打序狀態與左側目前狀況同步棒次
  useEffect(() => {
    // 只計算 batter_name 與 pitcher_name 都有值的 play
    const awayPlays = playByPlay.filter(p => p.half_inning === 'top' && p.batter_name && p.pitcher_name);
    const homePlays = playByPlay.filter(p => p.half_inning === 'bottom' && p.batter_name && p.pitcher_name);
    const awayIndex = awayBatters.length > 0 ? (awayPlays.length % awayBatters.length) : 0;
    const homeIndex = homeBatters.length > 0 ? (homePlays.length % homeBatters.length) : 0;
    setAwayCurrentBatterIndex(awayIndex);
    setHomeCurrentBatterIndex(homeIndex);
    // 讓左側目前狀況與 Debug 狀態同步
    if (halfInning === 'top') {
      setCurrentBatter(awayBatters[awayIndex] || null);
    } else {
      setCurrentBatter(homeBatters[homeIndex] || null);
    }
  }, [playByPlay, homeBatters, awayBatters, halfInning]);

  if (isLoading) {
    return <div className="max-w-2xl mx-auto p-4 text-center">載入比賽資料中...</div>
  }

  if (!game) {
    return <div className="max-w-2xl mx-auto p-4 text-center">找不到比賽資料</div>
  }

  return (
    <>
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-2">記分板</h2>
      {scoreboard ? (
        <div className="overflow-x-auto">
          <table className="table-auto border border-gray-300 w-full text-sm">
            <thead>
              <tr>
                <th className="border px-2 py-1 text-center">隊伍</th>
                {[...Array(Math.max(9, scoreboard.reduce((max, team) => {
                  let inningCount = 0
                  for (let i = 1; i <= 12; i++) {
                    if (team[`score_${i}`] !== null && team[`score_${i}`] !== undefined) {
                      inningCount = i
                    }
                  }
                  return Math.max(max, inningCount)
                }, 0)))].map((_, i) => (
                  <th key={i} className="border px-2 py-1 text-center">{i + 1}</th>
                ))}
                <th className="border px-2 py-1 text-center">R</th>
                <th className="border px-2 py-1 text-center">H</th>
                <th className="border px-2 py-1 text-center">E</th>
              </tr>
            </thead>
            <tbody>
              {scoreboard.map((team, index) => (
                <tr key={index}>
                  <td className="border px-2 py-1 text-center font-bold">{team.team_name}</td>
                  {[...Array(Math.max(9, scoreboard.reduce((max, team) => {
                    let inningCount = 0
                    for (let i = 1; i <= 12; i++) {
                      if (team[`score_${i}`] !== null && team[`score_${i}`] !== undefined) {
                        inningCount = i
                      }
                    }
                    return Math.max(max, inningCount)
                  }, 0)))].map((_, i) => {
                    const inningKey = `score_${i + 1}`;
                    const canEdit = (i + 1 === inning) && ((team.team_name === game.away && halfInning === 'top') || (team.team_name === game.home && halfInning === 'bottom'));
                    const isHalfInningOver = (
                      (i + 1 < inning) ||
                      (i + 1 === inning && team.team_type === 'away' && halfInning === 'bottom') ||
                      (i + 1 < inning && team.team_type === 'home')
                    );
                    const displayScore = (team[inningKey] === null || team[inningKey] === undefined) && isHalfInningOver ? 0 : (team[inningKey] ?? '');
                    return (
                      <td key={i} className="border px-2 py-1 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && (
                            <button
                              className="px-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                              onClick={async () => {
                                const val = (team[inningKey] ?? 0) - 1;
                                setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, [inningKey]: val < 0 ? 0 : val } : t));
                                // 更新R
                                const newR = getTotalScore({ ...team, [inningKey]: val < 0 ? 0 : val });
                                setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, r: newR } : t));
                                fetch(`/api/scoreboard/${gameId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ team_type: team.team_type, [inningKey]: val < 0 ? 0 : val, r: newR })
                                });
                              }}
                              aria-label="減少分數"
                            >-</button>
                          )}
                          <span>{displayScore}</span>
                          {canEdit && (
                            <button
                              className="px-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                              onClick={async () => {
                                const val = (team[inningKey] ?? 0) + 1;
                                setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, [inningKey]: val } : t));
                                // 更新R
                                const newR = getTotalScore({ ...team, [inningKey]: val });
                                setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, r: newR } : t));
                                fetch(`/api/scoreboard/${gameId}`, {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ team_type: team.team_type, [inningKey]: val, r: newR })
                                });
                              }}
                              aria-label="增加分數"
                            >+</button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  {/* R/H/E 欄位 */}
                  <td className="border px-2 py-1 text-center">{getTotalScore(team)}</td>
                  <td className="border px-2 py-1 text-center">{getTotalHits(team)}</td>
                  <td className="border px-2 py-1 text-center">
                    {/* 失誤全時段可編輯，改用加減號，UI先動 */}
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="px-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                        onClick={async () => {
                          const val = (team.e ?? 0) - 1;
                          setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, e: val < 0 ? 0 : val } : t));
                          fetch(`/api/scoreboard/${gameId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              team_type: team.team_type,
                              e: val < 0 ? 0 : val
                            })
                          });
                        }}
                        aria-label="減少失誤"
                      >-</button>
                      <span>{team.e ?? ''}</span>
                      <button
                        className="px-1 rounded bg-gray-200 hover:bg-gray-300 text-lg font-bold"
                        onClick={async () => {
                          const val = (team.e ?? 0) + 1;
                          setScoreboard(prev => prev.map(t => t.team_name === team.team_name ? { ...t, e: val } : t));
                          fetch(`/api/scoreboard/${gameId}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              team_type: team.team_type,
                              e: val
                            })
                          });
                        }}
                        aria-label="增加失誤"
                      >+</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>載入記分板中...</p>
      )}
    </div>

    {/* Tabs */}
    <div className="max-w-6xl mx-auto p-4">
      {/* tab 按鈕加一個：非先發出場 */}
      <div className="flex border-b mb-4">
        <button
          className={`px-4 py-2 font-bold border-b-2 ${activeTab === 'record' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          onClick={() => setActiveTab('record')}
        >比賽記錄</button>
        <button
          className={`ml-4 px-4 py-2 font-bold border-b-2 ${activeTab === 'lineup' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          onClick={() => setActiveTab('lineup')}
        >先發名單</button>
        <button
          className={`ml-4 px-4 py-2 font-bold border-b-2 ${activeTab === 'substitution' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          onClick={() => setActiveTab('substitution')}
        >異動紀錄</button>
        <button
          className={`ml-4 px-4 py-2 font-bold border-b-2 ${activeTab === 'nonstarter' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-600'}`}
          onClick={() => setActiveTab('nonstarter')}
        >非先發出場</button>
      </div>

      {activeTab === 'record' && (
        <div>
          {/* Debug 狀態 */}
          <div className="mb-2 bg-yellow-100 border border-yellow-400 rounded text-sm text-gray-800 p-4">
            <p className="mb-1 font-semibold">🧪 Debug：目前打序狀態</p>
            <div className="flex justify-between gap-8">
              <div>
                <p className="font-bold">客隊 ({game?.away})：</p>
                <p>目前打者棒次：{awayCurrentBatterIndex + 1} / {awayBatters.length}</p>
                <p>打者姓名：{awayBatters[awayCurrentBatterIndex]?.name || '無'}</p>
              </div>
              <div>
                <p className="font-bold">主隊 ({game?.home})：</p>
                <p>目前打者棒次：{homeCurrentBatterIndex + 1} / {homeBatters.length}</p>
                <p>打者姓名：{homeBatters[homeCurrentBatterIndex]?.name || '無'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* 左側：紀錄區域 */}
            <div>
              <h1 className="text-2xl font-bold mb-4">比賽記錄</h1>

              <div className="bg-gray-100 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold mb-4">目前狀況</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-semibold text-2xl">{halfInning === 'top' ? 'Top' : 'Bot'} {inning}</p>
                    <div className="flex items-center gap-2">
                      <span>壘位:</span>
                      <div className="relative w-16 h-16">
                        <div
                          className={`absolute top-0 left-1/2 transform -translate-x-1/2 rotate-45 w-4 h-4 border ${bases.second ? 'bg-yellow-500' : 'bg-gray-200'}`}
                          onClick={() => setBases(prev => ({ ...prev, second: !prev.second }))
                          }
                        ></div>
                        <div
                          className={`absolute top-1/2 right-0 transform -translate-y-1/2 rotate-45 w-4 h-4 border ${bases.first ? 'bg-yellow-500' : 'bg-gray-200'}`}
                          onClick={() => setBases(prev => ({ ...prev, first: !prev.first }))
                          }
                        ></div>
                        <div
                          className={`absolute top-1/2 left-0 transform -translate-y-1/2 rotate-45 w-4 h-4 border ${bases.third ? 'bg-yellow-500' : 'bg-gray-200'}`}
                          onClick={() => setBases(prev => ({ ...prev, third: !prev.third }))
                          }
                        ></div>
                      </div>
                      {/* <p className="text-xs text-gray-500">壘包狀態: {getBaseCondition()}</p> */}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span>出局數:</span>
                      <div className="flex gap-1">
                        {[0, 1].map(o => (
                          <div
                            key={o}
                            className={`w-6 h-6 border rounded-full ${outs > o ? 'bg-red-500' : 'bg-gray-200'}`}
                            onClick={() => setOuts(o + 1)}
                          ></div>
                        ))}
                      </div>
                      <div className="mt-2">
                        <button
                          className="w-full bg-gray-700 hover:bg-gray-800 text-white font-bold py-2 px-4 rounded"
                          onClick={handleRunnerOut}
                        >
                          壘間出局 +1
                        </button>
                      </div>
                      {/* <p className="text-xs text-gray-500">出局數: {outs}</p> */}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="font-semibold text-lg">
                      第 {currentBatter?.order || '-'} 棒 {currentBatter?.position?.toUpperCase() || '-'}  {currentBatter?.name || '未設定'}
                    </p>
                    <p className="text-gray-600">投手：{currentPitcher || '未設定'}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-bold mb-4">記錄打擊結果</h2>
                <div className="mb-4">
                  <label htmlFor="result" className="block font-semibold mb-2">打擊結果</label>
                  <select
                    id="result"
                    className="w-full border rounded p-2"
                    value={selectedResult}
                    onChange={e => setSelectedResult(e.target.value)}
                  >
                    <option value="">選擇結果</option>
                    {resultOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-4">
                  <label htmlFor="rbis" className="block font-semibold mb-2">打點 (RBI)</label>
                  <select
                    id="rbis"
                    className="w-full border rounded p-2"
                    onChange={e => setRbis(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4].map(rbi => (
                      <option key={rbi} value={rbi}>{rbi}</option>
                    ))}
                  </select>
                </div>
                
                <button
                  className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  onClick={() => handleRecordAtBat(selectedResult)}
                  disabled={!selectedResult}
                >
                  送出
                </button>
                <div className="flex gap-2 mt-2">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => setShowPitcherModal(true)}
                  >換投</button>
                  <button
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded"
                    onClick={() => setShowBatterModal(true)}
                  >代打</button>
                </div>
                {/* 換投 Modal */}
                {showPitcherModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-80">
                      <h3 className="font-bold mb-2">換投</h3>
                      <input
                        className="border rounded p-2 w-full mb-2"
                        placeholder="新投手姓名"
                        value={newPitcher}
                        onChange={e => setNewPitcher(e.target.value)}
                      />
                      <div className="flex gap-2 mt-2">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handlePitchingChange}>送出</button>
                        <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowPitcherModal(false)}>取消</button>
                      </div>
                    </div>
                  </div>
                )}
                {/* 代打 Modal */}
                {showBatterModal && (
                  <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded shadow-lg w-80">
                      <h3 className="font-bold mb-2">代打</h3>
                      <input
                        className="border rounded p-2 w-full mb-2"
                        placeholder="新打者姓名"
                        value={newBatter}
                        onChange={e => setNewBatter(e.target.value)}
                      />
                      <select
                        className="border rounded p-2 w-full mb-2"
                        value={subBatterOrder}
                        onChange={e => setSubBatterOrder(e.target.value)}
                      >
                        <option value="">選擇棒次</option>
                        {(halfInning === 'top' ? awayBatters : homeBatters).map(b => (
                          <option key={b.order} value={b.order}>第{b.order}棒 {b.name}</option>
                        ))}
                      </select>
                      <div className="flex gap-2 mt-2">
                        <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={handleSubstituteBatter}>送出</button>
                        <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowBatterModal(false)}>取消</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            {/* 右側：單場 log 區域 */}
            <div>
              <h2 className="text-xl font-bold mb-4">單場紀錄</h2>
              <ul className="space-y-2">
                <ul className="space-y-4">
                  {Object.entries(groupPlaysByInning(playByPlay)).map(([inningLabel, plays]) => (
                    <div key={inningLabel} className="mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{inningLabel}</h3>
                        <div className="h-px flex-1 bg-gray-300"></div>
                      </div>
                      <ul className="space-y-2">
                        {plays.map((play, index) => {
                          const base = play.base_condition || '';
                          const out = play.out_condition || 0;
                          const result = play.result;
                          const getResultColor = (type) => {
                            if (['K', 'SF', 'FO', 'F', 'G', 'FC', 'E', 'INT-O', 'DP', 'TP', 'runner_out'].includes(type)) {
                              return 'bg-[#1E3A8A]'; // 深藍 - 出局類
                            }
                            if (['IH', '1B', '2B', '3B', 'HR'].includes(type)) {
                              return 'bg-[#DC2626]'; // 紅色 - 安打類
                            }
                            if (['BB', 'IBB', 'HBP', 'SAC', 'INT-D'].includes(type)) {
                              return 'bg-[#CA8A04]'; // 土黃 - 保送類
                            }
                            if (['pitching_change', 'substitute_batter'].includes(type)) {
                              return 'bg-[#059669]'; // 綠色 - 異動類
                            }
                            return 'bg-gray-600'; // 其他
                          };
                          let resultText = result;
                          if (result === 'pitching_change') resultText = `換投：${play.pitcher_name}`;
                          if (result === 'substitute_batter') resultText = `第${play.at_bat}棒 代打：${play.batter_name}`;
                          if (result === 'runner_out') resultText = '壘間出局';
                          return (
                            <li key={index} className="flex justify-between items-center gap-4">
                              <div className="w-1/3">
                                <p className="text-lg font-bold text-left">{play.batter_name || ''}</p>
                                <p className="text-sm text-gray-600 text-left">{play.pitcher_name ? `投手：${play.pitcher_name}` : ''}</p>
                              </div>

                              {/* 中：壘包與出局數 */}
                              <div className="w-1/3 flex flex-col items-center justify-center">
                                <div className="relative w-12 h-12 mb-2">
                                  <div className={`absolute top-0 left-1/2 transform -translate-x-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('二') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                                  <div className={`absolute top-1/2 right-0 transform -translate-y-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('一') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                                  <div className={`absolute top-1/2 left-0 transform -translate-y-1/2 rotate-45 w-3.5 h-3.5 border ${base.includes('三') ? 'bg-yellow-500' : 'bg-gray-200'}`}></div>
                                </div>
                                <div className="flex gap-1">
                                  {[0, 1].map(o => (
                                    <div
                                      key={o}
                                      className={`w-3 h-3 border rounded-full ${out > o ? 'bg-red-500' : 'bg-gray-200'}`}
                                    ></div>
                                  ))}
                                </div>
                              </div>

                              {/* 右：打擊結果 */}
                              <div className="w-1/3 flex flex-col items-end">
                                <div className={`${getResultColor(result)} px-3 py-1 rounded text-white text-sm font-bold`}>
                                  {resultText}
                                </div>
                                {play.rbis > 0 && (
                                  <div className="mt-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded">
                                    {play.rbis}RBI
                                  </div>
                                )}
                              </div>
                            </li>

                          );
                        })}
                      </ul>
                    </div>
                  ))}

                </ul>

              </ul>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'lineup' && (
        <div className="grid grid-cols-2 gap-8">
          {/* Away lineup */}
          <div>
            <h3 className="text-lg font-bold mb-2">客隊：{game?.away}</h3>
            <p className="mb-1">先發投手：<span className="font-bold">{awayPitcher || '未設定'}</span></p>
            <table className="table-auto w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">棒次</th>
                  <th className="border px-2 py-1">守位</th>
                  <th className="border px-2 py-1">打者</th>
                </tr>
              </thead>
              <tbody>
                {awayBatters.map((b, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1 text-center">{b.order}</td>
                    <td className="border px-2 py-1 text-center">{b.position?.toUpperCase()}</td>
                    <td className="border px-2 py-1 text-center">{b.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Home lineup */}
          <div>
            <h3 className="text-lg font-bold mb-2">主隊：{game?.home}</h3>
            <p className="mb-1">先發投手：<span className="font-bold">{homePitcher || '未設定'}</span></p>
            <table className="table-auto w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">棒次</th>
                  <th className="border px-2 py-1">守位</th>
                  <th className="border px-2 py-1">打者</th>
                </tr>
              </thead>
              <tbody>
                {homeBatters.map((b, i) => (
                  <tr key={i}>
                    <td className="border px-2 py-1 text-center">{b.order}</td>
                    <td className="border px-2 py-1 text-center">{b.position?.toUpperCase()}</td>
                    <td className="border px-2 py-1 text-center">{b.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* 新增異動紀錄tab */}
      {activeTab === 'substitution' && (
        <div className="max-w-3xl mx-auto p-4">
          <h3 className="text-lg font-bold mb-4">異動紀錄（代打/代守/換投）</h3>
          <ul className="space-y-2">
            {playByPlay.filter(p => ['substitute_batter','substitute_fielder','pitching_change'].includes(p.result)).map((p, i) => (
              <li key={i} className="border rounded p-2 flex flex-col md:flex-row md:items-center gap-2">
                <span className="font-bold text-blue-700">{p.result === 'substitute_batter' ? '代打' : p.result === 'substitute_fielder' ? '代守' : '換投'}</span>
                {p.result === 'substitute_batter' && (
                  <span>第{p.at_bat}棒 代打：{p.batter_name}</span>
                )}
                {p.result === 'substitute_fielder' && (
                  <span>第{p.at_bat}棒 代守：{p.batter_name}（守位：{p.position || '-'}）</span>
                )}
                {p.result === 'pitching_change' && (
                  <span>換投：{p.pitcher_name}</span>
                )}
                <span className="text-gray-500 text-xs ml-auto">{p.inning}{p.half_inning === 'top' ? '上' : '下'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* 非先發出場tab */}
      {activeTab === 'nonstarter' && (
        <div className="max-w-4xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* 打者區 */}
          <div>
            <h3 className="text-lg font-bold mb-2">打者異動</h3>
            <table className="table-auto w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">棒次</th>
                  <th className="border px-2 py-1">先發/異動</th>
                  <th className="border px-2 py-1">守位</th>
                </tr>
              </thead>
              <tbody>
                {(awayBatters.length > 0 ? awayBatters : homeBatters).map((b, i) => {
                  // 先抓該棒次所有代打（依照 playByPlay 時間順序）
                  const awaySubs = playByPlay.filter(p => p.result === 'substitute_batter' && p.at_bat === b.order && p.half_inning === 'top');
                  const homeSubs = playByPlay.filter(p => p.result === 'substitute_batter' && p.at_bat === b.order && p.half_inning === 'bottom');
                  // 先發
                  const rows = [
                    <tr key={`starter-${i}`}>
                      <td className="border px-2 py-1 text-center align-top" rowSpan={1 + awaySubs.length + homeSubs.length}>{b.order}</td>
                      <td className="border px-2 py-1 text-left font-bold align-top">{b.name}</td>
                      <td className="border px-2 py-1 text-center align-top">{b.position?.toUpperCase()}</td>
                    </tr>
                  ];
                  // 客隊代打
                  awaySubs.forEach((sub, idx) => {
                    rows.push(
                      <tr key={`away-sub-${i}-${idx}`}> 
                        <td className="border px-2 py-1 text-left text-blue-700">[客] 代打：{sub.batter_name}</td>
                        <td className="border px-2 py-1 text-center">PH</td>
                      </tr>
                    );
                  });
                  // 主隊代打
                  homeSubs.forEach((sub, idx) => {
                    rows.push(
                      <tr key={`home-sub-${i}-${idx}`}> 
                        <td className="border px-2 py-1 text-left text-red-700">[主] 代打：{sub.batter_name}</td>
                        <td className="border px-2 py-1 text-center">PH</td>
                      </tr>
                    );
                  });
                  return rows;
                })}
              </tbody>
            </table>
          </div>
          {/* 投手區 */}
          <div>
            <h3 className="text-lg font-bold mb-2">投手異動</h3>
            <table className="table-auto w-full border border-gray-300 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1">序</th>
                  <th className="border px-2 py-1">投手/異動</th>
                </tr>
              </thead>
              <tbody>
                {/* 先發投手 */}
                <tr>
                  <td className="border px-2 py-1 text-center align-top">1</td>
                  <td className="border px-2 py-1 text-left font-bold align-top">{awayPitcher || homePitcher}</td>
                </tr>
                {/* 換投紀錄依序往下 */}
                {playByPlay.filter(p => p.result === 'pitching_change').map((p, idx) => (
                  <tr key={`pitcher-change-${idx}`}> 
                    <td className="border px-2 py-1 text-center align-top">{idx + 2}</td>
                    <td className="border px-2 py-1 text-left text-blue-700">換投：{p.pitcher_name} <span className="text-xs text-gray-500">{p.inning}{p.half_inning === 'top' ? '上' : '下'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>

    {/* 進入守備半局時彈窗詢問守位調整 */}
    {showDefenseModal && (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow-lg w-[90vw] max-w-2xl">
          <h3 className="font-bold mb-2">守備異動調整</h3>
          <p className="mb-2 text-sm text-gray-700">請調整目前在場上球員的守位：</p>
          <table className="table-auto w-full border border-gray-300 text-sm mb-4">
            <thead>
              <tr>
                <th className="border px-2 py-1">棒次</th>
                <th className="border px-2 py-1">球員</th>
                <th className="border px-2 py-1">守位</th>
              </tr>
            </thead>
            <tbody>
              {currentDefense.map((p, idx) => (
                <tr key={idx}>
                  <td className="border px-2 py-1 text-center">{p.order}</td>
                  <td className="border px-2 py-1 text-center">{p.name}</td>
                  <td className="border px-2 py-1 text-center">
                    <select value={p.position} onChange={e => handleDefenseChange(idx, e.target.value)} className="border rounded p-1">
                      {['P','C','1B','2B','3B','SS','LF','CF','RF','DH','PH'].map(pos => (
                        <option key={pos} value={pos}>{pos}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-2 justify-end">
            <button className="bg-blue-600 text-white px-4 py-2 rounded" onClick={saveDefenseChange}>儲存</button>
            <button className="bg-gray-400 text-white px-4 py-2 rounded" onClick={() => setShowDefenseModal(false)}>取消</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
