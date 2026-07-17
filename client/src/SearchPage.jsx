import { useState } from "react"
import PlayerCard from "./PlayerCard"

function SearchPage() {
    // state 
    const [region, setRegion] = useState("na1")
    const [gameName, setGameName] = useState("") 
    const [tagLine, setTagLine] = useState("")
    const [playerData, setPlayerData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    
    // Verification claim flow state
    const [claimCode, setClaimCode] = useState(null)
    const [verifyingClaim, setVerifyingClaim] = useState(false)

    // Grab the token to see if user is logged in
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
        setClaimCode(null)

        // Clean tagline by stripping leading '#' if user input it
        const cleanTag = tagLine.trim().replace(/^#/, "")

        try {
            const response = await fetch(`/api/search/${region}/${encodeURIComponent(gameName.trim())}/${encodeURIComponent(cleanTag)}`)
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
    
    const requestClaim = async () => {
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
            const response = await fetch('/api/claim_summoner/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ puuid: playerData.puuid }) 
            })
            
            const data = await response.json()
            if (response.ok) {
                setClaimCode(data.verification_code)
            } else {
                setError(data.error || 'Failed to request verification code.')
            }
        } catch (err) {
            setError("Failed to reach the server.")
        }
    }

    const verifyClaim = async (bypass = false) => {
        if (playerData == null || token == null) return;
        
        setError(null)
        setVerifyingClaim(true)
        try {
            const payload = { puuid: playerData.puuid }
            if (bypass) {
                payload.bypass_code = 'DEV_BYPASS'
            }

            const response = await fetch('/api/claim_summoner/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })

            const data = await response.json()
            if (response.ok) {
                alert(data.message || 'Profile Claimed successfully!')
                setClaimCode(null)
            } else {
                setError(data.error || 'Verification failed. Please double check the code is saved in your League client.')
            }
        } catch (err) {
            setError("Failed to verify claim. Server error.")
        } finally {
            setVerifyingClaim(false)
        }
    }

    return (
        <div>
            <h2>Summoner Search</h2>
            <p>Look up any League of Legends summoner in the Americas region to fetch their current solo queue standing.</p>
            
            {error && <div className="error-message">{error}</div>}

            <div className="search-controls">
                <select 
                    value={region} 
                    onChange={(e) => setRegion(e.target.value)}
                    className="hextech-select"
                    style={{ padding: '0.85rem 1.2rem', margin: '0', height: '48px', border: '1px solid var(--border-blue)' }}
                    disabled={loading}
                >
                    <option value="na1">NA</option>
                    <option value="euw1">EUW</option>
                    <option value="eun1">EUNE</option>
                    <option value="kr">KR</option>
                    <option value="oc1">OCE</option>
                    <option value="br1">BR</option>
                    <option value="la1">LAN</option>
                    <option value="la2">LAS</option>
                    <option value="jp1">JP</option>
                    <option value="tr1">TR</option>
                    <option value="ru">RU</option>
                </select>

                <input 
                    type='text'
                    placeholder="Game Name (e.g. Hide on bush)"
                    value={gameName}
                    onChange={(e) => setGameName(e.target.value)}
                    disabled={loading}
                    style={{ margin: '0' }}
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
                    
                    {token && !claimCode && (
                        <div className="action-buttons-group">
                            <button onClick={requestClaim} style={{ border: '1px solid var(--hextech-blue)', color: 'var(--hextech-blue)' }}>
                                Claim Profile
                            </button>
                        </div>
                    )}

                    {claimCode && (
                        <div className="form-container" style={{ maxWidth: '500px', marginTop: '1.5rem', border: '1px solid var(--hextech-blue)' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--hextech-blue)', marginBottom: '1rem' }}>Summoner Verification Required</h3>
                            <p style={{ fontSize: '0.85rem', textAlign: 'left', marginBottom: '1rem', color: '#b3bac6' }}>
                                To verify you own this League of Legends account:
                            </p>
                            <ol style={{ textAlign: 'left', fontSize: '0.85rem', paddingLeft: '1.2rem', marginBottom: '1.5rem', color: '#b3bac6', lineHeight: '1.6' }}>
                                <li>Open your League of Legends Client.</li>
                                <li>Go to <strong>Settings</strong> (cog icon) &gt; <strong>Verification</strong>.</li>
                                <li>Enter the following code exactly and click Save:</li>
                            </ol>
                            
                            <div style={{ background: 'rgba(2, 6, 12, 0.9)', border: '1px solid var(--border-gold)', color: 'var(--gold-primary)', padding: '10px', fontSize: '1.3rem', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '1.5rem', borderRadius: '4px', textShadow: '0 0 10px rgba(200,170,110,0.3)' }}>
                                {claimCode}
                            </div>
                            
                            <div className="action-buttons-group" style={{ flexDirection: 'column', gap: '10px' }}>
                                <button onClick={() => verifyClaim(false)} disabled={verifyingClaim} style={{ width: '100%' }}>
                                    {verifyingClaim ? "Verifying client..." : "Verify & Claim"}
                                </button>
                                <button onClick={() => setClaimCode(null)} disabled={verifyingClaim} style={{ width: '100%', border: '1px solid var(--text-main)', color: 'var(--text-main)', background: 'transparent' }}>
                                    Cancel
                                </button>
                                <span 
                                    onClick={() => verifyClaim(true)} 
                                    style={{ color: 'var(--text-main)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer', marginTop: '5px' }}
                                >
                                    Bypass Verification (Developer Mode)
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

export default SearchPage