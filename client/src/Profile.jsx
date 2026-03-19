import { useState, useEffect } from "react"
import PlayerCard from "./PlayerCard"

function Profile() {
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(true)
    const token = localStorage.getItem('user_token')

    const fetchProfile = async () => {
        if (!token) return
        const response = await fetch(`/api/profile/${token}`)
        if (response.ok) {
            const data = await response.json()
            setPlayerData(data)
        }
        setLoading(false)
    }

    // Fetch the profile immediately when the component mounts
    useEffect(() => {
        fetchProfile()
    }, [token])

    const refreshMyStats = async () => {
        const response = await fetch('/api/refresh_summoner', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token })
        })
        
        if (response.ok) {
            alert('Stats Refreshed!')
            fetchProfile() // Re-fetch to update the PlayerCard instantly
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