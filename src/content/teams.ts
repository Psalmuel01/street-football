export const teams = [
  {
    id: "surulere",
    name: "Surulere Stars",
    short: "SUR",
    color: "#f4c64b",
    ink: "#242d24",
    motto: "From the area. For the area.",
    names: ["Tobi", "Dami", "Femi", "Seyi", "Bayo"],
  },
  {
    id: "yaba",
    name: "Yaba Boys",
    short: "YAB",
    color: "#5cc5b5",
    ink: "#103b35",
    motto: "Small space. Big ideas.",
    names: ["Emeka", "Dele", "Tunde", "Kola", "Nnamdi"],
  },
  {
    id: "agege",
    name: "Agege Lions",
    short: "AGE",
    color: "#e8815d",
    ink: "#48291d",
    motto: "Every ball is our ball.",
    names: ["Ayo", "Ife", "Wale", "Chidi", "Kunle"],
  },
  {
    id: "mushin",
    name: "Mushin United",
    short: "MSH",
    color: "#b5a3dc",
    ink: "#33254c",
    motto: "Together on this ground.",
    names: ["Obi", "Segun", "Yemi", "Fola", "Tayo"],
  },
];
export const lines = {
  kickoff: "Oya, play ball!",
  goal: "Na goal! The area don hear.",
  save: "Keeper! Safe hands.",
  tackle: "Clean tackle. Carry go!",
  fulltime: "Final whistle. Respect the game.",
  skill: "Comot body!",
  pass: "Pass am!",
};
export type Team = (typeof teams)[number];
