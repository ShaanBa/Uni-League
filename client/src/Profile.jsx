import { useState, useEffect } from "react"
import PlayerCard from "./PlayerCard"

function Profile() {
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState(null)
    const token = localStorage.getItem('user_token')

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
            
            if (response.ok) {
                const data = await response.json()
                setPlayerData(data)
            } else if (response.status === 404) {
                // Not claimed yet, which is expected
                setPlayerData(null)
            } else {
                setError("Failed to retrieve profile data.")
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
                alert('Stats Refreshed from Riot Games API!')
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

    return (
        <div>
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
                <div style={{ margin: '2rem auto', padding: '2rem', border: '1px dashed var(--border-gold)', borderRadius: '4px' }}>
                    <p style={{ color: 'var(--text-main)', marginBottom: '1.5rem' }}>
                        No summoner profile claimed yet. Head to the Search page to look up your summoner name and claim your account.
                    </p>
                </div>
            )}
        </div>
    )
}

export default Profile