import { useState, useEffect } from "react"
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

    // Email OTP states
    const [verificationCode, setVerificationCode] = useState("")
    const [verifyingEmail, setVerifyingEmail] = useState(false)
    const [resending, setResending] = useState(false)

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

    useEffect(() => {
        fetchProfile()
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
                    
                    <button 
                        onClick={refreshMyStats} 
                        disabled={refreshing}
                        style={{ marginTop: '1.5rem', border: '1px solid var(--hextech-blue)', color: 'var(--hextech-blue)' }}
                    >
                        {refreshing ? "Refreshing stats..." : "Refresh My Stats"}
                    </button>
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