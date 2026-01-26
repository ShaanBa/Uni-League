import { useState } from "react"
import PlayerCard from "./PlayerCard"
function SearchPage() {
    // state 
    const [gameName, setGameName] = useState("") // intializes 2 variables game name anf tag line with empty state 
    const [tagLine, setTagLine] = useState("")
    const [playerData, setPlayerData] = useState(null)
    //logic
    const getSummoner = async () => {
        const response = await fetch(`/api/search/${gameName}/${tagLine}`)
        const summoner = await response.json()
        console.log(summoner)
        setPlayerData(summoner)  
        console.log(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`)
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
            },
            body: JSON.stringify({ user_id: token, puuid: playerData.puuid})
        }

        )
        alert('Profile Claimed!')
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