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

  const rankColor = getRankColor(data.rankTier);
  const iconId = data.profile_icon_id || 29;
  const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;

  // Calculate Winrate details
  const totalGames = (data.wins || 0) + (data.losses || 0);
  const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;
  const winRateClass = winRate >= 55 ? 'high-winrate' : winRate < 48 ? 'low-winrate' : '';

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

      <div className="rank-line" style={{ color: rankColor }}>
        {data.rankTier}
        {data.rankDivision && data.rankDivision !== 'N/A' ? ` ${data.rankDivision}` : ''}
      </div>

      {data.rankTier !== 'UNRANKED' && (
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
      )}
    </div>
  );
}

export default PlayerCard;