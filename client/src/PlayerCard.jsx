import React from 'react';
import './PlayerCard.css';

function PlayerCard({ data }) {
    // Calculate Win Rate
    const totalGames = data.wins + data.losses;
    const winRate = totalGames > 0 ? Math.round((data.wins / totalGames) * 100) : 0;

    // Get the Rank Icon from a community CDN
    const rankIconUrl = `https://raw.githubusercontent.com/CommunityDragon/CanisBackery/master/data/assets/ux/mastery/mastery_icon_${data.rankTier.toLowerCase()}.png`;

    return (
        <div className="player-card">
            <div className="rank-emblem-container">
                <img 
                    src={rankIconUrl} 
                    alt={data.rankTier} 
                    className="rank-emblem"
                    onError={(e) => { e.target.src = 'https://raw.githubusercontent.com/CommunityDragon/CanisBackery/master/data/assets/ux/mastery/mastery_icon_unranked.png'; }}
                />
            </div>
            
            <div className="player-info">
                <h3>{data.gameName} <span className="tagline">#{data.tagLine}</span></h3>
                <p className="rank-text">{data.rankTier} {data.rankDivision}</p>
                <p className="lp-text">{data.lp} LP</p>
            </div>

            <div className="stats-container">
                <div className="stat-item">
                    <span className="stat-label">Win Rate</span>
                    <span className="stat-value">{winRate}%</span>
                </div>
                <div className="stat-item">
                    <span className="stat-label">W/L</span>
                    <span className="stat-value">{data.wins}W {data.losses}L</span>
                </div>
            </div>
        </div>
    );
}

export default PlayerCard;