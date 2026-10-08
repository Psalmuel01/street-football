import pack from './commentary-pack.json';
export const callouts:Record<string,string[]>={};
export const captions:Record<string,string>={};
for(const [event,lines] of Object.entries(pack)){callouts[event]=lines.map((text,i)=>{const id=`${event}-${i+1}`;captions[id]=text;return id;});}
