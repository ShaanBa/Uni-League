import { useState, useEffect } from "react"
import PlayerCard from "./PlayerCard"

function Profile() {
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(true)
    const token = localStorage.getItem('user_token')

    const fetchProfile = async () => {
        if (!token) return
        
        // 1. UPDATE: Change URL to /me and pass the JWT in the Authorization header
        const response = await fetch('/api/profile/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}` 
            }
        })
        
        if (response.ok) {
            const data = await response.json()
            setPlayerData(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchProfile()
    }, [token])

    const refreshMyStats = async () => {
        // 2. UPDATE: Add the token to headers, and DELETE the body completely
        const response = await fetch('/api/refresh_summoner', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            }
        })
        
        if (response.ok) {
            alert('Stats Refreshed!')
            fetchProfile() 
        } else {
            alert('Failed to refresh stats.')
        }
    }

    if (loading) return <div>Loading...</div>

    return (
        <div>
            <h2>My Profile</h2>
            {playerData ? (
                <>
                    <PlayerCard data={playerData} />
                    <button onClick={refreshMyStats} style={{ marginTop: '16px' }}>
                        Refresh My Stats
                    </button>
                </>
            ) : (
                <p>No profile claimed yet. Head to the Search page to claim your summoner!</p>
            )}
        </div>
    )
}

export default Profile