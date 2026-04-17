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
const DEFAULT_HEADSHOT = "https://documents.iplt20.com/ipl/assets/images/Default-Men.png";

function StatBox({ val, label, color }) {
  return (
    <div className="stat-box">
      <div className="stat-val" style={{ color }}>{val ?? "—"}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function PlayerHeadshot({ player }) {
  const [imgError, setImgError] = useState(false);
  const url = player?.headshotUrl;
  useEffect(() => { setImgError(false); }, [player?.slug]);
  return (
    <img
      src={(!url || imgError) ? DEFAULT_HEADSHOT : url}
      alt={player.name}
      onError={() => setImgError(true)}
      className="h-120 w-120"
    />
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

  const r     = ROLE[player.type] || ROLE.Batter;
  const s     = player.stats || {};
  const isBat  = player.type === "Batter" || player.type === "WK" || player.type === "AllRounder";
  const isBowl = player.type === "Bowler" || player.type === "AllRounder";

  return (
    <>
      <div className="spotlight-bg" />
      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
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
          </div>
          <PlayerHeadshot player={player} />
        </div>

        <div className="spotlight-divider" />

        <div className="stats-row">
          <StatBox val={s.matches} label="MATCHES" color="#94a3b8" />
          {isBat && <>
            <StatBox val={s.runs}       label="RUNS"        color="#38bdf8" />
            <StatBox val={s.batAvg}     label="BAT AVG"     color="#38bdf8" />
            <StatBox val={s.strikeRate} label="STRIKE RATE" color="#38bdf8" />
          </>}
          {isBowl && <>
            <StatBox val={s.wickets} label="WICKETS"  color="#4ade80" />
            <StatBox val={s.bowlAvg} label="BOWL AVG" color="#4ade80" />
            <StatBox val={s.economy} label="ECONOMY"  color="#4ade80" />
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
  const [soldReveal, setSoldReveal]     = useState(null); // { playerName, soldTo }
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
      const prev     = prevPlayersRef.current;
      const liveSlug = lastLiveSlugRef.current;
      const prevLive = liveSlug ? prev.find(p => p.slug === liveSlug) : null;
      const nextLive = liveSlug ? list.find(p => p.slug === liveSlug) : null;

      if (
        liveSlug &&
        liveSlug !== revealedLiveSlugRef.current &&
        nextLive &&
        prevLive?.status !== nextLive.status
      ) {
        if (nextLive.status === "sold") {
          setSoldReveal({ playerName: nextLive.name, soldTo: nextLive.soldTo });
          setTimeout(() => setSoldReveal(null), 5000);
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
      if (slug) {
        lastLiveSlugRef.current    = slug;
        revealedLiveSlugRef.current = null;
      }
      setCurrentSlug(slug);
    });

    return () => { unsubTeams(); unsubPlayers(); unsubAuction(); };
  }, []);

  const currentPlayer  = currentSlug ? players.find(p => p.slug === currentSlug) || null : null;
  const soldPlayers    = players.filter(p => p.status === "sold").slice(-30);
  const totalSold      = players.filter(p => p.status === "sold").length;
  const totalAvail     = players.filter(p => p.status === "unsold").length;
  const tickerDuration = Math.max(20, soldPlayers.length * 4);

  return (
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

      {/* BODY — spotlight takes full width now */}
      <div className="proj-body">
        <div className="spotlight" style={{ flex: 1, borderRight: "none" }}>
          {soldReveal ? (
            <div className="reveal-overlay reveal-sold">
              <div className="reveal-stamp" style={{ color: "#4ade80" }}>SOLD!</div>
              <div className="reveal-player">{soldReveal.playerName}</div>
              <div className="reveal-team">
                → {teams.find(t => t.id === soldReveal.soldTo)?.name || "—"}
              </div>
              {/* price intentionally removed */}
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
      </div>

      {/* TICKER */}
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
                    <span style={{ color: "#38bdf8" }}>{teamName}</span>
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
  );
}