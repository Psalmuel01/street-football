export const grounds = {
 surulere:{name:'Surulere Yard',tag:'THE NEIGHBOURHOOD',description:'Concrete, close fences and a crowd on the touchline.',colour:'#b2c3c3',accent:'#d4b477'},
 marina:{name:'Marina Five',tag:'THE WATERFRONT',description:'Blue court, shipping containers and a waterside backdrop.',colour:'#569aa1',accent:'#f2d29b'},
 arena:{name:'Lagos Matchday Arena',tag:'THE BIG OCCASION',description:'Green playing surface, raised terraces and club banners.',colour:'#548b65',accent:'#d9e7ad'},
} as const;
export type Ground = keyof typeof grounds;
