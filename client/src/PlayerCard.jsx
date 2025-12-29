function PlayerCard({   data    }) {
    return(
        <div>
            {data.account.gameName}
            {data.rank[0].tier}
        </div>
    )

    }
    export default PlayerCard
