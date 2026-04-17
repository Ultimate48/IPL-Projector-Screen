import { useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import "./App.css";

const ROLE = {
  Batter:     { color: "#38bdf8", bg: "rgba(56,189,248,0.12)",  label: "BATSMAN" },
  Bowler:     { color: "#4ade80", bg: "rgba(74,222,128,0.12)",  label: "BOWLER"  },
  AllRounder: { color: "#fb923c", bg: "rgba(251,146,60,0.12)",  label: "ALL-ROUNDER" },
  WK:         { color: "#c084fc", bg: "rgba(192,132,252,0.12)", label: "WICKET KEEPER" },
};

const FLAG = { Indian: "🇮🇳", Foreigner: "🌏" };

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
        <div className="idle-logo">IPL 2026</div>
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