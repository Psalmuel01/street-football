/** Portraits are original renders of the same club kit and character identity used on pitch. */
export function portrait(team:number,player:number){return `/assets/portraits/${team}-${player}.png`;}
export function characterIdentity(team:number,player:number){return team<4?player:team*9+player;}
