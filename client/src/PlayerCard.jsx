import './PlayerCard.css';
import { getRankColor, FALLBACK_ICON, DDRAGON_VERSION, championImgUrl } from './utils';

function PlayerCard({ data }) {
  if (!data) return null;



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
  const iconUrl = iconId === 29 ? FALLBACK_ICON : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`;

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
    <div className="player-card hextech-card">
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

      {/* Bio and Social Handles */}
      {(data.bio || data.discord_handle || data.twitter_handle) && (
        <div className="player-socials-box" style={{ margin: '8px auto 12px auto', width: '90%', padding: '8px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(2,6,12,0.4)', borderRadius: '2px', textAlign: 'center' }}>
          {data.bio && (
            <p className="player-bio" style={{ margin: '0 0 6px 0', fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic', wordBreak: 'break-word', lineHeight: '1.4' }}>
              "{data.bio}"
            </p>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '0.75rem' }}>
            {data.discord_handle && (
              <span style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <strong style={{ color: 'var(--hextech-blue)' }}>Discord:</strong> {data.discord_handle}
              </span>
            )}
            {data.twitter_handle && (
              <span style={{ color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <strong style={{ color: 'var(--gold-primary)' }}>X:</strong> @{data.twitter_handle.replace(/^@/, '')}
              </span>
            )}
          </div>
        </div>
      )}

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
                  [ CARRY MACHINE ]
                </span>
              )}
              {isKdaDaemon && (
                <span className="badge-chip kda-daemon" title={`Outstanding recent KDA score: ${avgKda}`}>
                  [ KDA DAEMON ]
                </span>
              )}
              {isUnstoppable && (
                <span className="badge-chip unstoppable" title="On a 3+ game win streak in recent matches">
                  [ UNSTOPPABLE ]
                </span>
              )}
              {isFarmerSpecialist && (
                <span className="badge-chip farmer" title={`Maintains an average CS per minute of ${avgCsMin}`}>
                  [ CS SPECIALIST ]
                </span>
              )}
              {isCollegiateIcon && (
                <span className="badge-chip apex-competitor" title="Reached Apex Tiers (Master, Grandmaster, Challenger)">
                  [ APEX LEGEND ]
                </span>
              )}
              {!isCarryMachine && !isKdaDaemon && !isUnstoppable && !isFarmerSpecialist && !isCollegiateIcon && (
                <span className="badge-chip challenger-in-training" title="Play matches to unlock specialized badges">
                  [ SCHOLAR RECRUIT ]
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
              const champImgUrl = championImgUrl(match.championName);
              
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
                        e.target.src = FALLBACK_ICON;
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