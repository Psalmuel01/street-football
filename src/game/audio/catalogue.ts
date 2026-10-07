export type MusicScene='menu'|'selection'|'intro'|'gameplay'|'replay'|'win'|'draw'|'loss';
export const musicPack={
 menu:[{id:'after-hours',title:'After Hours',bpm:106,seed:51,variant:0,bars:48},{id:'mainland-sunshine',title:'Mainland Sunshine',bpm:112,seed:419,variant:1,bars:48}],
 ambient:[{id:'kiosk-sessions',title:'Kiosk Sessions',bpm:104,seed:713,variant:2,bars:24},{id:'junction-groove',title:'Junction Groove',bpm:110,seed:928,variant:3,bars:24}],
 intro:[{id:'ground-opens',title:'The Ground Opens',bpm:106,seed:851,variant:2,bars:4},{id:'our-area',title:'Our Area',bpm:112,seed:642,variant:1,bars:4}],
 results:[{id:'win',title:'Area Celebration',bpm:112,seed:511,variant:1,bars:16},{id:'draw',title:'Respect the Game',bpm:106,seed:442,variant:0,bars:16},{id:'loss',title:'Run It Back',bpm:104,seed:812,variant:2,bars:16}],
 champion:[{id:'ground-owner',title:'This Ground Get Owner',bpm:112,seed:735,variant:3,bars:8}],
} as const;
export const musicUrl=(group:keyof typeof musicPack,id:string)=>`/assets/audio/music/${group}/${id}.m4a`;
export type Bus='master'|'music'|'commentary'|'players'|'crowd'|'environment'|'sfx'|'ui';
export const busDefaults:Record<Bus,number>={master:.85,music:.38,commentary:.9,players:.75,crowd:.5,environment:.45,sfx:.7,ui:.35};
export const sceneGain:Record<MusicScene,number>={menu:1,selection:1,intro:.8,gameplay:.10,replay:.07,win:1,draw:.85,loss:.75};

/** Downloaded recording; keep separate from the source-generated pack/export pipeline. */
export const radioTracks=[{id:'fassounds-the-afrobeat',title:'The Afrobeat — FASSounds',url:'/assets/audio/music/licensed/fassounds-the-afrobeat.mp3',source:'https://pixabay.com/music/afrobeat-the-afrobeat-153058/',license:'https://pixabay.com/service/license-summary/'}] as const;
