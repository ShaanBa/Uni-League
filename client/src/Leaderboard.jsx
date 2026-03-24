import { useState, useEffect } from 'react';
import './Leaderboard.css';

function Leaderboard() {
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); 
    
    const userUniId = localStorage.getItem('uni_id'); // Grab the user's school if they are logged in

    useEffect(() => {
        const fetchLeaderboard = async () => {
            setLoading(true);
            const response = await fetch(`/api/leaderboard/${filter}`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboardData(data);
            }
            setLoading(false);
        };
        fetchLeaderboard();
    }, [filter]); // Re-runs whenever 'filter' changes

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
        <div>
            <div className="leaderboard-controls">
                <h2>{filter === 'all' ? 'Global Standings' : 'University Standings'}</h2>
                
                <select 
                    className="hextech-select" 
                    value={filter} 
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="all">Global Ladder</option>
                    {userUniId && (
                        <option value={userUniId}>My University</option>
                    )}
                </select>
            </div>

            {loading ? (
                <div>Loading the ladder...</div>
            ) : (
                <div className="leaderboard-wrapper">
                    <table className="hextech-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center' }}>Rank</th>
                                <th>Summoner</th>
                                <th>Tier</th>
                                <th>LP</th>
                                <th>Power Score</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboardData.length > 0 ? (
                                leaderboardData.map((player, index) => (
                                    <tr key={player.puuid} className={index < 3 ? 'top-3' : ''}>
                                        <td className="col-rank">{index + 1}</td>
                                        
                                        <td>
                                            <div>
                                                <span className="summoner-name">{player.game_name}</span>
                                                <span className="summoner-tag">#{player.tag}</span>
                                            </div>
                                            <div className="summoner-uni">{player.uni_name}</div>
                                        </td>
                                        
                                        <td className="col-tier" style={{ color: getRankColor(player.rank_tier) }}>
                                            {player.rank_tier} {player.rank_division !== 'N/A' ? player.rank_division : ''}
                                        </td>
                                        
                                        <td>
                                            {player.rank_tier !== 'UNRANKED' ? `${player.lp} LP` : '-'}
                                        </td>
                                        
                                        <td style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>
                                            {player.score}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                        No players found in this ladder.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;