import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
    const [topSchools, setTopSchools] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTopSchools = async () => {
            try {
                const response = await fetch('/api/leaderboard/universities');
                if (response.ok) {
                    const data = await response.json();
                    // Grab only the top 3 schools
                    setTopSchools(data.slice(0, 3));
                }
            } catch (err) {
                console.error("Failed to load top schools for landing page:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTopSchools();
    }, []);

    return (
        <div className="landing-container">
            {/* --- Hero Section --- */}
            <section className="hero-section">
                <h1>Collegiate Champions of the Rift</h1>
                <p className="hero-subtitle">
                    Claim your summoner, verify your university email, and battle for school supremacy on the official collegiate League of Legends ladder.
                </p>
                <div className="hero-buttons">
                    <Link to="/search" className="hextech-btn hextech-btn-gold">
                        Enter Arena
                    </Link>
                    <Link to="/leaderboard" className="hextech-btn hextech-btn-blue">
                        Leaderboards
                    </Link>
                </div>
            </section>

            {/* --- Dynamic Standings Preview Podium --- */}
            <section className="standings-preview-section">
                <h2 className="section-title">Current Leaderboard Leaders</h2>
                
                {loading ? (
                    <div style={{ padding: '3rem 0', fontStyle: 'italic', color: 'var(--gold-primary)' }}>
                        Scouting current leaders on the Rift...
                    </div>
                ) : topSchools.length > 0 ? (
                    <div className="podium-container">
                        {topSchools.map((school, index) => {
                            const rankClass = index === 0 ? 'podium-1st' : index === 1 ? 'podium-2nd' : 'podium-3rd';
                            const badgeChar = index === 0 ? 'I' : index === 1 ? 'II' : 'III';
                            const logoUrl = school.uni_logo_link || `https://www.google.com/s2/favicons?domain=${school.uni_domain}&sz=128`;
                            
                            return (
                                <div key={school.uni_id} className={`podium-column ${rankClass}`}>
                                    <div className="podium-badge">{badgeChar}</div>
                                    <img 
                                        className="podium-logo" 
                                        src={logoUrl} 
                                        alt="" 
                                        onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.src = "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg";
                                        }}
                                    />
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
                    <div style={{ padding: '2rem 0', color: 'var(--text-main)', fontStyle: 'italic' }}>
                        No schools registered yet. Be the first to lead your university!
                    </div>
                )}
            </section>

            {/* --- Features Grid Section --- */}
            <section className="features-section">
                <h2 className="section-title">How It Works</h2>
                <div className="features-grid">
                    
                    <div className="feature-card">
                        <div className="feature-icon-wrapper">🛡️</div>
                        <h3>1. Claim Your Summoner</h3>
                        <p>
                            Search for your League of Legends game name and tagline. Copy your temporary Riot Third-Party code into your client to safely verify ownership.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">🎓</div>
                        <h3>2. Verify Affiliation</h3>
                        <p>
                            Verify your student status securely using your university email address. Keep competition clean, transparent, and strictly collegiate.
                        </p>
                    </div>

                    <div className="feature-card">
                        <div className="feature-icon-wrapper">🏆</div>
                        <h3>3. Boost Your School</h3>
                        <p>
                            Every ranked Solo Queue game you play automatically updates. Your wins, tier level, division, and LP directly fuel your university's aggregate power score.
                        </p>
                    </div>
                    
                </div>
            </section>
        </div>
    );
}

export default LandingPage;
