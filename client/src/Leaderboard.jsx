import { useState, useEffect } from 'react';
import './Leaderboard.css';
import PlayerCard from './PlayerCard';
import { getRankColor, FALLBACK_ICON } from './utils';

function Leaderboard() {
    const [standingsType, setStandingsType] = useState('individual'); // 'individual' or 'university'
    const [leaderboardData, setLeaderboardData] = useState([]);
    const [uniLeaderboardData, setUniLeaderboardData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); 
    
    // University matches details modal state
    const [activeUniDetail, setActiveUniDetail] = useState(null);
    const [uniDetailMatches, setUniDetailMatches] = useState([]);
    const [loadingUniMatches, setLoadingUniMatches] = useState(false);
    
    // Enhanced University Profile Details states
    const [uniDetailTab, setUniDetailTab] = useState('roster'); // 'roster', 'stats', 'matches'
    const [uniRoster, setUniRoster] = useState([]);
    const [loadingUniRoster, setLoadingUniRoster] = useState(false);

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
                setError(null);
                try {
                    const response = await fetch(`/api/leaderboard/${filter}`);
                    if (response.ok) {
                        const data = await response.json();
                        setLeaderboardData(data);
                    } else {
                        setError('Failed to load player standings.');
                    }
                } catch (err) {
                    setError('Could not connect to the server. Please try again later.');
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
                setError(null);
                try {
                    const response = await fetch('/api/leaderboard/universities');
                    if (response.ok) {
                        const data = await response.json();
                        setUniLeaderboardData(data);
                    } else {
                        setError('Failed to load university standings.');
                    }
                } catch (err) {
                    setError('Could not connect to the server. Please try again later.');
                }
                setLoading(false);
            };
            fetchUniLeaderboard();
        }
    }, [standingsType]);

    // Fetch university details (match history & roster) when modal opens
    useEffect(() => {
        if (activeUniDetail) {
            setUniDetailTab('roster'); // Reset to default tab
            
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
            
            const fetchRoster = async () => {
                setLoadingUniRoster(true);
                setUniRoster([]);
                try {
                    const response = await fetch(`/api/leaderboard/${activeUniDetail.uni_id}`);
                    if (response.ok) {
                        const data = await response.json();
                        setUniRoster(data);
                    }
                } catch (err) {
                    console.error("Error fetching university roster:", err);
                }
                setLoadingUniRoster(false);
            };

            fetchMatches();
            fetchRoster();
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

    const getRosterStats = () => {
        if (uniRoster.length === 0) return { competitorCount: 0, avgWinRate: 0, totalLP: 0, avgRank: 'UNRANKED' };
        
        let totalWins = 0;
        let totalLosses = 0;
        let totalLP = 0;
        let rankSum = 0;
        let rankedCount = 0;
        
        const rankWeights = {
            'IRON': 100,
            'BRONZE': 200,
            'SILVER': 300,
            'GOLD': 400,
            'PLATINUM': 500,
            'EMERALD': 600,
            'DIAMOND': 700,
            'MASTER': 800,
            'GRANDMASTER': 900,
            'CHALLENGER': 1000
        };
        
        const weightToRank = [
            { limit: 150, name: 'IRON' },
            { limit: 250, name: 'BRONZE' },
            { limit: 350, name: 'SILVER' },
            { limit: 450, name: 'GOLD' },
            { limit: 550, name: 'PLATINUM' },
            { limit: 650, name: 'EMERALD' },
            { limit: 750, name: 'DIAMOND' },
            { limit: 850, name: 'MASTER' },
            { limit: 950, name: 'GRANDMASTER' },
            { limit: 10000, name: 'CHALLENGER' }
        ];

        uniRoster.forEach(p => {
            totalWins += p.wins || 0;
            totalLosses += p.losses || 0;
            totalLP += p.lp || 0;
            const tier = (p.rank_tier || '').toUpperCase();
            if (tier && tier !== 'UNRANKED' && rankWeights[tier]) {
                rankSum += rankWeights[tier];
                rankedCount++;
            }
        });
        
        const totalGames = totalWins + totalLosses;
        const avgWinRate = totalGames > 0 ? ((totalWins / totalGames) * 100).toFixed(1) : '0';
        
        let avgRankName = 'UNRANKED';
        if (rankedCount > 0) {
            const avgWeight = rankSum / rankedCount;
            const matchedRank = weightToRank.find(r => avgWeight < r.limit);
            if (matchedRank) avgRankName = matchedRank.name;
        }
        
        return {
            competitorCount: uniRoster.length,
            avgWinRate,
            totalLP,
            avgRank: avgRankName
        };
    };



    const hasPodium = standingsType === 'individual' && leaderboardData.length >= 3;
    const hasUniPodium = standingsType === 'university' && uniLeaderboardData.length >= 3;

    return (
        <div>
            {error && <div className="error-message">{error}</div>}

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

            <div className="hextech-divider">
                <div className="hextech-divider-line"></div>
                <div className="hextech-divider-diamond"></div>
            </div>

            {/* --- Esports Podium for Top 3 Players --- */}
            {!loading && hasPodium && (
                <div className="podium-section">
                    <div className="podium-container">
                        {/* 2nd Place */}
                        <div className="podium-card rank-2 hextech-card" onClick={() => setActivePlayerDetail(leaderboardData[1])}>
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
                        <div className="podium-card rank-1 hextech-card" onClick={() => setActivePlayerDetail(leaderboardData[0])}>
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
                        <div className="podium-card rank-3 hextech-card" onClick={() => setActivePlayerDetail(leaderboardData[2])}>
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
                        <div className="podium-card rank-2 hextech-card" onClick={() => setActiveUniDetail(uniLeaderboardData[1])}>
                            <div className="podium-rank">2</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[1].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[1].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = FALLBACK_ICON;
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
                        <div className="podium-card rank-1 hextech-card" onClick={() => setActiveUniDetail(uniLeaderboardData[0])}>
                            <div className="podium-crown">👑</div>
                            <div className="podium-rank">1</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[0].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[0].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = FALLBACK_ICON;
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
                        <div className="podium-card rank-3 hextech-card" onClick={() => setActiveUniDetail(uniLeaderboardData[2])}>
                            <div className="podium-rank">3</div>
                            <div className="podium-avatar-wrapper">
                                <img 
                                    className="podium-avatar school-avatar"
                                    src={uniLeaderboardData[2].uni_logo_link || `https://www.google.com/s2/favicons?domain=${uniLeaderboardData[2].uni_domain}&sz=128`}
                                    alt=""
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = FALLBACK_ICON;
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
                <div className="leaderboard-wrapper hextech-card">
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
                                                                e.target.src = FALLBACK_ICON;
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
                    <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
                        <button className="modal-close" onClick={() => setActiveUniDetail(null)}>&times;</button>
                        
                        <div className="uni-modal-header" style={{ marginBottom: '1.5rem' }}>
                            <img 
                                className="uni-modal-logo" 
                                src={activeUniDetail.uni_logo_link || `https://www.google.com/s2/favicons?domain=${activeUniDetail.uni_domain}&sz=128`} 
                                alt={`${activeUniDetail.uni_name} logo`}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = FALLBACK_ICON;
                                }}
                            />
                            <h3 className="uni-modal-title" style={{ fontFamily: 'Cinzel', letterSpacing: '1px', fontSize: '1.30rem' }}>{activeUniDetail.uni_name}</h3>
                            <span className="uni-modal-domain">@{activeUniDetail.uni_domain}</span>
                        </div>

                        {/* Roster & Roster Stats Tabs */}
                        <div className="uni-modal-tabs" style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-gold)', marginBottom: '1.5rem', paddingBottom: '0.5rem' }}>
                            <button 
                                onClick={() => setUniDetailTab('roster')}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: uniDetailTab === 'roster' ? 'var(--gold-primary)' : 'var(--text-main)', 
                                    cursor: 'pointer', 
                                    fontFamily: 'Cinzel', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    borderBottom: uniDetailTab === 'roster' ? '2px solid var(--gold-primary)' : 'none',
                                    paddingBottom: '4px'
                                }}
                            >
                                Roster
                            </button>
                            <button 
                                onClick={() => setUniDetailTab('stats')}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: uniDetailTab === 'stats' ? 'var(--gold-primary)' : 'var(--text-main)', 
                                    cursor: 'pointer', 
                                    fontFamily: 'Cinzel', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    borderBottom: uniDetailTab === 'stats' ? '2px solid var(--gold-primary)' : 'none',
                                    paddingBottom: '4px'
                                }}
                            >
                                Roster Stats
                            </button>
                            <button 
                                onClick={() => setUniDetailTab('matches')}
                                style={{ 
                                    background: 'transparent', 
                                    border: 'none', 
                                    color: uniDetailTab === 'matches' ? 'var(--gold-primary)' : 'var(--text-main)', 
                                    cursor: 'pointer', 
                                    fontFamily: 'Cinzel', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    borderBottom: uniDetailTab === 'matches' ? '2px solid var(--gold-primary)' : 'none',
                                    paddingBottom: '4px'
                                }}
                            >
                                Match History
                            </button>
                        </div>
                        
                        {uniDetailTab === 'roster' && (
                            <div className="uni-roster-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                {loadingUniRoster ? (
                                    <div style={{ padding: '2rem 0', fontStyle: 'italic', color: 'var(--hextech-blue)', textAlign: 'center' }}>
                                        Assembling the campus roster...
                                    </div>
                                ) : uniRoster.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {uniRoster.map((player, idx) => {
                                            const pColor = getRankColor(player.rank_tier);
                                            const pIconUrl = player.profile_icon_id === 29 ? FALLBACK_ICON : `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${player.profile_icon_id}.jpg`;
                                            const winRate = (player.wins + player.losses) > 0 ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0) : '0';
                                            
                                            return (
                                                <div key={player.puuid} className="roster-player-row hextech-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(6, 11, 19, 0.6)', border: '1px solid var(--border-blue)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div style={{ width: '32px', height: '32px', border: '1px solid var(--border-gold)', background: '#02060c', padding: '2px', display: 'inline-block' }}>
                                                            <img src={pIconUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                        </div>
                                                        <div>
                                                            <span 
                                                                onClick={() => {
                                                                    // Open player full profile modal
                                                                    setActivePlayerDetail(player);
                                                                }}
                                                                style={{ color: 'var(--text-light)', fontWeight: 'bold', fontSize: '0.9rem', cursor: 'pointer' }}
                                                                className="player-click-link"
                                                            >
                                                                {player.game_name}#{player.tag}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '0.8rem' }}>
                                                        <span style={{ color: pColor, fontWeight: 'bold', fontFamily: 'Cinzel' }}>
                                                            {player.rank_tier} {player.rank_division !== 'N/A' ? player.rank_division : ''}
                                                        </span>
                                                        <span style={{ color: 'var(--text-main)' }}>
                                                            {player.lp} LP
                                                        </span>
                                                        <span style={{ color: winRate >= 55 ? '#2ecc71' : winRate < 48 ? 'var(--danger)' : 'var(--text-light)' }}>
                                                            {winRate}% WR
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem 0', color: 'var(--text-main)', fontStyle: 'italic', textAlign: 'center' }}>
                                        No players currently registered for this university.
                                    </div>
                                )}
                            </div>
                        )}

                        {uniDetailTab === 'stats' && (
                            <div className="uni-stats-container" style={{ padding: '1.2rem', background: 'rgba(6, 11, 19, 0.4)', border: '1px solid var(--border-blue)', textAlign: 'left' }}>
                                {(() => {
                                    const s = getRosterStats();
                                    const rankColor = getRankColor(s.avgRank);
                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                                                <span style={{ color: 'var(--text-main)' }}>Total Active Roster:</span>
                                                <strong style={{ color: 'var(--text-light)' }}>{s.competitorCount} summoners</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                                                <span style={{ color: 'var(--text-main)' }}>Roster Average Rank:</span>
                                                <strong style={{ color: rankColor, fontFamily: 'Cinzel', letterSpacing: '1px' }}>{s.avgRank}</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '8px' }}>
                                                <span style={{ color: 'var(--text-main)' }}>Combined LP Pool:</span>
                                                <strong style={{ color: 'var(--gold-primary)' }}>{s.totalLP} LP</strong>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '4px' }}>
                                                <span style={{ color: 'var(--text-main)' }}>Aggregate Win Rate:</span>
                                                <strong style={{ color: s.avgWinRate >= 55 ? '#2ecc71' : s.avgWinRate < 48 ? 'var(--danger)' : 'var(--text-light)' }}>{s.avgWinRate}%</strong>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}

                        {uniDetailTab === 'matches' && (
                            <div>
                                {loadingUniMatches ? (
                                    <div style={{ padding: '2rem 0', fontStyle: 'italic', color: 'var(--hextech-blue)', textAlign: 'center' }}>
                                        Retrieving team matches from the Rift...
                                    </div>
                                ) : (
                                    <div className="matches-container" style={{ maxHeight: '350px', overflowY: 'auto' }}>
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
                                                                    e.target.src = FALLBACK_ICON;
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