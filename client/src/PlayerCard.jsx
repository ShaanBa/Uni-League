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
    
    // Stable URL for Rank Emblems from CommunityDragon
    // Note: We use .toLowerCase() because the filenames are lowercase
    const tier = data.rankTier.toLowerCase();
    const iconUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-${tier}.png`;

    return (
        <div className="player-card" style={{ borderLeft: `6px solid ${rankColor}` }}>
            <div className="player-body">
                <div className="rank-icon-container">
                    <img 
                        src={iconUrl} 
                        alt={data.rankTier} 
                        className="rank-icon"
                        // Fallback to unranked if the specific tier image fails
                        onError={(e) => { 
                            e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem/emblem-unranked.png'; 
                        }} 
                    />
                </div>
                
                <div className="player-info">
                    <div className="player-header">
                        <h2>{data.gameName}</h2>
                        <span className="tag-line">#{data.tagLine}</span>
                    </div>
                    
                    <div className="rank-details">
                        <div className="tier-text" style={{ color: rankColor }}>
                            {data.rankTier} {data.rankDivision !== 'N/A' ? data.rankDivision : ''}
                        </div>
                        {data.rankTier !== 'UNRANKED' && (
                            <div className="lp-stats">
                                <span className="lp-value">{data.lp} LP</span>
                                <span className="win-loss">
                                    {data.wins}W - {data.losses}L 
                                    ({data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0}%)
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default PlayerCard;