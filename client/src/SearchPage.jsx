import { useState } from "react"
import PlayerCard from "./PlayerCard"

function SearchPage() {
    // state 
    const [gameName, setGameName] = useState("") 
    const [tagLine, setTagLine] = useState("")
    const [playerData, setPlayerData] = useState(null)
    
    //logic
    const getSummoner = async () => {
        const response = await fetch(`/api/search/${gameName}/${tagLine}`)
        const summoner = await response.json()
        console.log(summoner)
        setPlayerData(summoner)  
    }
    
    const claimProfile = async () => {
        const token = localStorage.getItem('user_token')

        if (token == null) {
            alert('User not logged in!')
            return
        }

        if (playerData == null) {
            alert("Search for summoner first!")
            return
        }
        
        const response = await fetch('/api/claim_summoner', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 1. UPDATE: Add the token to the header (Showing the wristband)
                'Authorization': `Bearer ${token}` 
            },
            // 2. UPDATE: Delete user_id from here! Just send the puuid.
            body: JSON.stringify({ puuid: playerData.puuid }) 
        })
        
        if (response.ok) {
            alert('Profile Claimed!')
        } else {
            alert('Failed to claim profile. Are you sure your token is valid?')
        }
    }

    return (
        <div>
            {playerData && <PlayerCard data={playerData}/>}
            <input 
            type='text'
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            />

            <input 
            type='text'
            value={tagLine}
            onChange={(e) => setTagLine(e.target.value)}
            />

            <button onClick={getSummoner}>Get Summoner</button>
            <button onClick={claimProfile}>Claim Profile</button>
        </div>
    )
}

export default SearchPage