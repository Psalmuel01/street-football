export const formations={
 '2-2':{name:'The foundation',description:'Two behind the ball, two ready to break.',positions:[[-28,0],[-16,-9],[-16,9],[-5,-6],[-5,6]]},
 '1-2-1':{name:'The diamond',description:'A holding defender, width on both sides and a focal point.',positions:[[-28,0],[-19,0],[-11,-10],[-11,10],[-3,0]]},
 '1-3':{name:'All forward',description:'One holds the ground. Three stretch the defence.',positions:[[-28,0],[-19,0],[-5,-11],[-7,0],[-5,11]]},
} as const;
export type Formation=keyof typeof formations;
