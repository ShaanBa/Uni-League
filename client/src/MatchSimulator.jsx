import React, { useState, useEffect, useRef } from 'react';
import './MatchSimulator.css';

function MatchSimulator() {
  const [universities, setUniversities] = useState([]);
  const [uni1, setUni1] = useState('');
  const [uni2, setUni2] = useState('');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [displayedLogs, setDisplayedLogs] = useState([]);
  const [currentLogIdx, setCurrentLogIdx] = useState(0);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState(null);
  
  const logEndRef = useRef(null);

  // Fetch universities for dropdowns
  useEffect(() => {
    const fetchUnis = async () => {
      try {
        const res = await fetch('/api/leaderboard/universities');
        if (res.ok) {
          const data = await res.json();
          setUniversities(data);
          if (data.length > 0) {
            setUni1(data[0].uni_id);
            if (data.length > 1) {
              setUni2(data[1].uni_id);
            } else {
              setUni2(data[0].uni_id);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching schools:', err);
      }
    };
    fetchUnis();
  }, []);

  // Autoscroll the logs
  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [displayedLogs]);

  // Handle the log animation typing effect
  useEffect(() => {
    if (simulating && simulation && currentLogIdx < simulation.logs.length) {
      const timer = setTimeout(() => {
        setDisplayedLogs((prev) => [...prev, simulation.logs[currentLogIdx]]);
        setCurrentLogIdx((prev) => prev + 1);
      }, 1500); // 1.5s delay between events for pacing
      return () => clearTimeout(timer);
    } else if (simulation && currentLogIdx >= simulation.logs.length) {
      setSimulating(false);
    }
  }, [simulating, simulation, currentLogIdx]);

  const handleSimulate = async () => {
    if (!uni1 || !uni2) {
      setError('Please select two universities.');
      return;
    }
    if (uni1 === uni2) {
      setError('Please select two different universities for simulation.');
      return;
    }

    setError(null);
    setLoading(true);
    setSimulation(null);
    setDisplayedLogs([]);
    setCurrentLogIdx(0);

    try {
      const res = await fetch('/api/simulate_match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uni_id_1: uni1,
          uni_id_2: uni2,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSimulation(data);
        setSimulating(true);
      } else {
        setError(data.error || 'Failed to simulate match.');
      }
    } catch (err) {
      setError('Could not connect to the simulation server.');
    } finally {
      setLoading(false);
    }
  };

  const skipSimulation = () => {
    if (simulation) {
      setDisplayedLogs(simulation.logs);
      setCurrentLogIdx(simulation.logs.length);
      setSimulating(false);
    }
  };

  const getLogClass = (type) => {
    switch (type) {
      case 'kill': return 'log-kill';
      case 'fight': return 'log-fight';
      case 'objective': return 'log-objective';
      case 'steal': return 'log-steal';
      case 'victory': return 'log-victory';
      default: return 'log-default';
    }
  };

  const getRankColor = (tier) => {
    const colors = {
      'IRON': '#514f4e', 'BRONZE': '#8c513a', 'SILVER': '#80989d',
      'GOLD': '#cd8837', 'PLATINUM': '#4e9996', 'EMERALD': '#2a7c46',
      'DIAMOND': '#576bce', 'MASTER': '#9d48e0', 'GRANDMASTER': '#d31a45',
      'CHALLENGER': '#f4c874', 'UNRANKED': '#a0a6b1'
    };
    return colors[tier] || colors['UNRANKED'];
  };

  return (
    <div className="sim-container">
      <div className="sim-header">
        <h2>Collegiate Summoners Clash</h2>
        <p>Simulate a custom 5v5 scrim between two schools based on live competitor rankings on the Rift.</p>
        <div className="hextech-divider">
          <div className="hextech-divider-line"></div>
          <div className="hextech-divider-diamond"></div>
        </div>
      </div>

      {error && <div className="error-message" style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>{error}</div>}

      {/* Selectors */}
      <div className="sim-controls hextech-card">
        <div className="sim-select-group">
          <label>Blue Team</label>
          <select 
            className="hextech-select"
            value={uni1}
            onChange={(e) => setUni1(e.target.value)}
            disabled={simulating || loading}
          >
            {universities.map(u => (
              <option key={`uni1-${u.uni_id}`} value={u.uni_id}>{u.uni_name}</option>
            ))}
          </select>
        </div>

        <div className="vs-divider">VS</div>

        <div className="sim-select-group">
          <label>Red Team</label>
          <select 
            className="hextech-select"
            value={uni2}
            onChange={(e) => setUni2(e.target.value)}
            disabled={simulating || loading}
          >
            {universities.map(u => (
              <option key={`uni2-${u.uni_id}`} value={u.uni_id}>{u.uni_name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button 
          onClick={handleSimulate} 
          disabled={loading || simulating}
          style={{ padding: '0.85rem 2.5rem', fontSize: '1rem' }}
        >
          {loading ? 'Analyzing Stats...' : 'Start Match Simulation'}
        </button>
      </div>

      {loading && (
        <div className="loading-sim">
          <div className="spinner"></div>
          <p>Scouting player masteries and loading Summoner's Rift...</p>
        </div>
      )}

      {/* Simulator Board */}
      {simulation && (
        <div className="sim-board">
          
          {/* Roster lineups */}
          <div className="sim-teams">
            {/* Team 1 (Blue) */}
            <div className="sim-team-panel blue-side hextech-card">
              <div className="team-meta">
                <img 
                  src={simulation.winner === universities.find(u => u.uni_id == uni1)?.uni_name ? simulation.winner_logo : simulation.loser_logo || "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"} 
                  alt="" 
                  onError={(e) => e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"}
                  className="team-logo"
                />
                <h3>{universities.find(u => u.uni_id == uni1)?.uni_name}</h3>
                <span className="power-indicator">Avg Power Score: {simulation.power1}</span>
              </div>
              <div className="roster-list">
                {simulation.lineup1.map((p, idx) => (
                  <div key={`l1-${idx}`} className="roster-row">
                    <img 
                      src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${p.champion.replace(/\s+/g, '')}.png`}
                      alt={p.champion}
                      onError={(e) => e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"}
                      className="champ-avatar"
                    />
                    <div className="player-details">
                      <span className="player-name">{p.game_name}</span>
                      <span className="player-champ">{p.champion}</span>
                    </div>
                    <span className="player-rank" style={{ color: getRankColor(p.rank_tier) }}>
                      {p.rank_tier} {p.rank_division !== 'N/A' ? p.rank_division : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Team 2 (Red) */}
            <div className="sim-team-panel red-side hextech-card">
              <div className="team-meta">
                <img 
                  src={simulation.winner === universities.find(u => u.uni_id == uni2)?.uni_name ? simulation.winner_logo : simulation.loser_logo || "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"} 
                  alt="" 
                  onError={(e) => e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"}
                  className="team-logo"
                />
                <h3>{universities.find(u => u.uni_id == uni2)?.uni_name}</h3>
                <span className="power-indicator">Avg Power Score: {simulation.power2}</span>
              </div>
              <div className="roster-list">
                {simulation.lineup2.map((p, idx) => (
                  <div key={`l2-${idx}`} className="roster-row">
                    <img 
                      src={`https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${p.champion.replace(/\s+/g, '')}.png`}
                      alt={p.champion}
                      onError={(e) => e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg"}
                      className="champ-avatar"
                    />
                    <div className="player-details">
                      <span className="player-name">{p.game_name}</span>
                      <span className="player-champ">{p.champion}</span>
                    </div>
                    <span className="player-rank" style={{ color: getRankColor(p.rank_tier) }}>
                      {p.rank_tier} {p.rank_division !== 'N/A' ? p.rank_division : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Play-by-play ticker */}
          <div className="sim-logs-container hextech-card">
            <div className="logs-header">
              <h4>Live Match Feed</h4>
              {simulating && (
                <button className="skip-btn" onClick={skipSimulation}>
                  Skip to End
                </button>
              )}
            </div>
            <div className="logs-scroller">
              {displayedLogs.map((log, idx) => (
                <div key={`log-${idx}`} className={`log-entry ${getLogClass(log.type)}`}>
                  <span className="log-time">[{log.time}]</span>
                  <div className="log-body">
                    <strong>{log.title}</strong>
                    <p>{log.description}</p>
                  </div>
                </div>
              ))}
              {simulating && (
                <div className="log-typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Victory Banner */}
          {!simulating && currentLogIdx >= simulation.logs.length && (
            <div className="victory-banner animate-fade-in hextech-card">
              <div className="victory-trophy">🏆</div>
              <h2>VICTORY</h2>
              <h3>{simulation.winner}</h3>
              <div className="mvp-card hextech-card">
                <span className="mvp-badge">MATCH MVP</span>
                <span className="mvp-name">{simulation.mvp}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MatchSimulator;
