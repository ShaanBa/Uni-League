import React from 'react';
import './PlayerCard.css';

function PlayerCard({ data }) {
  if (!data) return null;

  // Helper to color-code the rank text
  const getRankColor = (tier) => {
    const colors = {
      'IRON': '#514f4e',
      'BRONZE': '#8c513a',
      'SILVER': '#80989d',
      'GOLD': '#cd8837',
      'PLATINUM': '#4e9996',
      'EMERALD': '#2a7c46',
      'DIAMOND': '#576bce',
      'MASTER': '#9d48e0',
      'GRANDMASTER': '#d31a45',
      'CHALLENGER': '#f4c874',
      'UNRANKED': '#a0a6b1'
    };
    return colors[tier] || colors['UNRANKED'];
  };

  // Helper to color-code KDA ratios
  const getKdaRatioColor = (ratio) => {
    if (ratio === 'Perfect') return '#e2b13c'; // Gold-ish
    const r = parseFloat(ratio);
    if (r >= 5.0) return '#f4c874'; // Challenger Orange
    if (r >= 4.0) return '#8c9eff'; // Hextech Blue/Purple
    if (r >= 3.0) return '#20bf6b'; // Success Green
    return '#a0a6b1'; // Muted Grey
  };

  const rankColor = getRankColor(data.rankTier);
  const iconId = data.profile_icon_id || 29;
  const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;

  // CommunityDragon rank emblem mapping
  const tierNameLower = (data.rankTier || 'unranked').toLowerCase();
  const emblemUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tierNameLower}.png`;

  // Calculate Winrate details
  const totalGames = (data.wins || 0) + (data.losses || 0);
  const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;
  const winRateClass = winRate >= 55 ? 'high-winrate' : winRate < 48 ? 'low-winrate' : '';

  // Calculate achievements
  const isUnstoppable = data.recentMatches && data.recentMatches.length >= 3 && data.recentMatches.slice(0, 3).every(m => m.win);
  
  let avgKda = 0;
  if (data.recentMatches && data.recentMatches.length > 0) {
    const totalKills = data.recentMatches.reduce((sum, m) => sum + m.kills, 0);
    const totalAssists = data.recentMatches.reduce((sum, m) => sum + m.assists, 0);
    const totalDeaths = data.recentMatches.reduce((sum, m) => sum + m.deaths, 0);
    avgKda = totalDeaths === 0 ? 10.0 : parseFloat(((totalKills + totalAssists) / totalDeaths).toFixed(2));
  }
  const isKdaDaemon = avgKda >= 4.0;
  const isCarryMachine = winRate >= 55 && totalGames >= 5;

  let avgCsMin = 0;
  if (data.recentMatches && data.recentMatches.length > 0) {
    const totalCs = data.recentMatches.reduce((sum, m) => sum + m.cs, 0);
    const totalDuration = data.recentMatches.reduce((sum, m) => sum + (m.duration || 30), 0);
    avgCsMin = totalDuration > 0 ? parseFloat((totalCs / totalDuration).toFixed(1)) : 0;
  }
  const isFarmerSpecialist = avgCsMin >= 7.0;
  const isCollegiateIcon = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(data.rankTier?.toUpperCase());

  return (
    <div className="player-card">
      <div className="profile-icon-container">
        <img
          className="profile-icon"
          src={iconUrl}
          alt={`${data.gameName} profile icon`}
        />
      </div>

      <div className="player-name-row">
        {data.gameName}
        <span className="player-tag-row">#{data.tagLine || data.tag}</span>
      </div>

      <div className="rank-row-container">
        <img 
          className="rank-emblem-badge"
          src={emblemUrl} 
          alt={`${data.rankTier} emblem`} 
          onError={(e) => e.target.style.display = 'none'} 
        />
        <div className="rank-line" style={{ color: rankColor }}>
          {data.rankTier}
          {data.rankDivision && data.rankDivision !== 'N/A' ? ` ${data.rankDivision}` : ''}
        </div>
        {data.region && (
          <span style={{ fontSize: '0.75rem', padding: '2px 6px', background: 'rgba(0, 210, 241, 0.1)', border: '1px solid rgba(0, 210, 241, 0.2)', color: 'var(--hextech-blue)', borderRadius: '2px', textTransform: 'uppercase', fontWeight: 'bold' }}>
            {data.region}
          </span>
        )}
      </div>

      {data.rankTier !== 'UNRANKED' && (
        <>
          <div className="profile-stats-grid">
            <div className="stat-box">
              <span className="stat-label">LP</span>
              <span className="stat-value">{data.lp}</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Record</span>
              <span className="stat-value">{data.wins}W - {data.losses}L</span>
            </div>

            <div className="stat-box">
              <span className="stat-label">Winrate</span>
              <span className={`stat-value ${winRateClass}`}>{winRate}%</span>
            </div>
          </div>

          <div className="achievements-section">
            <div className="achievements-badges-grid">
              {isCarryMachine && (
                <span className="badge-chip carry-machine" title="Holds a 55%+ winrate over 5+ games">
                  🔥 Carry Machine
                </span>
              )}
              {isKdaDaemon && (
                <span className="badge-chip kda-daemon" title={`Outstanding recent KDA score: ${avgKda}`}>
                  ⚡ KDA Daemon
                </span>
              )}
              {isUnstoppable && (
                <span className="badge-chip unstoppable" title="On a 3+ game win streak in recent matches">
                  🏆 Unstoppable
                </span>
              )}
              {isFarmerSpecialist && (
                <span className="badge-chip farmer" title={`Maintains an average CS per minute of ${avgCsMin}`}>
                  🌾 CS Specialist
                </span>
              )}
              {isCollegiateIcon && (
                <span className="badge-chip apex-competitor" title="Reached Apex Tiers (Master, Grandmaster, Challenger)">
                  👑 Apex Legend
                </span>
              )}
              {!isCarryMachine && !isKdaDaemon && !isUnstoppable && !isFarmerSpecialist && !isCollegiateIcon && (
                <span className="badge-chip challenger-in-training" title="Play matches to unlock specialized badges">
                  🔰 Scholar Scout
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* Recent Match History Section */}
      {data.recentMatches && data.recentMatches.length > 0 && (
        <>
          <div className="matches-section-title">Recent Matches</div>
          <div className="matches-container">
            {data.recentMatches.map((match) => {
              const matchWinClass = match.win ? 'match-row-win' : 'match-row-loss';
              const outcomeText = match.win ? 'Win' : 'Loss';
              const outcomeClass = match.win ? 'text-win' : 'text-loss';
              
              // Data Dragon champion face icon URL
              const champImgUrl = `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${match.championName}.png`;
              
              // Calculate KDA metrics
              const kdaRatioVal = match.deaths === 0 ? 'Perfect' : ((match.kills + match.assists) / match.deaths).toFixed(2);
              const kdaRatioColor = getKdaRatioColor(kdaRatioVal);
              
              return (
                <div key={match.matchId} className={`match-row ${matchWinClass}`}>
                  <div className="match-champ-info">
                    <img 
                      className="match-champ-icon" 
                      src={champImgUrl} 
                      alt={match.championName} 
                      onError={(e) => {
                        e.target.onerror = null;
                        // Fallback generic icon
                        e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';
                      }}
                    />
                    <div>
                      <div className="match-champ-name">{match.championName}</div>
                      <div className={`match-outcome-text ${outcomeClass}`}>{outcomeText}</div>
                    </div>
                  </div>
                  
                  <div className="match-stats-info">
                    <div className="match-kda-text">
                      {match.kills} / <span style={{ color: '#eb4d4b', fontWeight: 'bold' }}>{match.deaths}</span> / {match.assists}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: kdaRatioColor, marginTop: '1px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {kdaRatioVal === 'Perfect' ? 'Perfect KDA' : `${kdaRatioVal} KDA`}
                    </div>
                    <div className="match-meta-text">{match.cs} CS • {match.duration}m</div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default PlayerCard;