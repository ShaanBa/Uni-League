import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
    const [topSchools, setTopSchools] = useState([]);
    const [stats, setStats] = useState({ players: 0, schools: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [uniRes, playerRes] = await Promise.all([
                    fetch('/api/leaderboard/universities'),
                    fetch('/api/leaderboard/players')
                ]);
                if (uniRes.ok) {
                    const uniData = await uniRes.json();
                    setTopSchools(uniData.slice(0, 3));
                    const playerData = playerRes.ok ? await playerRes.json() : [];
                    setStats({
                        players: playerData.length || 0,
                        schools: uniData.length || 0
                    });
                } else {
                    setError('Failed to load landing page data.');
                }
            } catch (err) {
                setError('Could not connect to the server. Please try again later.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    return (
        <div className="landing-container">

            {error && <div className="error-message">{error}</div>}

            {/* ——— Hero ——— */}
            <section className="hero-section">
                <div className="hero-deco-line left"></div>
                <div className="hero-content">
                    <span className="hero-tag">Collegiate Esports</span>
                    <h1>Prove Who Rules<br/>the Rift.</h1>
                    <p className="hero-subtitle">
                        Connect your League profile, verify your student email, and see where your campus stands on the collegiate ladder.
                    </p>
                    <div className="hero-buttons">
                        <Link to="/search" className="hextech-btn hextech-btn-gold">
                            Find Your Summoner
                        </Link>
                        <Link to="/leaderboard" className="hextech-btn hextech-btn-blue">
                            View Rankings
                        </Link>
                    </div>
                </div>
                <div className="hero-deco-line right"></div>
            </section>

            {/* ——— Live Stats Bar ——— */}
            <section className="stats-bar">
                <div className="stat-item">
                    <span className="stat-value">{stats.schools}</span>
                    <span className="stat-label">Universities</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <span className="stat-value">{stats.players}</span>
                    <span className="stat-label">Summoners</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <span className="stat-value">LIVE</span>
                    <span className="stat-label">Riot API Sync</span>
                </div>
            </section>

            {/* ——— Top Schools Podium ——— */}
            <section className="standings-preview-section">
                <div className="section-header">
                    <div className="deco-rule"></div>
                    <h2>Top Schools</h2>
                    <div className="deco-rule"></div>
                </div>

                {loading ? (
                    <div className="loading-state">Scouting the Rift...</div>
                ) : topSchools.length > 0 ? (
                    <div className="podium-container">
                        {topSchools.map((school, index) => {
                            const rankClass = index === 0 ? 'podium-1st' : index === 1 ? 'podium-2nd' : 'podium-3rd';
                            const rankLabel = index === 0 ? 'I' : index === 1 ? 'II' : 'III';
                            const logoUrl = school.uni_logo_link || `https://www.google.com/s2/favicons?domain=${school.uni_domain}&sz=128`;

                            return (
                                <div key={school.uni_id} className={`podium-column ${rankClass} hextech-card`}>
                                    <div className="podium-rank-label">{rankLabel}</div>
                                    <div className="podium-logo-container">
                                        <img
                                            className="podium-logo"
                                            src={logoUrl}
                                            alt=""
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                            }}
                                        />
                                    </div>
                                    <div className="podium-school-name">{school.uni_name}</div>
                                    <div className="podium-school-domain">@{school.uni_domain}</div>
                                    <div className="podium-school-score">
                                        {school.total_power_score}
                                        <span>Power Score</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="empty-state">
                        No schools registered yet — be the first to lead your university.
                    </div>
                )}

                <Link to="/leaderboard" className="section-cta">
                    Full Rankings &rarr;
                </Link>
            </section>

            {/* ——— How It Works ——— */}
            <section className="features-section">
                <div className="section-header">
                    <div className="deco-rule"></div>
                    <h2>How It Works</h2>
                    <div className="deco-rule"></div>
                </div>

                <div className="features-grid">
                    <div className="feature-card hextech-card">
                        <div className="feature-step">01</div>
                        <h3>Search &amp; Claim</h3>
                        <p>
                            Find your summoner by game name and tagline. We provide a
                            specific profile icon for you to equip in your League client
                            to securely prove ownership.
                        </p>
                    </div>

                    <div className="feature-card hextech-card">
                        <div className="feature-step">02</div>
                        <h3>Verify .edu</h3>
                        <p>
                            Register with your university email. We auto-detect your
                            school from the domain and add it to the board if it is new.
                            No manual setup needed.
                        </p>
                    </div>

                    <div className="feature-card hextech-card">
                        <div className="feature-step">03</div>
                        <h3>Climb &amp; Compete</h3>
                        <p>
                            Play Solo Queue as normal. Your rank, LP, and win rate sync
                            from the Riot API in real time and feed into your school's
                            aggregate power score.
                        </p>
                    </div>
                </div>
            </section>

            {/* ——— Explore More ——— */}
            <section className="explore-section">
                <div className="section-header">
                    <div className="deco-rule"></div>
                    <h2>Explore</h2>
                    <div className="deco-rule"></div>
                </div>

                <div className="explore-grid">
                    <Link to="/leaderboard" className="explore-card hextech-card">
                        <h3>Leaderboard</h3>
                        <p>Player and university rankings with live Riot data.</p>
                    </Link>
                    <Link to="/simulator" className="explore-card hextech-card">
                        <h3>Clash Simulator</h3>
                        <p>Pit two schools head-to-head in a simulated best-of-one.</p>
                    </Link>
                    <Link to="/search" className="explore-card hextech-card">
                        <h3>Summoner Search</h3>
                        <p>Look up any player and view their full stat card.</p>
                    </Link>
                </div>
            </section>

        </div>
    );
}

export default LandingPage;
