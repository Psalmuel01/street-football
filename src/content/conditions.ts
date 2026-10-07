export type Conditions='golden'|'night'|'rain';
export const conditions:Record<Conditions,{name:string;description:string;traction:number;drag:number;bounce:number}>={
 golden:{name:'Golden hour',description:'Warm evening light. Dry concrete and predictable grip.',traction:1,drag:.48,bounce:.42},
 night:{name:'Under the lights',description:'Floodlights, glowing shopfronts and an evening crowd.',traction:1,drag:.48,bounce:.42},
 rain:{name:'After the rain',description:'A wet, colourful court. Longer skidding passes and softer bounce.',traction:.83,drag:.28,bounce:.28},
};
