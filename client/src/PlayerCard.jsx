function PlayerCard({   data    }) {
    return(
        <div>
            {data.gameName}
            {data.rankTier}
            {data.rankDivision}
        </div>
    )

    }
    export default PlayerCard
