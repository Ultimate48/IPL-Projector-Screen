import { useEffect, useState, useRef } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "./firebase";
import "./App.css";

const ROLE = {
  Batter:     { color: "#38bdf8", bg: "rgba(56,189,248,0.15)",  label: "BATSMAN" },
  Bowler:     { color: "#4ade80", bg: "rgba(74,222,128,0.15)",  label: "BOWLER"  },
  AllRounder: { color: "#fb923c", bg: "rgba(251,146,60,0.15)",  label: "ALL-ROUNDER" },
  WK:         { color: "#c084fc", bg: "rgba(192,132,252,0.15)", label: "WICKET KEEPER" },
};

const RANK_CLASS = ["gold", "silver", "bronze"];
const FLAG = { Indian: "🇮🇳", Foreigner: "🌏" };
const DEFAULT_HEADSHOT = "https://documents.iplt20.com/ipl/assets/images/Default-Men.png";


function PlayerHeadshot({ player }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [player?.slug]);
  const src = (!player?.headshotUrl || err) ? DEFAULT_HEADSHOT : player.headshotUrl;
  return <img key={player?.slug} src={src} alt={player?.name} onError={() => setErr(true)} />;
}

function StatBox({ val, label, color }) {
  return (
    <div className="p2-stat" style={{ borderTopColor: color }}>
      <div className="p2-stat-val" style={{ color }}>{val ?? "—"}</div>
      <div className="p2-stat-label">{label}</div>
    </div>
  );
}

function PlayerSpotlight({ player }) {
  const r     = ROLE[player.type] || ROLE.Batter;
  const s     = player.stats || {};
  const isBat  = ["Batter", "WK", "AllRounder"].includes(player.type);
  const isBowl = ["Bowler", "AllRounder"].includes(player.type);

  return (
    <div className="spotlight" key={player.slug}>
      <div className="spotlight-photo">
        <div className="spotlight-photo-glow" />
        <div className="spotlight-photo-fade" />
        <PlayerHeadshot player={player} />
      </div>
      <div className="spotlight-info">
        <div className="p2-flag">{FLAG[player.nationality]}</div>
        <div className="p2-role-badge" style={{ color: r.color, background: r.bg }}>{r.label}</div>
        <div className="p2-name">{player.name}</div>
        <div className="p2-nat">{player.nationality}</div>
        <div className="p2-base-row">
          <span className="p2-base-label">BASE PRICE</span>
          <span className="p2-base-val">{player.basePrice}</span>
        </div>
        <div className="p2-stats">
          <StatBox val={s.matches}    label="MATCHES"      color="#94a3b8" />
          {isBat && <>
            <StatBox val={s.runs}       label="RUNS"         color="#38bdf8" />
            <StatBox val={s.batAvg}     label="BAT AVG"      color="#38bdf8" />
            <StatBox val={s.strikeRate} label="STRIKE RATE"  color="#38bdf8" />
          </>}
          {isBowl && <>
            <StatBox val={s.wickets} label="WICKETS"  color="#4ade80" />
            <StatBox val={s.bowlAvg} label="BOWL AVG" color="#4ade80" />
            <StatBox val={s.economy} label="ECONOMY"  color="#4ade80" />
          </>}
        </div>
      </div>
      <div className="auction-strip" />
    </div>
  );
}

function IdleScreen() {
  return (
    <div className="idle-screen">
      <div className="idle-glow-ring" />
      <div className="idle-bat-icon">🏏</div>
      <div className="idle-year">2026</div>
      <div className="idle-title">IPL AUCTION</div>
      <div className="idle-divider" />
      <div className="idle-sub">
        <span className="idle-sub-dot" />
        AUCTION IN PROGRESS
      </div>
    </div>
  );
}

function SoldReveal({ data, teams }) {
  const teamName = teams.find(t => t.id === data?.soldTo)?.name || "—";
  return (
    <div className="reveal-overlay reveal-sold">
      <div className="reveal-stamp" style={{ color: "#4ade80" }}>SOLD!</div>
      <div className="reveal-player">{data?.playerName}</div>
      <div className="reveal-team">→ {teamName}</div>
    </div>
  );
}

function UnsoldReveal({ data }) {
  return (
    <div className="reveal-overlay reveal-unsold">
      <div className="reveal-stamp" style={{ color: "#ef4444" }}>UNSOLD</div>
      <div className="reveal-player">{data?.playerName}</div>
    </div>
  );
}

export default function ProjectorScreen() {
  const [teams, setTeams]             = useState([]);
  const [players, setPlayers]         = useState([]);
  const [currentSlug, setCurrentSlug] = useState(null);
  const [soldReveal, setSoldReveal]     = useState(null);
  const [unsoldReveal, setUnsoldReveal] = useState(null);
  const [flashTeam, setFlashTeam]       = useState(null);
  const prevPlayersRef      = useRef([]);
  const lastLiveSlugRef     = useRef(null);
  const revealedLiveSlugRef = useRef(null);

  useEffect(() => {
    const unsubTeams = onValue(ref(db, "teams"), snap => {
      const data = snap.val() || {};
      setTeams(Object.entries(data).map(([id, t]) => ({ id, ...t })));
    });
    const unsubPlayers = onValue(ref(db, "players"), snap => {
      const data = snap.val() || {};
      let list;
      if (Array.isArray(data)) {
        list = data.map((p, i) => p ? ({ ...p, slug: p.slug || String(i) }) : null).filter(Boolean);
      } else {
        list = Object.entries(data).map(([slug, p]) => ({ slug, ...p }));
      }
      const prev     = prevPlayersRef.current;
      const liveSlug = lastLiveSlugRef.current;
      const prevLive = liveSlug ? prev.find(p => p.slug === liveSlug) : null;
      const nextLive = liveSlug ? list.find(p => p.slug === liveSlug) : null;
      if (liveSlug && liveSlug !== revealedLiveSlugRef.current && nextLive &&
          prevLive?.status !== nextLive.status) {
        if (nextLive.status === "sold") {
          setFlashTeam(nextLive.soldTo);
          setTimeout(() => setFlashTeam(null), 2500);
          setSoldReveal({ playerName: nextLive.name, soldTo: nextLive.soldTo, price: nextLive.soldPrice });
          setTimeout(() => setSoldReveal(null), 5500);
          revealedLiveSlugRef.current = liveSlug;
        } else if (nextLive.status === "unsold_final") {
          setUnsoldReveal({ playerName: nextLive.name });
          setTimeout(() => setUnsoldReveal(null), 4000);
          revealedLiveSlugRef.current = liveSlug;
        }
      }
      prevPlayersRef.current = list;
      setPlayers(list);
    });
    const unsubAuction = onValue(ref(db, "auction/currentPlayer"), snap => {
      const slug = snap.val() || null;
      if (slug) { lastLiveSlugRef.current = slug; revealedLiveSlugRef.current = null; }
      setCurrentSlug(slug);
    });
    return () => { unsubTeams(); unsubPlayers(); unsubAuction(); };
  }, []);

  const currentPlayer  = currentSlug ? players.find(p => p.slug === currentSlug) || null : null;
  const teamsWithData  = teams.map(team => {
    const tp    = players.filter(p => p.status === "sold" && p.soldTo === team.id);
    const spent = tp.reduce((s, p) => s + (p.soldPrice || 0), 0);
    const counts = { Batter: 0, Bowler: 0, AllRounder: 0, WK: 0 };
    tp.forEach(p => { if (counts[p.type] !== undefined) counts[p.type]++; });
    const teamBudget = team.budget ?? 110;
    return { ...team, budget: teamBudget, spent, budgetLeft: teamBudget - spent, playerCount: tp.length,
             foreign: tp.filter(p => p.nationality === "Foreigner").length, counts };
  });

  const soldPlayers    = players.filter(p => p.status === "sold").slice(-40);
  const totalSold      = players.filter(p => p.status === "sold").length;
  const totalAvail     = players.filter(p => p.status === "unsold").length;
  const tickerDuration = Math.max(24, soldPlayers.length * 4);

  return (
    <div className="proj">
      <header className="proj-header">
        <div className="proj-logo">🏏 IPL AUCTION</div>
        <div className="proj-logo-divider" />
        <div className="proj-live-pill">
          <div className="live-dot" />
          <span className="proj-live-text">LIVE</span>
        </div>
        <div className="proj-header-stats">
          <div className="proj-hstat">
            <div className="proj-hstat-val" style={{ color: "#4ade80" }}>{totalSold}</div>
            <div className="proj-hstat-label">Sold</div>
          </div>
          <div className="proj-hstat">
            <div className="proj-hstat-val" style={{ color: "#94a3b8" }}>{totalAvail}</div>
            <div className="proj-hstat-label">Available</div>
          </div>
          <div className="proj-hstat">
            <div className="proj-hstat-val" style={{ color: "#fbbf24" }}>{teams.length}</div>
            <div className="proj-hstat-label">Teams</div>
          </div>
        </div>
      </header>

      <div className="proj-body">
        {soldReveal    && <SoldReveal data={soldReveal} teams={teamsWithData} />}
        {!soldReveal   && unsoldReveal  && <UnsoldReveal data={unsoldReveal} />}
        {!soldReveal   && !unsoldReveal && currentPlayer  && <PlayerSpotlight player={currentPlayer} />}
        {!soldReveal   && !unsoldReveal && !currentPlayer && <IdleScreen />}
      </div>

      <div className="ticker-bar">
        <div className="ticker-label">SOLD</div>
        <div className="ticker-track">
          {soldPlayers.length > 0 ? (
            <div className="ticker-inner" style={{ animationDuration: `${tickerDuration}s` }}>
              {[...soldPlayers, ...soldPlayers].map((p, i) => {
                const teamName = teams.find(t => t.id === p.soldTo)?.name || "—";
                return (
                  <span key={i} className="ticker-item">
                    <span className="ticker-dot" />
                    {FLAG[p.nationality]} {p.name}
                    <span style={{ color: "var(--muted)" }}>→</span>
                    <span style={{ color: "#38bdf8", fontWeight: 800 }}>{teamName}</span>
                    <span className="ticker-sep">|</span>
                  </span>
                );
              })}
            </div>
          ) : (
            <span style={{ fontFamily:"'Barlow Condensed',sans-serif", fontSize:13,
              color:"var(--dimmer)", letterSpacing:3, paddingLeft:24, fontWeight:700 }}>
              AUCTION STARTING SOON — STAY TUNED
            </span>
          )}
        </div>
      </div>
    </div>
  );
}