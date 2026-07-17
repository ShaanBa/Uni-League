import { useState, useEffect } from 'react';
import './Leaderboard.css';

function Leaderboard() {
    const [standingsType, setStandingsType] = useState('individual'); // 'individual' or 'university'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [uniLeaderboardData, setUniLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); 
    
    const userUniId = localStorage.getItem('uni_id'); // Grab the user's school if they are logged in

    // Fetch individual players standings
    useEffect(() => {
        if (standingsType === 'individual') {
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
        }
    }, [filter, standingsType]); // Re-runs whenever filter or standingsType change

    // Fetch school standings
    useEffect(() => {
        if (standingsType === 'university') {
            const fetchUniLeaderboard = async () => {
                setLoading(true);
                const response = await fetch('/api/leaderboard/universities');
                if (response.ok) {
                    const data = await response.json();
                    setUniLeaderboardData(data);
                }
                setLoading(false);
            };
            fetchUniLeaderboard();
        }
    }, [standingsType]);

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
            {/* Top Navigation Tabs */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '1rem' }}>
                <button 
                    onClick={() => setStandingsType('individual')}
                    style={{ 
                        background: standingsType === 'individual' ? 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-dark) 100%)' : 'transparent',
                        color: standingsType === 'individual' ? 'var(--bg-dark)' : 'var(--gold-primary)',
                        border: '1px solid var(--gold-primary)',
                        borderRadius: '4px'
                    }}
                >
                    Individual Players
                </button>
                <button 
                    onClick={() => setStandingsType('university')}
                    style={{ 
                        background: standingsType === 'university' ? 'linear-gradient(135deg, var(--gold-primary) 0%, var(--gold-dark) 100%)' : 'transparent',
                        color: standingsType === 'university' ? 'var(--bg-dark)' : 'var(--gold-primary)',
                        border: '1px solid var(--gold-primary)',
                        borderRadius: '4px'
                    }}
                >
                    University Standings
                </button>
            </div>

            {/* Title & Filter Controls */}
            <div className="leaderboard-controls">
                <h2>
                    {standingsType === 'university' 
                        ? 'Collegiate Rankings' 
                        : (filter === 'all' ? 'Global Standings' : 'University Standings')}
                </h2>
                
                {standingsType === 'individual' && (
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
                )}
            </div>

            {loading ? (
                <div style={{ margin: '3rem auto', fontStyle: 'italic', color: 'var(--gold-primary)' }}>Loading standings...</div>
            ) : (
                <div className="leaderboard-wrapper">
                    {standingsType === 'individual' ? (
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
                                    leaderboardData.map((player, index) => {
                                        const tierNameLower = (player.rank_tier || 'unranked').toLowerCase();
                                        const emblemUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini/${tierNameLower}.png`;
                                        
                                        return (
                                            <tr 
                                                key={player.puuid} 
                                                className={index === 0 ? 'top-3 top-3-1' : index === 1 ? 'top-3 top-3-2' : index === 2 ? 'top-3 top-3-3' : ''}
                                            >
                                                <td className="col-rank">{index + 1}</td>
                                                
                                                <td>
                                                    <div>
                                                        <span className="summoner-name">{player.game_name}</span>
                                                        <span className="summoner-tag">#{player.tag}</span>
                                                    </div>
                                                    <div className="summoner-uni">{player.uni_name}</div>
                                                </td>
                                                
                                                <td className="col-tier" style={{ color: getRankColor(player.rank_tier) }}>
                                                    <img 
                                                        src={emblemUrl} 
                                                        alt="" 
                                                        style={{ width: '22px', height: '22px', marginRight: '6px', verticalAlign: 'middle' }}
                                                        onError={(e) => e.target.style.display = 'none'} 
                                                    />
                                                    {player.rank_tier} {player.rank_division !== 'N/A' ? player.rank_division : ''}
                                                </td>
                                                
                                                <td>
                                                    {player.rank_tier !== 'UNRANKED' ? `${player.lp} LP` : '-'}
                                                </td>
                                                
                                                <td style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>
                                                    {player.score}
                                                </td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                            No players found in this standings list.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        // --- University Standings Table ---
                        <table className="hextech-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'center' }}>Rank</th>
                                    <th>University</th>
                                    <th>Domain</th>
                                    <th>Competitors</th>
                                    <th>School Power Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uniLeaderboardData.length > 0 ? (
                                    uniLeaderboardData.map((uni, index) => (
                                        <tr 
                                            key={uni.uni_id} 
                                            className={index === 0 ? 'top-3 top-3-1' : index === 1 ? 'top-3 top-3-2' : index === 2 ? 'top-3 top-3-3' : ''}
                                        >
                                            <td className="col-rank">{index + 1}</td>
                                            
                                            <td>
                                                <div className="summoner-name" style={{ fontFamily: 'Cinzel', letterSpacing: '1px' }}>
                                                    {uni.uni_name}
                                                </div>
                                            </td>
                                            
                                            <td>
                                                <span style={{ color: 'var(--hextech-blue)', fontSize: '0.9rem' }}>
                                                    @{uni.uni_domain}
                                                </span>
                                            </td>
                                            
                                            <td style={{ fontWeight: '600' }}>
                                                {uni.competitor_count} active
                                            </td>
                                            
                                            <td style={{ color: 'var(--gold-primary)', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                                {uni.total_power_score} pts
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '3rem' }}>
                                            No universities registered in the system.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}

export default Leaderboard;