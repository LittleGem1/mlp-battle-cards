from pathlib import Path
import shutil,sys
root=Path(__file__).resolve().parent
project=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
card=project/'cards.js';server=project/'server.js';html=project/'public/index.html'
if not all(x.is_file() for x in (card,server,html)):
 print('FEHLER: Lege die ZIP im Hauptordner deines Spiels ab oder gib den Spielordner als Argument an.');sys.exit(1)
entries="""  {id:'s99',type:'special',name:'Sweetie Bot',effect:'sweetiebot',text:'Erdbeben! Ziehe 1 normale Karte nach.',useIcon:'🤖',useLabel:'Roboter-Chaos',image:'/assets/new_specials/sweetie_bot.svg'},
  {id:'s100',type:'special',name:'Helements of Armory',effect:'helementsarmory',text:'Elementarenergie! Ziehe 2 normale Karten nach.',useIcon:'💎',useLabel:'Gemeinsame Elementarmacht',image:'/assets/new_specials/helements_armory.svg'},
"""
patches=[(card,"const artifacts = [",entries+"const artifacts = [","effect:'sweetiebot'"),(server,"    }else if(effect==='cockatrice'){","    }else if(effect==='sweetiebot'||effect==='helementsarmory'){\n      const drawn=drawNormalForHand(r,p,effect==='sweetiebot'?1:2);\n      p.hand.push(...drawn);\n      socket.emit('specialDone',{text:(effect==='sweetiebot'?'Sweetie Bot':'Helements of Armory')+': '+drawn.length+' normale Karten nachgezogen.'});\n    }else if(effect==='cockatrice'){","effect==='sweetiebot'||effect==='helementsarmory'"),(html,"</head>",'  <link rel="stylesheet" href="/assets/new_specials/specials.css?v=20261012-new">\n  <script defer src="/assets/new_specials/specials.js?v=20261012-new"></script>\n</head>',"/assets/new_specials/specials.js")]
for file,needle,repl,marker in patches:
 s=file.read_text(encoding='utf-8')
 if marker in s:print('Bereits installiert:',file.name);continue
 if s.count(needle)!=1:print('FEHLER: Passende Stelle nicht gefunden:',file);sys.exit(2)
 backup=file.with_suffix(file.suffix+'.vor_sweetiebot_backup');shutil.copy2(file,backup)
 file.write_text(s.replace(needle,repl,1),encoding='utf-8');print('Aktualisiert:',file)
dest=project/'public/assets/new_specials';dest.mkdir(parents=True,exist_ok=True)
for src in (root/'public/assets/new_specials').iterdir():shutil.copy2(src,dest/src.name)
print('FERTIG. Server nach dem Hochladen neu starten. Hinweis: Kartengrafiken sind neue Platzhalter-Illustrationen.')
