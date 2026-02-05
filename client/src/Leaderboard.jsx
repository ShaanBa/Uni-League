import { use, useEffect, useState } from "react";

function Leaderboard() {
    const [players, setPlayers] = useState([])
    const [viewMode, setViewMode] = useState(localStorage.getItem("uni_id"))

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            if (!viewMode) {
                alert("Please log in!")
                return
            }

            const response = await fetch(`/api/leaderboard/${viewMode}`)
            const data = await response.json()
            console.log(data)
            setPlayers(data)
        }
        fetchLeaderboardData()
    }, [viewMode])

    return (
        <div>
            <select value={viewMode} 
            onChange={(e) => setViewMode(e.target.value)}>
                <option value={localStorage.getItem("uni_id")}>My School</option>
                <option value={"all"}>Global</option>
            </select>
            {players.map((player) => (
            <div key={player.puuid}>
                {player.game_name} - {player.rank_tier}
                {player.uni_name && <span> - {player.uni_name}</span>}
            </div>
            ))}
        </div>
)}
export default Leaderboard