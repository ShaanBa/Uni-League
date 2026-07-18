/* Shared utility functions for Uni-League */

/**
 * Map a rank tier string to a display color.
 * Used by PlayerCard, Leaderboard, and MatchSimulator.
 */
export function getRankColor(tier) {
    if (!tier) return '#a0a6b1';
    const t = tier.toUpperCase();
    const colors = {
        IRON:        '#5e5146',
        BRONZE:      '#8c5a2e',
        SILVER:      '#7f8c8d',
        GOLD:        '#c8aa6e',
        PLATINUM:    '#26a882',
        EMERALD:     '#2ecc71',
        DIAMOND:     '#5b7bb5',
        MASTER:      '#9b59b6',
        GRANDMASTER: '#e74c3c',
        CHALLENGER:  '#f1c40f',
    };
    return colors[t] || '#a0a6b1';
}

/** Default profile icon fallback (Poro icon). */
export const FALLBACK_ICON =
    'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/29.jpg';

/** Current DDragon patch version for champion/asset images. */
export const DDRAGON_VERSION = '14.14.1';

/** Build a DDragon champion image URL. */
export function championImgUrl(championName) {
    if (!championName) return FALLBACK_ICON;
    return `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/champion/${championName.replace(/\s+/g, '')}.png`;
}

/** Build a Community Dragon position (role) icon URL. */
export function getPositionIconUrl(lane) {
    if (!lane) return '';
    const l = lane.toUpperCase();
    const mapping = {
        TOP: 'top',
        JUNGLE: 'jungle',
        MIDDLE: 'middle',
        BOTTOM: 'bottom',
        SUPPORT: 'utility',
        FILL: 'fill'
    };
    const key = mapping[l] || 'fill';
    return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-clash/global/default/assets/images/position-selector/positions/icon-position-${key}.png`;
}
