import { useState, useEffect } from 'react';
import './Leaderboard.css';
import PlayerCard from './PlayerCard';

function Leaderboard() {
    const [standingsType, setStandingsType] = useState('individual'); // 'individual' or 'university'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [uniLeaderboardData, setUniLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); 
    
    // University matches details modal state
    const [activeUniDetail, setActiveUniDetail] = useState(null);
    const [uniDetailMatches, setUniDetailMatches] = useState([]);
    const [loadingUniMatches, setLoadingUniMatches] = useState(false);

    // Player details modal state
    const [activePlayerDetail, setActivePlayerDetail] = useState(null);
    const [loadingPlayerDetail, setLoadingPlayerDetail] = useState(false);
    const [playerFullProfile, setPlayerFullProfile] = useState(null);

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

    // Fetch university match history details when modal opens
    useEffect(() => {
        if (activeUniDetail) {
            const fetchMatches = async () => {
                setLoadingUniMatches(true);
                setUniDetailMatches([]);
                try {
                    const response = await fetch(`/api/university/${activeUniDetail.uni_id}/matches`);
                    if (response.ok) {
                        const data = await response.json();
                        setUniDetailMatches(data.matches || []);
                    }
                } catch (err) {
                    console.error("Error fetching university team match history:", err);
                }
                setLoadingUniMatches(false);
            };
            fetchMatches();
        }
    }, [activeUniDetail]);

    // Fetch player full profile when modal opens
    useEffect(() => {
        if (activePlayerDetail) {
            const fetchPlayerProfile = async () => {
                setLoadingPlayerDetail(true);
                try {
                    const response = await fetch(`/api/profile/player/${activePlayerDetail.puuid}`);
                    if (response.ok) {
                        const data = await response.json();
                        setPlayerFullProfile(data);
                    }
                } catch (err) {
                    console.error("Error fetching player profile:", err);
                } finally {
                    setLoadingPlayerDetail(false);
                }
            };
            fetchPlayerProfile();
        } else {
            setPlayerFullProfile(null);
        }
    }, [activePlayerDetail]);

    const getRankColor = (tier) => {
        const colors = {
            'IRON': '#514f4e', 'BRONZE': '#8c513a', 'SILVER': '#80989d',
            'GOLD': '#cd8837', 'PLATINUM': '#4e9996', 'EMERALD': '#2a7c46',
            'DIAMOND': '#576bce', 'MASTER': '#9d48e0', 'GRANDMASTER': '#d31a45',
            'CHALLENGER': '#f4c874', 'UNRANKED': '#a0a6b1'
        };
        return colors[tier] || colors['UNRANKED'];
    };

    const hasPodium = standingsType === 'individual' && leaderboardData.length >= 3;
    const hasUniPodium = standingsType === 'university' && uniLeaderboardData.length >= 3;

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

            {/* --- Esports Podium for Top 3 Players --- */}
            {!loading && hasPodium && (
                <div className="podium-section">
                    <div className="podium-container">
                        {/* 2nd Place */}
                        <div className="podium-card rank-2" onClick={() => setActivePlayerDetail(leaderboardData[1])}>
                            <div className="podium-rank">2</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar"
                                    src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${leaderboardData[1].profile_icon_id || 29}.jpg`}
                                    alt=""
                                />
                                <span className="podium-badge silver">2nd</span>
                            </div>
                            <div className="podium-name">{leaderboardData[1].game_name}</div>
                            <div className="podium-uni">{leaderboardData[1].uni_name}</div>
                            <div className="podium-rank-tier" style={{ color: getRankColor(leaderboardData[1].rank_tier) }}>
                                {leaderboardData[1].rank_tier} {leaderboardData[1].rank_division !== 'N/A' ? leaderboardData[1].rank_division : ''}
                            </div>
                            <div className="podium-points">{leaderboardData[1].score} pts</div>
                        </div>

                        {/* 1st Place */}
                        <div className="podium-card rank-1" onClick={() => setActivePlayerDetail(leaderboardData[0])}>
                            <div className="podium-crown">👑</div>
                            <div className="podium-rank">1</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar"
                                    src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${leaderboardData[0].profile_icon_id || 29}.jpg`}
                                    alt=""
                                />
                                <span className="podium-badge gold">1st</span>
                            </div>
                            <div className="podium-name">{leaderboardData[0].game_name}</div>
                            <div className="podium-uni">{leaderboardData[0].uni_name}</div>
                            <div className="podium-rank-tier" style={{ color: getRankColor(leaderboardData[0].rank_tier) }}>
                                {leaderboardData[0].rank_tier} {leaderboardData[0].rank_division !== 'N/A' ? leaderboardData[0].rank_division : ''}
                            </div>
                            <div className="podium-points">{leaderboardData[0].score} pts</div>
                        </div>

                        {/* 3rd Place */}
                        <div className="podium-card rank-3" onClick={() => setActivePlayerDetail(leaderboardData[2])}>
                            <div className="podium-rank">3</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar"
                                    src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${leaderboardData[2].profile_icon_id || 29}.jpg`}
                                    alt=""
                                />
                                <span className="podium-badge bronze">3rd</span>
                            </div>
                            <div className="podium-name">{leaderboardData[2].game_name}</div>
                            <div className="podium-uni">{leaderboardData[2].uni_name}</div>
                            <div className="podium-rank-tier" style={{ color: getRankColor(leaderboardData[2].rank_tier) }}>
                                {leaderboardData[2].rank_tier} {leaderboardData[2].rank_division !== 'N/A' ? leaderboardData[2].rank_division : ''}
                            </div>
                            <div className="podium-points">{leaderboardData[2].score} pts</div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- Esports Podium for Top 3 Universities --- */}
            {!loading && hasUniPodium && (
                <div className="podium-section">
                    <div className="podium-container">
                        {/* 2nd Place School */}
                        <div className="podium-card rank-2" onClick={() => setActiveUniDetail(uniLeaderboardData[1])}>
                            <div className="podium-rank">2</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[1].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[1].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                    }}
                                />
                                <span className="podium-badge silver">2nd</span>
                            </div>
                            <div className="podium-name">{uniLeaderboardData[1].uni_name}</div>
                            <div className="podium-uni">@{uniLeaderboardData[1].uni_domain}</div>
                            <div className="podium-rank-tier" style={{ color: 'var(--hextech-blue)' }}>
                                {uniLeaderboardData[1].competitor_count} active
                            </div>
                            <div className="podium-points">{uniLeaderboardData[1].total_power_score} pts</div>
                        </div>

                        {/* 1st Place School */}
                        <div className="podium-card rank-1" onClick={() => setActiveUniDetail(uniLeaderboardData[0])}>
                            <div className="podium-crown">👑</div>
                            <div className="podium-rank">1</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[0].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[0].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                    }}
                                />
                                <span className="podium-badge gold">1st</span>
                            </div>
                            <div className="podium-name">{uniLeaderboardData[0].uni_name}</div>
                            <div className="podium-uni">@{uniLeaderboardData[0].uni_domain}</div>
                            <div className="podium-rank-tier" style={{ color: 'var(--hextech-blue)' }}>
                                {uniLeaderboardData[0].competitor_count} active
                            </div>
                            <div className="podium-points">{uniLeaderboardData[0].total_power_score} pts</div>
                        </div>

                        {/* 3rd Place School */}
                        <div className="podium-card rank-3" onClick={() => setActiveUniDetail(uniLeaderboardData[2])}>
                            <div className="podium-rank">3</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[2].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[2].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                    }}
                                />
                                <span className="podium-badge bronze">3rd</span>
                            </div>
                            <div className="podium-name">{uniLeaderboardData[2].uni_name}</div>
                            <div className="podium-uni">@{uniLeaderboardData[2].uni_domain}</div>
                            <div className="podium-rank-tier" style={{ color: 'var(--hextech-blue)' }}>
                                {uniLeaderboardData[2].competitor_count} active
                            </div>
                            <div className="podium-points">{uniLeaderboardData[2].total_power_score} pts</div>
                        </div>
                    </div>
                </div>
            )}

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
                                    (hasPodium ? leaderboardData.slice(3) : leaderboardData).map((player, sliceIndex) => {
                                        const actualIndex = hasPodium ? sliceIndex + 3 : sliceIndex;
                                        const tierNameLower = (player.rank_tier || 'unranked').toLowerCase();
                                        const emblemUrl = `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${tierNameLower}.png`;
                                        const pfpUrl = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${player.profile_icon_id || 29}.jpg`;

                                        return (
                                            <tr 
                                                key={player.puuid} 
                                                onClick={() => setActivePlayerDetail(player)}
                                                className="clickable-row"
                                            >
                                                <td className="col-rank">{actualIndex + 1}</td>
                                                
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <img 
                                                            src={pfpUrl} 
                                                            alt="" 
                                                            style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-gold)', objectFit: 'cover' }}
                                                        />
                                                        <div>
                                                            <div>
                                                                <span className="summoner-name">{player.game_name}</span>
                                                                <span className="summoner-tag">#{player.tag}</span>
                                                            </div>
                                                            <div className="summoner-uni">{player.uni_name}</div>
                                                        </div>
                                                    </div>
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
                                    (hasUniPodium ? uniLeaderboardData.slice(3) : uniLeaderboardData).map((uni, sliceIndex) => {
                                        const actualIndex = hasUniPodium ? sliceIndex + 3 : sliceIndex;
                                        return (
                                            <tr 
                                                key={uni.uni_id} 
                                                onClick={() => setActiveUniDetail(uni)}
                                                className="clickable-row"
                                            >
                                                <td className="col-rank">{actualIndex + 1}</td>
                                                
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <img 
                                                            src={uni.uni_logo_link || `https://www.google.com/s2/favicons?domain=${uni.uni_domain}&sz=128`} 
                                                            alt="" 
                                                            style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-gold)' }}
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                                            }}
                                                        />
                                                        <div className="summoner-name" style={{ fontFamily: 'Cinzel', letterSpacing: '1px' }}>
                                                            {uni.uni_name}
                                                        </div>
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
                                        );
                                    })
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
            
            {/* --- University Details Modal Overlay --- */}
            {activeUniDetail && (
                <div className="modal-overlay" onClick={() => setActiveUniDetail(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setActiveUniDetail(null)}>&times;</button>
                        
                        <div className="uni-modal-header">
                            <img 
                                className="uni-modal-logo" 
                                src={activeUniDetail.uni_logo_link || `https://www.google.com/s2/favicons?domain=${activeUniDetail.uni_domain}&sz=128`} 
                                alt={`${activeUniDetail.uni_name} logo`}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                }}
                            />
                            <h3 className="uni-modal-title">{activeUniDetail.uni_name}</h3>
                            <span className="uni-modal-domain">@{activeUniDetail.uni_domain}</span>
                        </div>
                        
                        <h4 className="matches-section-title" style={{ marginTop: '0', fontSize: '0.85rem' }}>University Team Match History</h4>
                        
                        {loadingUniMatches ? (
                            <div style={{ padding: '2rem 0', fontStyle: 'italic', color: 'var(--hextech-blue)', textAlign: 'center' }}>
                                Retrieving team matches from the Rift...
                            </div>
                        ) : (
                            <div className="matches-container" style={{ marginTop: '15px', maxHeight: '350px', overflowY: 'auto' }}>
                                {uniDetailMatches.length > 0 ? (
                                    uniDetailMatches.map((match, idx) => {
                                        const matchWinClass = match.win ? 'match-row-win' : 'match-row-loss';
                                        const outcomeText = match.win ? 'Win' : 'Loss';
                                        const outcomeClass = match.win ? 'text-win' : 'text-loss';
                                        const champImgUrl = `https://ddragon.leagueoflegends.com/cdn/13.24.1/img/champion/${match.championName}.png`;
                                        
                                        return (
                                            <div key={match.matchId + '_' + idx} className={`match-row ${matchWinClass}`} style={{ marginBottom: '8px' }}>
                                                <div className="match-champ-info">
                                                    <img 
                                                        className="match-champ-icon" 
                                                        src={champImgUrl} 
                                                        alt={match.championName}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';
                                                        }}
                                                    />
                                                    <div>
                                                        <div className="match-champ-name">{match.championName}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--gold-primary)', fontWeight: 'bold' }}>
                                                            {match.player_name}
                                                        </div>
                                                        <div className={`match-outcome-text ${outcomeClass}`} style={{ fontSize: '0.7rem' }}>
                                                            {outcomeText}
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                <div className="match-stats-info">
                                                    <div className="match-kda-text" style={{ fontSize: '0.8rem' }}>{match.kills} / {match.deaths} / {match.assists}</div>
                                                    <div className="match-meta-text" style={{ fontSize: '0.65rem' }}>{match.cs} CS • {match.duration}m</div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-main)', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                        No recent match data available for this university's competitors.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- Player Details Modal Overlay --- */}
            {activePlayerDetail && (
                <div className="modal-overlay" onClick={() => setActivePlayerDetail(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px', padding: '2.5rem 1.5rem 1.5rem 1.5rem' }}>
                        <button className="modal-close" onClick={() => setActivePlayerDetail(null)}>&times;</button>
                        
                        {loadingPlayerDetail ? (
                            <div style={{ padding: '3rem 0', fontStyle: 'italic', color: 'var(--hextech-blue)', textAlign: 'center' }}>
                                Loading player profile from the Rift...
                            </div>
                        ) : playerFullProfile ? (
                            <div>
                                <h3 className="modal-custom-title" style={{ textAlign: 'center', marginBottom: '1.2rem', fontSize: '1.3rem' }}>Summoner Profile</h3>
                                <PlayerCard data={playerFullProfile} />
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-main)' }}>
                                Could not retrieve player profile details.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Leaderboard;