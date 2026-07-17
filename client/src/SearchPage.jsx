import { useState } from "react"
import PlayerCard from "./PlayerCard"

function SearchPage() {
    // state 
    const [gameName, setGameName] = useState("") 
    const [tagLine, setTagLine] = useState("")
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    
    // Grab the token to see if user is logged in (to conditionally show claim option)
    const token = localStorage.getItem('user_token')

    // logic
    const getSummoner = async () => {
        if (!gameName.trim() || !tagLine.trim()) {
            setError("Both Game Name and Tagline are required.")
            return
        }

        setLoading(true)
        setError(null)
        setPlayerData(null)

        // Clean tagline by stripping leading '#' if user input it
        const cleanTag = tagLine.trim().replace(/^#/, "")

        try {
            const response = await fetch(`/api/search/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(cleanTag)}`)
            const data = await response.json()
            
            if (response.ok) {
                setPlayerData(data)
            } else {
                setError(data.error || "Failed to find summoner. Please check details and try again.")
            }
        } catch (err) {
            setError("Could not connect to the server. Please try again later.")
        } finally {
            setLoading(false)
        }
    }
    
    const claimProfile = async () => {
        if (token == null) {
            setError("You must be logged in to claim a summoner.")
            return
        }

        if (playerData == null) {
            setError("Search for a summoner first!")
            return
        }
        
        setError(null)
        try {
            const response = await fetch('/api/claim_summoner', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ puuid: playerData.puuid }) 
            })
            
            if (response.ok) {
                alert('Profile Claimed successfully!')
            } else {
                const data = await response.json()
                setError(data.error || 'Failed to claim profile. Is this profile already claimed?')
            }
        } catch (err) {
            setError("Failed to claim profile. Server error.")
        }
    }

    return (
        <div>
            <h2>Summoner Search</h2>
            <p>Look up any League of Legends summoner in the Americas region to fetch their current solo queue standing.</p>
            
            {error && <div className="error-message">{error}</div>}

            <div className="search-controls">
                <input 
                    type='text'
                    placeholder="Game Name (e.g. Hide on bush)"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    disabled={loading}
                />

                <div className="tag-input-wrapper">
                    <span className="tag-prefix">#</span>
                    <input 
                        type='text'
                        placeholder="NA1"
                        value={tagLine}
                        onChange={(e) => setTagLine(e.target.value)}
                        disabled={loading}
                    />
                </div>

                <button onClick={getSummoner} disabled={loading}>
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>

            {loading && (
                <div style={{ margin: '2rem auto', fontStyle: 'italic', color: 'var(--hextech-blue)' }}>
                    Searching the Rift...
                </div>
            )}

            {playerData && (
                <div style={{ marginTop: '2rem' }}>
                    <PlayerCard data={playerData}/>
                    
                    {token && (
                        <div className="action-buttons-group">
                            <button onClick={claimProfile} style={{ border: '1px solid var(--hextech-blue)', color: 'var(--hextech-blue)' }}>
                                Claim Profile
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SearchPage