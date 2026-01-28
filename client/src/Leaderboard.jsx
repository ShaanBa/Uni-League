import { use, useEffect, useState } from "react";

function Leaderboard() {
    const [players, setPlayers] = useState([])

    useEffect(() => {
        const fetchLeaderboardData = async () => {
            const uni_id = localStorage.getItem("uni_id")
            const response = await fetch(`/api/leaderboard/${uni_id}`)
            const data = await response.json()
            console.log(data)
            setPlayers(data)
        }
        fetchLeaderboardData()
    }, [])

    return (
        <div>
            {players.map((player) => (
            <div key={player.puuid}>
                {player.game_name} - {player.rank_tier}
            </div>
            ))}
        </div>
)}
export default Leaderboard