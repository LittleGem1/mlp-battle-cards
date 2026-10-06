const normal = [
  [1,'Applejack',9,6,2,8],[2,'Rainbow Dash',6,9,2,8],[3,'Twilight Sparkle',4,6,9,8],[4,'Pinkie Pie',5,8,6,9],[5,'Fluttershy',3,7,4,7],[6,'Rarity',4,5,8,6],[7,'Spike',5,4,3,8],[8,'Princess Celestia',8,8,9,9],[9,'Princess Luna',7,8,9,9],[10,'Starlight Glimmer',4,6,9,8],
  [11,'Princess Cadance',4,6,8,8],[12,'Flurry Heart',2,5,9,7],[13,'Trixie Lulamoon',3,5,8,6],[14,'Sunset Shimmer',5,6,8,7],[15,'Tempest Shadow',8,7,5,8],[16,'Shining Armor',8,5,7,8],[17,'Cozy Glow',2,7,5,8],[18,'Apple Bloom',4,5,2,7],[19,'Sweetie Belle',3,4,6,6],[20,'Scootaloo',4,8,2,6],
  [21,'Babs Seed',5,6,2,7],[22,'Diamond Tiara',2,4,3,5],[23,'Silver Spoon',2,4,3,5],[24,'Twist',2,3,3,6],[25,'Luster Dawn',3,5,8,6],[26,'Big Macintosh',9,4,1,9],[27,'Granny Smith',4,2,2,8],[28,'Pear Butter',5,4,3,8],[29,'Bright Mac',8,5,2,8],[30,'Aunt Holiday',3,5,4,7],
  [31,'Auntie Lofty',3,5,4,7],[32,'Sugar Belle',3,4,5,7],[33,'Maud Pie',7,2,3,9],[34,'Limestone Pie',8,5,2,8],[35,'Marble Pie',3,3,4,6],[36,'Cloudy Quartz',5,2,3,8],[37,'Igneous Rock Pie',7,2,2,9],[38,'Fancy Pants',4,5,5,7],[39,'Fleur de Lis',3,5,5,6],[40,'Suri Polomare',3,6,5,6],
  [41,'Coco Pommel',3,5,2,6],[42,'Hoity Toity',3,5,4,6],[43,'Photo Finish',2,6,4,6],[44,'Sapphire Shores',4,6,3,8],[45,'Prim Hemline',3,4,4,6],[46,'Trenderhoof',3,6,3,6],[47,'Vinyl Scratch',4,8,7,8],[48,'Octavia Melody',4,5,3,7],[49,'Lyra Heartstrings',3,5,6,6],[50,'Sweetie Drops',4,4,2,7],
  [51,'Derpy Hooves',4,7,2,8],[52,'Doctor Hooves',3,6,5,7],[53,'Minuette',3,6,6,7],[54,'Moondancer',3,4,8,6],[55,'Spitfire',7,9,2,9],[56,'Soarin',7,9,2,8],[57,'Fleetfoot',6,9,2,8],[58,'Lightning Dust',6,9,2,9],[59,'Misty Fly',5,8,2,8],[60,'Cheerilee',4,4,3,8]
].map(([n,name,strength,speed,magic,energy]) => ({
  id:`n${String(n).padStart(2,'0')}`,
  type:'normal',
  name,
  // Harte Obergrenze: keine normale Karten-Eigenschaft darf jemals über 9 liegen.
  strength:Math.min(9,strength),
  speed:Math.min(9,speed),
  magic:Math.min(9,magic),
  energy:Math.min(9,energy),
  image:`/assets/cards/${String(n).padStart(2,'0')}_${name.replaceAll(' ','_')}.webp`
}));

const specials = [
  {id:'s61',type:'special',name:'Twilight Sparkle – Spezialkarte',effect:'twilight',text:'Nimm 2 neue Karten.',image:'/assets/specials/61_Spezial_Twilight_Sparkle.webp'},
  {id:'s62',type:'special',name:'Rainbow Dash – Sonic Rainboom',effect:'rainbow',text:'Bei Schnelligkeit erhält deine Karte +2.',image:'/assets/specials/62_Spezial_Rainbow_Dash_Sonic_Rainboom.webp'},
  {id:'s63',type:'special',name:'Applejack – Ehrliche Arbeit',effect:'applejack',text:'Bei Stärke erhält deine Karte diese Runde +1.',image:'/assets/specials/63_Spezial_Applejack.webp'},
  {id:'s64',type:'special',name:'Pinkie Pie – Überraschungsparty',effect:'pinkie',text:'Ziehe 1 neue Karte.',image:'/assets/specials/64_Spezial_Pinkie_Pie.webp'},
  {id:'s65',type:'special',name:'Fluttershy – Sanfte Hilfe',effect:'fluttershy',text:'Sieh dir 2 Karten an und behalte 1 davon.',image:'/assets/specials/65_Spezial_Fluttershy.webp'},
  {id:'s66',type:'special',name:'Rarity – Perfekte Auswahl',effect:'rarity',text:'Tausche 1 Karte aus deiner Hand gegen 1 neue.',image:'/assets/specials/66_Spezial_Rarity.webp'}
];
const byId = Object.fromEntries([...normal,...specials].map(c=>[c.id,c]));
module.exports={normal,specials,byId};
