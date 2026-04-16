import { useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";

const ROLE = {
  Batter:     { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "BATSMAN" },
  Bowler:     { color: "#4ade80", bg: "rgba(74,222,128,0.12)",  label: "BOWLER"  },
  AllRounder: { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "ALL-ROUNDER" },
  WK:         { color: "#c084fc", bg: "rgba(192,132,252,0.12)", label: "WICKET KEEPER" },
};

const FLAG = { Indian: "🇮🇳", Foreigner: "🌏" };

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@400;500;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #060b14; --surface: #0d1829; --surface2: #111e33;
    --border: rgba(255,255,255,0.07); --border-bright: rgba(255,255,255,0.15);
    --orange: #f97316; --blue: #38bdf8; --green: #4ade80;
    --red: #ef4444; --gold: #fbbf24; --purple: #c084fc;
    --text: #e2e8f0; --muted: #64748b; --dimmer: #334155;
  }
  html, body, #root { height: 100%; margin: 0; }
  body { background: var(--bg); overflow: hidden; }

  .proj {
    height: 100vh; width: 100vw;
    background: var(--bg); color: var(--text);
    font-family: 'Barlow', sans-serif;
    display: flex; flex-direction: column;
    overflow: hidden;
  }

  /* ── HEADER ── */
  .proj-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 40px; height: 60px; flex-shrink: 0;
    background: rgba(6,11,20,0.95);
    border-bottom: 1px solid var(--border);
  }
  .proj-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 20px; font-weight: 900; letter-spacing: 3px;
    background: linear-gradient(90deg, var(--orange), var(--gold));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  }
  .proj-live-pill {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 16px; border-radius: 20px;
    background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
  }
  .live-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #ef4444; box-shadow: 0 0 8px #ef4444;
    animation: livePulse 1.5s infinite;
  }
  @keyframes livePulse { 0%,100%{opacity:1;box-shadow:0 0 8px #ef4444;} 50%{opacity:.4;box-shadow:0 0 2px #ef4444;} }
  .proj-live-text {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 2px; color: #ef4444;
  }
  .proj-header-stats { display: flex; gap: 28px; align-items: center; }
  .proj-hstat { text-align: center; }
  .proj-hstat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 22px; font-weight: 800; line-height: 1;
  }
  .proj-hstat-label { font-size: 9px; letter-spacing: 2px; color: var(--muted); font-weight: 600; }

  /* ── MAIN BODY ── */
  .proj-body {
    flex: 1; display: flex; overflow: hidden;
  }

  /* ── LEFT — PLAYER SPOTLIGHT ── */
  .spotlight {
    flex: 1.1; display: flex; flex-direction: column; justify-content: center;
    padding: 40px 44px; border-right: 1px solid var(--border);
    position: relative; overflow: hidden;
  }
  .spotlight-bg {
    position: absolute; inset: 0; pointer-events: none;
    background: radial-gradient(ellipse at 20% 50%, rgba(249,115,22,0.06) 0%, transparent 70%);
    transition: opacity 0.8s;
  }

  /* Idle state */
  .idle-screen {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    height: 100%; gap: 20px;
  }
  .idle-logo {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 80px; font-weight: 900; letter-spacing: 4px;
    background: linear-gradient(90deg, var(--orange), var(--gold));
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    opacity: 0.15;
  }
  .idle-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 16px; font-weight: 700; letter-spacing: 6px;
    color: var(--dimmer);
  }

  /* Player card */
  .player-flag { font-size: 52px; line-height: 1; margin-bottom: 16px; }
  .player-role-badge {
    display: inline-flex; align-items: center;
    padding: 5px 16px; border-radius: 20px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 700; letter-spacing: 3px;
    margin-bottom: 16px;
  }
  .player-name {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(52px, 6vw, 82px);
    font-weight: 900; letter-spacing: 1px; line-height: 1.05;
    color: #fff;
    animation: fadeSlideIn 0.5s ease;
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .player-nat {
    font-size: 15px; color: var(--muted); font-weight: 500;
    margin-top: 8px; letter-spacing: 1px;
  }
  .base-price-row {
    margin-top: 20px; display: flex; align-items: center; gap: 10px;
  }
  .base-price-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 3px; color: var(--muted);
  }
  .base-price-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 28px; font-weight: 900; color: var(--gold);
  }

  /* Stats row */
  .stats-row {
    display: flex; gap: 14px; margin-top: 32px; flex-wrap: wrap;
  }
  .stat-box {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 14px; padding: 16px 22px; text-align: center; min-width: 90px;
    animation: fadeSlideIn 0.5s ease;
  }
  .stat-val {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 36px; font-weight: 900; line-height: 1;
  }
  .stat-label {
    font-size: 10px; letter-spacing: 2px; color: var(--muted);
    font-weight: 600; margin-top: 6px;
  }

  /* Divider line */
  .spotlight-divider {
    height: 1px; background: var(--border);
    margin: 28px 0;
  }

  /* ── RIGHT — LEADERBOARD ── */
  .leaderboard {
    width: 380px; flex-shrink: 0;
    display: flex; flex-direction: column;
    overflow: hidden;
  }
  .lb-header {
    padding: 20px 24px 14px;
    border-bottom: 1px solid var(--border); flex-shrink: 0;
  }
  .lb-title {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 12px; font-weight: 700; letter-spacing: 3px; color: var(--muted);
  }
  .lb-scroll { flex: 1; overflow-y: auto; padding: 10px 12px; }

  .lb-row {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 12px; border-radius: 10px;
    border: 1px solid transparent;
    margin-bottom: 4px; transition: all 0.3s;
  }
  .lb-row.flash {
    border-color: rgba(251,191,36,0.5);
    background: rgba(251,191,36,0.06);
    animation: flashRow 1.5s ease forwards;
  }
  @keyframes flashRow {
    0%  { border-color:rgba(251,191,36,0.6); background:rgba(251,191,36,0.1); }
    100%{ border-color:transparent; background:transparent; }
  }
  .lb-rank {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 14px; font-weight: 800; color: var(--dimmer);
    width: 22px; text-align: center; flex-shrink: 0;
  }
  .lb-rank.top { color: var(--gold); }
  .lb-info { flex: 1; min-width: 0; }
  .lb-name {
    font-size: 13px; font-weight: 600; color: var(--text);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lb-sub { font-size: 11px; color: var(--muted); margin-top: 2px; }
  .lb-budget {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 17px; font-weight: 800; flex-shrink: 0;
  }
  .lb-role-pills { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .lb-pill {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 9px; font-weight: 700; letter-spacing: 1px;
    padding: 2px 6px; border-radius: 8px;
  }

  /* ── TICKER ── */
  .ticker-bar {
    height: 38px; flex-shrink: 0;
    background: rgba(13,24,41,0.9);
    border-top: 1px solid var(--border);
    display: flex; align-items: center; overflow: hidden;
    position: relative;
  }
  .ticker-label {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 10px; font-weight: 700; letter-spacing: 2px;
    color: var(--orange); padding: 0 16px;
    border-right: 1px solid var(--border);
    flex-shrink: 0; white-space: nowrap;
  }
  .ticker-track {
    flex: 1; overflow: hidden; position: relative;
  }
  .ticker-inner {
    display: flex; align-items: center; gap: 0;
    white-space: nowrap;
    animation: tickerScroll linear infinite;
  }
  @keyframes tickerScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-item {
    display: inline-flex; align-items: center; gap: 8px;
    font-family: 'Barlow Condensed', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 1px;
    padding: 0 32px; color: var(--text);
    border-right: 1px solid var(--border);
  }
  .ticker-dot { width: 4px; height: 4px; border-radius: 50%; background: var(--orange); flex-shrink: 0; }

  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e2a3a; border-radius: 2px; }

  .reveal-overlay {
    position: absolute; inset: 0; z-index: 50;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    animation: revealIn 0.5s ease;
  }
  @keyframes revealIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .reveal-sold {
    background: radial-gradient(ellipse at center, rgba(74,222,128,0.15) 0%, rgba(6,11,20,0.97) 65%);
  }
  .reveal-unsold {
    background: radial-gradient(ellipse at center, rgba(239,68,68,0.12) 0%, rgba(6,11,20,0.97) 65%);
  }
  .reveal-stamp {
    font-family: 'Barlow Condensed', sans-serif;
    font-size: clamp(80px, 12vw, 130px);
    font-weight: 900; letter-spacing: 8px; line-height: 1;
    animation: stampIn 0.4s cubic-bezier(0.17,0.67,0.29,1.3);
  }
  @keyframes stampIn {
    from { transform: scale(1.4); opacity: 0; }
    to   { transform: scale(1); opacity: 1; }
  }
  .reveal-player { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(24px,3.5vw,44px); font-weight: 700; color: #fff; margin-top: 14px; letter-spacing: 1px; }
  .reveal-team   { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(18px,2.5vw,32px); font-weight: 600; color: var(--blue); margin-top: 8px; letter-spacing: 2px; }
  .reveal-price  { font-family: 'Barlow Condensed', sans-serif; font-size: clamp(40px,6vw,72px); font-weight: 900; color: var(--gold); margin-top: 12px; letter-spacing: 2px; }
`;

function StatBox({ val, label, color }) {
  return (
    <div className="stat-box">
      <div className="stat-val" style={{ color }}>{val ?? "—"}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function PlayerSpotlight({ player }) {
  if (!player) {
    return (
      <div className="idle-screen">
        <div className="idle-logo">IPL 2025</div>
        <div className="idle-label">AUCTION IN PROGRESS</div>
      </div>
    );
  }

  const r = ROLE[player.type] || ROLE.Batter;
  const s = player.stats || {};
  const isBat = player.type === "Batter" || player.type === "WK" || player.type === "AllRounder";
  const isBowl = player.type === "Bowler" || player.type === "AllRounder";

  return (
    <>
      <div className="spotlight-bg" />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
          <span className="player-flag">{FLAG[player.nationality]}</span>
          <span className="player-role-badge" style={{ color: r.color, background: r.bg }}>
            {r.label}
          </span>
        </div>

        <div className="player-name">{player.name}</div>
        <div className="player-nat">{player.nationality}</div>

        <div className="base-price-row">
          <span className="base-price-label">BASE PRICE</span>
          <span className="base-price-val">{player.basePrice}</span>
        </div>

        <div className="spotlight-divider" />

        <div className="stats-row">
          <StatBox val={s.matches} label="MATCHES" color="#94a3b8" />
          {isBat && <>
            <StatBox val={s.runs}       label="RUNS"         color="#38bdf8" />
            <StatBox val={s.batAvg}     label="BAT AVG"      color="#38bdf8" />
            <StatBox val={s.strikeRate} label="STRIKE RATE"  color="#38bdf8" />
          </>}
          {isBowl && <>
            <StatBox val={s.wickets}  label="WICKETS"  color="#4ade80" />
            <StatBox val={s.bowlAvg} label="BOWL AVG" color="#4ade80" />
            <StatBox val={s.economy}  label="ECONOMY"  color="#4ade80" />
          </>}
        </div>
      </div>
    </>
  );
}

export default function ProjectorScreen() {
  const [teams, setTeams]               = useState([]);
  const [players, setPlayers]           = useState([]);
  const [currentSlug, setCurrentSlug]   = useState(null);
  const [flashTeam, setFlashTeam]       = useState(null);
  const [soldReveal, setSoldReveal]     = useState(null); // { playerName, teamName, price }
  const [unsoldReveal, setUnsoldReveal] = useState(null); // { playerName }
  const prevPlayersRef                  = useRef([]);
  const lastLiveSlugRef                 = useRef(null);
  const revealedLiveSlugRef             = useRef(null);

  useEffect(() => {
    const unsubTeams = onValue(ref(db, "teams"), snap => {
      const data = snap.val() || {};
      setTeams(Object.entries(data).map(([id, t]) => ({ id, ...t })));
    });
    const unsubPlayers = onValue(ref(db, "players"), snap => {
      const data = snap.val() || {};
      const list = Object.entries(data).map(([slug, p]) => ({ slug, ...p }));
      const previousPlayers = prevPlayersRef.current;
      const liveSlug = lastLiveSlugRef.current;
      const previousLivePlayer = liveSlug ? previousPlayers.find(p => p.slug === liveSlug) : null;
      const nextLivePlayer = liveSlug ? list.find(p => p.slug === liveSlug) : null;

      // Detect a transition on the last live player and show the projector reveal once.
      if (
        liveSlug &&
        liveSlug !== revealedLiveSlugRef.current &&
        nextLivePlayer &&
        previousLivePlayer?.status !== nextLivePlayer.status
      ) {
        if (nextLivePlayer.status === "sold") {
          setFlashTeam(nextLivePlayer.soldTo);
          setTimeout(() => setFlashTeam(null), 2000);
          setSoldReveal({ playerName: nextLivePlayer.name, soldTo: nextLivePlayer.soldTo, price: nextLivePlayer.soldPrice });
          setTimeout(() => setSoldReveal(null), 5000);
          revealedLiveSlugRef.current = liveSlug;
        } else if (nextLivePlayer.status === "unsold_final") {
          setUnsoldReveal({ playerName: nextLivePlayer.name });
          setTimeout(() => setUnsoldReveal(null), 4000);
          revealedLiveSlugRef.current = liveSlug;
        }
      }

      prevPlayersRef.current = list;
      setPlayers(list);
    });
    const unsubAuction = onValue(ref(db, "auction/currentPlayer"), snap => {
      const slug = snap.val() || null;
      if (slug) {
        lastLiveSlugRef.current = slug;
        revealedLiveSlugRef.current = null;
      }
      setCurrentSlug(slug);
    });
    return () => { unsubTeams(); unsubPlayers(); unsubAuction(); };
  }, []);

  // Derived data
  const currentPlayer = currentSlug ? players.find(p => p.slug === currentSlug) || null : null;

  const teamsWithData = teams.map(team => {
    const tp = players.filter(p => p.status === "sold" && p.soldTo === team.id);
    const spent = tp.reduce((s, p) => s + (p.soldPrice || 0), 0);
    const counts = { Batter: 0, Bowler: 0, AllRounder: 0, WK: 0 };
    tp.forEach(p => { if (counts[p.type] !== undefined) counts[p.type]++; });
    return {
      ...team,
      spent,
      budgetLeft: 100 - spent,
      playerCount: tp.length,
      foreign: tp.filter(p => p.nationality === "Foreigner").length,
      counts,
    };
  }).sort((a, b) => b.playerCount - a.playerCount || a.budgetLeft - b.budgetLeft);

  const soldPlayers = players
    .filter(p => p.status === "sold")
    .slice(-30); // last 30 for ticker

  const totalSold = players.filter(p => p.status === "sold").length;
  const totalAvail = players.filter(p => p.status === "unsold").length;

  // Ticker animation duration based on count
  const tickerDuration = Math.max(20, soldPlayers.length * 4);

  return (
    <>
      <style>{css}</style>
      <div className="proj">

        {/* HEADER */}
        <header className="proj-header">
          <div className="proj-logo">🏏 IPL AUCTION</div>
          <div className="proj-live-pill">
            <div className="live-dot" />
            <span className="proj-live-text">LIVE</span>
          </div>
          <div className="proj-header-stats">
            <div className="proj-hstat">
              <div className="proj-hstat-val" style={{ color: "#4ade80" }}>{totalSold}</div>
              <div className="proj-hstat-label">SOLD</div>
            </div>
            <div className="proj-hstat">
              <div className="proj-hstat-val" style={{ color: "#94a3b8" }}>{totalAvail}</div>
              <div className="proj-hstat-label">AVAILABLE</div>
            </div>
            <div className="proj-hstat">
              <div className="proj-hstat-val" style={{ color: "#fbbf24" }}>{teams.length}</div>
              <div className="proj-hstat-label">TEAMS</div>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="proj-body">

          {/* LEFT — SPOTLIGHT */}
          <div className="spotlight">
            {soldReveal ? (
              <div className="reveal-overlay reveal-sold">
                <div className="reveal-stamp" style={{ color: "#4ade80" }}>SOLD!</div>
                <div className="reveal-player">{soldReveal.playerName}</div>
                <div className="reveal-team">
                  → {teams.find(t => t.id === soldReveal.soldTo)?.name || "—"}
                </div>
                <div className="reveal-price">₹{soldReveal.price} Cr</div>
              </div>
            ) : unsoldReveal ? (
              <div className="reveal-overlay reveal-unsold">
                <div className="reveal-stamp" style={{ color: "#ef4444" }}>UNSOLD</div>
                <div className="reveal-player">{unsoldReveal.playerName}</div>
              </div>
            ) : (
              <PlayerSpotlight player={currentPlayer} />
            )}
          </div>

          {/* RIGHT — LEADERBOARD */}
          <div className="leaderboard">
            <div className="lb-header">
              <div className="lb-title">LIVE STANDINGS</div>
            </div>
            <div className="lb-scroll">
              {teamsWithData.map((team, i) => {
                const budgetColor = team.budgetLeft < 20 ? "#ef4444" : team.budgetLeft < 50 ? "#fbbf24" : "#4ade80";
                const isFlashing = flashTeam === team.id;
                return (
                  <div key={team.id} className={`lb-row ${isFlashing ? "flash" : ""}`}>
                    <div className={`lb-rank ${i < 3 ? "top" : ""}`}>{i + 1}</div>
                    <div className="lb-info">
                      <div className="lb-name">{team.name}</div>
                      <div className="lb-sub">{team.playerCount} players · {team.foreign} overseas</div>
                      <div className="lb-role-pills">
                        {Object.entries(team.counts).map(([role, count]) => count > 0 && (
                          <span key={role} className="lb-pill"
                            style={{ color: ROLE[role].color, background: ROLE[role].bg }}>
                            {ROLE[role].label.split("-")[0].slice(0,4)} {count}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="lb-budget" style={{ color: budgetColor }}>₹{team.budgetLeft}Cr</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* TICKER */}
        <div className="ticker-bar">
          <div className="ticker-label">SOLD</div>
          <div className="ticker-track">
            {soldPlayers.length > 0 ? (
              <div
                className="ticker-inner"
                style={{ animationDuration: `${tickerDuration}s` }}
              >
                {/* Duplicate for seamless loop */}
                {[...soldPlayers, ...soldPlayers].map((p, i) => {
                  const teamName = teams.find(t => t.id === p.soldTo)?.name || "—";
                  return (
                    <span key={i} className="ticker-item">
                      <span className="ticker-dot" />
                      {FLAG[p.nationality]} {p.name}
                      <span style={{ color: "var(--muted)" }}>→</span>
                      <span style={{ color: "#38bdf8" }}>{teamName}</span>
                      <span style={{ color: "var(--gold)", fontWeight: 800 }}>₹{p.soldPrice}Cr</span>
                    </span>
                  );
                })}
              </div>
            ) : (
              <span style={{
                fontFamily: "'Barlow Condensed',sans-serif", fontSize: 12,
                color: "var(--dimmer)", letterSpacing: 2, paddingLeft: 20,
              }}>
                NO SALES YET — AUCTION STARTING SOON
              </span>
            )}
          </div>
        </div>

      </div>
    </>
  );
}