import React from 'react';
import './PlayerCard.css'; // We'll create this file next!

function PlayerCard({ data }) {
    if (!data) return null;

    // A helper function to color-code the rank text
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

    return (
        <div className="player-card">
            <div className="player-header">
                <h2>{data.gameName}</h2>
                <span className="tag-line">#{data.tagLine}</span>
            </div>
            
<div className="rank-info" style={{ borderColor: rankColor }}>
    <div className="tier-text" style={{ color: rankColor }}>
        {data.rankTier} {data.rankDivision !== 'N/A' ? data.rankDivision : ''}
    </div>
    {data.rankTier !== 'UNRANKED' && (
        <div className="lp-text">
            {data.lp} LP | {data.wins}W - {data.losses}L 
            ({data.wins + data.losses > 0 ? Math.round((data.wins / (data.wins + data.losses)) * 100) : 0}%)
        </div>
    )}
</div>
        </div>
    );
}

export default PlayerCard;