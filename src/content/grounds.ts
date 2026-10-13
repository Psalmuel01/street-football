export const grounds = {
 arena:{name:'Lagos Matchday Arena',tag:'THE BIG OCCASION',description:'Green playing surface, raised terraces and club banners.',colour:'#548b65',accent:'#d9e7ad'},
 surulere:{name:'Surulere Yard',tag:'THE NEIGHBOURHOOD',description:'Concrete, close fences and a crowd on the touchline.',colour:'#b2c3c3',accent:'#d4b477'},
 marina:{name:'Marina Five',tag:'THE WATERFRONT',description:'Blue court, shipping containers and a waterside backdrop.',colour:'#569aa1',accent:'#f2d29b'},
 cage:{name:'Residential Cage',tag:'CLOSE TO HOME',description:'An enclosed court between apartments, with high mesh fencing and balcony spectators.',colour:'#ac7968',accent:'#edb497'},
 sand:{name:'Community Sands',tag:'ROOM TO BREATHE',description:'Firm sand, an open horizon, palms and a community pavilion. Standard grip; weather still matters.',colour:'#d7b778',accent:'#716447'},
} as const;
export type Ground = keyof typeof grounds;
export const DEFAULT_GROUND:Ground="arena";
