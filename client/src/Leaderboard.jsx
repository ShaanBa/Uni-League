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
            <table className="leaderboard-table">
                <caption>Leaderboard</caption>
                <thead>
                    <tr>

                    <th>Player</th>
                    <th>Rank</th>
                    <th>School</th>
                    
                    </tr>
                </thead>
                <tbody>
            {
            players.map((player) => (
            <tr key={player.puuid}>
                <td>{player.game_name}</td> <td>{player.rank_tier}</td> <td>{player.uni_name}</td>
            </tr>
            
            ))
            
            }
            </tbody>
            </table>
        </div>
)}
export default Leaderboard