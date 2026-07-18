import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PlayerCard from './PlayerCard';
import { useToast } from './Toast';

function PlayerProfilePage() {
    const { puuid } = useParams();
    const [, showToast, ToastContainer] = useToast();
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPlayerProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`/api/profile/player/${puuid}`);
                if (response.ok) {
                    const data = await response.json();
                    setProfileData(data);
                } else {
                    setError("Could not retrieve this player's profile details.");
                }
            } catch (err) {
                setError("Failed to connect to the collegiate server.");
            } finally {
                setLoading(false);
            }
        };

        fetchPlayerProfile();
    }, [puuid]);

    const handleCopyLink = () => {
        navigator.clipboard.writeText(window.location.href);
        showToast("Profile link copied to clipboard!", "success");
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <div style={{ fontStyle: 'italic', color: 'var(--gold-primary)', fontSize: '1.1rem', fontFamily: 'Cinzel' }}>
                    Summoning player details from the Rift...
                </div>
            </div>
        );
    }

    if (error || !profileData) {
        return (
            <div className="form-container" style={{ maxWidth: '480px', margin: '3rem auto', textAlign: 'center' }}>
                <h2>Summoner Not Found</h2>
                <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                    {error || "We couldn't find a summoner linked to this PUUID."}
                </p>
                <Link to="/leaderboard" className="btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    Back to Leaderboard
                </Link>
            </div>
        );
    }

    return (
        <div className="profile-page-wrapper" style={{ maxWidth: '100%', margin: '0 auto', padding: '0' }}>
            <ToastContainer />
            
            {/* Breadcrumb Navigation */}
            <div className="profile-breadcrumbs" style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-main)', marginBottom: '1.5rem', fontFamily: 'Cinzel' }}>
                <Link to="/" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Home</Link>
                <span>&gt;</span>
                <Link to="/leaderboard" style={{ color: 'var(--text-main)', textDecoration: 'none' }}>Leaderboard</Link>
                <span>&gt;</span>
                {profileData.uni_name && (
                    <>
                        <span style={{ color: 'var(--text-main)' }}>{profileData.uni_name}</span>
                        <span>&gt;</span>
                    </>
                )}
                <span style={{ color: 'var(--gold-primary)' }}>{profileData.gameName}</span>
            </div>

            {/* University Context Header Banner */}
            {profileData.uni_name && (
                <div className="profile-uni-banner hextech-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 20px', background: 'rgba(6, 11, 19, 0.5)', border: '1px solid var(--border-blue)', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img 
                            src={profileData.uni_logo_link || `https://www.google.com/s2/favicons?domain=${profileData.uni_domain}&sz=64`} 
                            alt="" 
                            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                            onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';
                            }}
                        />
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'Cinzel', color: 'var(--text-light)', letterSpacing: '0.5px' }}>
                                {profileData.uni_name}
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-main)' }}>Verified Student Representative</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
                        <span style={{ color: 'var(--gold-primary)', fontWeight: 'bold' }}>@{profileData.uni_domain}</span>
                    </div>
                </div>
            )}

            {/* The Main Player Card */}
            <div className="main-card-container">
                <PlayerCard data={profileData} />
            </div>

            {/* Footer Control Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2rem' }}>
                <Link to="/leaderboard" className="btn" style={{ textDecoration: 'none', background: 'transparent', border: '1px solid var(--text-main)', color: 'var(--text-main)', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                    Back to Leaderboard
                </Link>
                <button onClick={handleCopyLink} className="btn" style={{ border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}>
                    Share Profile Link
                </button>
            </div>
        </div>
    );
}

export default PlayerProfilePage;
