import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import PlayerCard from "./PlayerCard"
import { useToast } from './Toast';

function Profile() {
    const [, showToast, ToastContainer] = useToast();
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [isVerified, setIsVerified] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const token = localStorage.getItem('user_token')
    const [friends, setFriends] = useState([])
    const [requests, setRequests] = useState([])

    // Email OTP states
    const [verificationCode, setVerificationCode] = useState("")
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [resending, setResending] = useState(false)

    // Social management states
    const [discord, setDiscord] = useState("")
    const [twitter, setTwitter] = useState("")
    const [bio, setBio] = useState("")
    const [mainLane, setMainLane] = useState(["FILL"])
    const [updatingSocials, setUpdatingSocials] = useState(false)
    const [showEditSocials, setShowEditSocials] = useState(false)

    const fetchProfile = async () => {
        if (!token) {
            setLoading(false)
            return
        }
        
        setError(null)
        try {
            const response = await fetch('/api/profile/me', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            })
            
            const data = await response.json()
            
            // Set verification state from backend payload
            if (data && typeof data.is_verified !== 'undefined') {
                setIsVerified(data.is_verified)
            }
            
            if (response.ok) {
                setPlayerData(data)
                setDiscord(data.discord_handle || "")
                setTwitter(data.twitter_handle || "")
                setBio(data.bio || "")
                setMainLane(data.main_lane ? data.main_lane.split(',') : ["FILL"])
            } else if (response.status === 404) {
                // Not claimed yet, which is expected
                setPlayerData(null)
            } else {
                setError(data.error || "Failed to retrieve profile data.")
            }
        } catch (err) {
            setError("Could not connect to the server.")
        } finally {
            setLoading(false)
        }
    }

    const fetchFriendsAndRequests = async () => {
        if (!token) return;
        try {
            const friendsRes = await fetch('/api/friends', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (friendsRes.ok) {
                const friendsData = await friendsRes.json();
                setFriends(friendsData);
            }

            const reqsRes = await fetch('/api/friends/requests', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (reqsRes.ok) {
                const reqsData = await reqsRes.json();
                setRequests(reqsData);
            }
        } catch (err) {
            console.error("Error fetching friends/requests:", err);
        }
    };

    const handleAcceptRequest = async (senderId) => {
        try {
            const res = await fetch('/api/friends/accept', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sender_user_id: senderId })
            });
            if (res.ok) {
                showToast("Friend request accepted!", "success");
                fetchFriendsAndRequests();
            }
        } catch (err) {
            showToast("Failed to accept request.", "error");
        }
    };

    const handleDeclineRequest = async (senderId) => {
        try {
            const res = await fetch('/api/friends/decline', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ sender_user_id: senderId })
            });
            if (res.ok) {
                showToast("Request declined.", "success");
                fetchFriendsAndRequests();
            }
        } catch (err) {
            showToast("Failed to decline request.", "error");
        }
    };

    const handleRemoveFriend = async (friendId) => {
        if (!window.confirm("Are you sure you want to remove this friend?")) return;
        try {
            const res = await fetch('/api/friends/remove', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ friend_user_id: friendId })
            });
            if (res.ok) {
                showToast("Friend removed.", "success");
                fetchFriendsAndRequests();
            }
        } catch (err) {
            showToast("Failed to remove friend.", "error");
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchFriendsAndRequests();
    }, [token])

    const handleVerifyEmail = async (e) => {
        e.preventDefault();
        if (!verificationCode.trim()) return;

        setError(null)
        setVerifyingEmail(true)

        try {
            const response = await fetch('/api/verify_email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: verificationCode.trim() })
            })
            const data = await response.json()
            
            if (response.ok) {
                showToast("Email verified successfully!", 'success')
                setIsVerified(true)
                fetchProfile()
            } else {
                setError(data.error || "Email verification failed.")
            }
        } catch (err) {
            setError("Could not reach verification server.")
        } finally {
            setVerifyingEmail(false)
        }
    }

    const handleResendCode = async () => {
        setError(null)
        setResending(true)

        try {
            const response = await fetch('/api/resend_verification', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            
            if (response.ok) {
                showToast("Verification code resent!", 'success')
            } else {
                const data = await response.json()
                setError(data.error || "Failed to resend code.")
            }
        } catch (err) {
            setError("Could not reach verification server.")
        } finally {
            setResending(false)
        }
    }

    const refreshMyStats = async () => {
        setError(null)
        setRefreshing(true)
        try {
            const response = await fetch('/api/refresh_summoner', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                }
            })
            
            if (response.ok) {
                showToast('Stats Refreshed from Riot Games API!', 'success')
                fetchProfile() 
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to refresh stats.')
            }
        } catch (err) {
            setError("Could not refresh stats. Server is unreachable.")
        } finally {
            setRefreshing(false)
        }
    }

    const handleSaveSocials = async (e) => {
        e.preventDefault();
        setError(null)
        setUpdatingSocials(true)

        try {
            const response = await fetch('/api/profile/socials', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    discord_handle: discord.trim(),
                    twitter_handle: twitter.trim(),
                    bio: bio.trim(),
                    main_lane: mainLane.join(',')
                })
            })
            const data = await response.json()
            
            if (response.ok) {
                showToast("Profile updated successfully!", 'success')
                setShowEditSocials(false)
                // Refresh local profile state with updated values
                setPlayerData(prev => ({
                    ...prev,
                    discord_handle: discord.trim(),
                    twitter_handle: twitter.trim(),
                    bio: bio.trim(),
                    main_lane: mainLane.join(',')
                }))
            } else {
                setError(data.error || "Failed to update socials.")
            }
        } catch (err) {
            setError("Could not reach servers to update socials.")
        } finally {
            setUpdatingSocials(false)
        }
    }

    if (loading) {
        return (
            <div style={{ margin: '3rem auto', fontStyle: 'italic', color: 'var(--gold-primary)' }}>
                Retrieving student credentials...
            </div>
        )
    }

    // --- RENDER EMAIL VERIFICATION SCREEN IF UNVERIFIED ---
    if (!isVerified) {
        return (
            <div className="form-container" style={{ maxWidth: '460px' }}>
                <ToastContainer />
                <h2>Verify Student Status</h2>
                <p style={{ fontSize: '0.85rem', marginBottom: '1.5rem', textAlign: 'center' }}>
                    We sent a 6-digit verification code to your student email. Enter it below to unlock your profile.
                </p>

                {error && <div className="error-message">{error}</div>}

                <form onSubmit={handleVerifyEmail}>
                    <div className="form-group">
                        <label>Verification Code</label>
                        <input
                            type="text"
                            placeholder="Enter 6-digit pin"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            disabled={verifyingEmail}
                            maxLength={6}
                            required
                            style={{ textAlign: 'center', fontSize: '1.2rem', letterSpacing: '2px', fontWeight: 'bold' }}
                        />
                    </div>

                    <button type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={verifyingEmail}>
                        {verifyingEmail ? "Verifying..." : "Verify Email"}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
                    Didn't receive the code?{' '}
                    <span 
                        onClick={handleResendCode} 
                        style={{ color: 'var(--gold-primary)', textDecoration: 'underline', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        {resending ? "Resending..." : "Resend Code"}
                    </span>
                </div>
            </div>
        )
    }

    // --- STANDARD PROFILE SCREEN ---
    return (
        <div>
            <ToastContainer />
            <h2>My Profile</h2>
            <p>View your claimed summoner profile details and keep your standings up-to-date with Riot Games.</p>
            
            {error && <div className="error-message">{error}</div>}

            {playerData ? (
                <div style={{ marginTop: '2rem' }}>
                    <PlayerCard data={playerData} />
                    
                    <div style={{ marginTop: '1.2rem', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button 
                            onClick={refreshMyStats} 
                            disabled={refreshing}
                            style={{ border: '1px solid var(--hextech-blue)', color: 'var(--hextech-blue)', padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                        >
                            {refreshing ? "Refreshing stats..." : "Refresh My Stats"}
                        </button>
                        <button 
                            onClick={() => setShowEditSocials(!showEditSocials)}
                            style={{ border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', padding: '0.45rem 1rem', fontSize: '0.8rem' }}
                        >
                            {showEditSocials ? "Close Edit" : "Edit Social Profiles"}
                        </button>
                    </div>

                    {showEditSocials && (
                        <form onSubmit={handleSaveSocials} className="hextech-card" style={{ maxWidth: '440px', margin: '1.5rem auto 0 auto', padding: '1.2rem', textAlign: 'left', background: 'rgba(6, 11, 19, 0.7)' }}>
                            <h4 style={{ fontFamily: 'Cinzel', color: 'var(--gold-primary)', marginTop: 0, marginBottom: '1rem', fontSize: '0.95rem', borderBottom: '1px solid var(--border-gold)', paddingBottom: '4px' }}>
                                Edit Gaming Handles
                            </h4>
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.75rem' }}>Discord Tag</label>
                                <input 
                                    type="text" 
                                    placeholder="Username or Username#0000"
                                    value={discord}
                                    onChange={(e) => setDiscord(e.target.value)}
                                    style={{ fontSize: '0.85rem', padding: '6px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.75rem' }}>Twitter / X Username</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. shaan_b"
                                    value={twitter}
                                    onChange={(e) => setTwitter(e.target.value)}
                                    style={{ fontSize: '0.85rem', padding: '6px' }}
                                />
                            </div>
                            <div className="form-group" style={{ marginBottom: '10px' }}>
                                <label style={{ fontSize: '0.75rem' }}>Main Positions / Lanes (Select multiple)</label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '4px' }}>
                                    {["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "SUPPORT", "FILL"].map(lane => {
                                        const isChecked = mainLane.includes(lane);
                                        return (
                                            <label key={lane} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-light)' }}>
                                                <input 
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (lane === "FILL") {
                                                                setMainLane(["FILL"]);
                                                            } else {
                                                                setMainLane(prev => {
                                                                    const filtered = prev.filter(x => x !== "FILL");
                                                                    return [...filtered, lane];
                                                                });
                                                            }
                                                        } else {
                                                            setMainLane(prev => {
                                                                const next = prev.filter(x => x !== lane);
                                                                return next.length === 0 ? ["FILL"] : next;
                                                            });
                                                        }
                                                    }}
                                                />
                                                {lane.charAt(0) + lane.slice(1).toLowerCase()}
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '12px' }}>
                                <label style={{ fontSize: '0.75rem' }}>Short Gaming Bio (Max 255 chars)</label>
                                <textarea 
                                    placeholder="Mid main looking for clash team..."
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    maxLength={255}
                                    rows={3}
                                    style={{ 
                                        width: '100%', 
                                        background: '#02060c', 
                                        border: '1px solid var(--border-blue)', 
                                        color: '#e2e8f0', 
                                        padding: '8px', 
                                        borderRadius: '2px', 
                                        fontSize: '0.85rem',
                                        resize: 'vertical',
                                        fontFamily: 'inherit'
                                    }}
                                />
                            </div>
                            <button type="submit" disabled={updatingSocials} style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}>
                                {updatingSocials ? "Saving..." : "Save Changes"}
                            </button>
                        </form>
                    )}

                    {/* Friends and Requests Section */}
                    <div style={{ marginTop: '2.5rem', width: '100%', textAlign: 'left' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
                            {/* Pending Requests Column */}
                            {requests.length > 0 && (
                                <div className="hextech-card" style={{ padding: '20px', border: '1px solid var(--border-blue)', background: 'rgba(6, 11, 19, 0.6)' }}>
                                    <h4 style={{ fontFamily: 'Cinzel', color: 'var(--gold-primary)', margin: '0 0 15px 0', borderBottom: '1px solid rgba(200,170,110,0.2)', paddingBottom: '6px', fontSize: '0.95rem' }}>
                                        Friend Requests ({requests.length})
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {requests.map(req => (
                                            <div key={req.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(2, 6, 12, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                        {req.game_name}#{req.tag}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-main)' }}>
                                                        {req.uni_name} • {req.rank_tier}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => handleAcceptRequest(req.user_id)} style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--success)', color: '#fff', border: 'none', cursor: 'pointer' }}>Accept</button>
                                                    <button onClick={() => handleDeclineRequest(req.user_id)} style={{ padding: '4px 8px', fontSize: '0.7rem', background: 'var(--danger)', color: '#fff', border: 'none', cursor: 'pointer' }}>Decline</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Friends List Column */}
                            <div className="hextech-card" style={{ padding: '20px', border: '1px solid var(--border-gold)', background: 'rgba(6, 11, 19, 0.6)', gridColumn: requests.length > 0 ? 'span 1' : 'span 2' }}>
                                <h4 style={{ fontFamily: 'Cinzel', color: 'var(--gold-primary)', margin: '0 0 15px 0', borderBottom: '1px solid rgba(200,170,110,0.2)', paddingBottom: '6px', fontSize: '0.95rem' }}>
                                    My Friends ({friends.length})
                                </h4>
                                {friends.length > 0 ? (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                                        {friends.map(friend => {
                                            const friendPfp = `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${friend.profile_icon_id || 29}.jpg`;
                                            return (
                                                <div key={friend.user_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(2, 6, 12, 0.4)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <img src={friendPfp} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--border-gold)' }} />
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                                <Link to={`/player/${friend.puuid}`} style={{ color: 'var(--text-light)', textDecoration: 'none' }}>
                                                                    {friend.game_name}
                                                                </Link>
                                                                <span style={{ color: 'var(--gold-primary)', fontSize: '0.75rem', fontFamily: 'Cinzel', marginLeft: '2px' }}>#{friend.tag}</span>
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-main)' }}>
                                                                {friend.rank_tier} ({friend.lp} LP)
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => handleRemoveFriend(friend.user_id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.8rem', padding: '4px' }} title="Remove Friend">✕</button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontStyle: 'italic', padding: '10px 0' }}>
                                        Your friends list is empty. View other players' profiles on the leaderboard to send friend requests!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div style={{ margin: '2rem auto', padding: '3rem', border: '1px dashed var(--border-gold)', borderRadius: '4px' }}>
                    <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                        No summoner profile claimed yet. Head to the Search page to look up your summoner name and claim your account.
                    </p>
                </div>
            )}
        </div>
    )
}

export default Profile