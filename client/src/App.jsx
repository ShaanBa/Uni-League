import { use, useState } from 'react'

function SearchBar() {
    // state 
    const [gameName, setGameName] = useState("") // intializes 2 variables game name anf tag line with empty state 
    const [tagLine, setTagLine] = useState("")
    //logic
    const getSummoner = async () => {
        const response = await fetch(`/api/search/${gameName}/${tagLine}`)
        const summoner = await response.json()
        console.log(summoner)
        //console.log(`https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${gameName}/${tagLine}`)
    }

    return (
        <div>
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
        </div>
    )
}
export default SearchBar

