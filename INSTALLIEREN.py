from pathlib import Path
import shutil,re,sys
src=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
card,server,html=[root/p for p in ('cards.js','server.js','public/index.html')]
if not all(f.is_file() for f in (card,server,html)):
    print('Bitte INSTALLIEREN.py aus dem Hauptordner des Spiels starten oder den Spielordner als Argument angeben.');sys.exit(1)
s=card.read_text(encoding='utf8')
s=re.sub(r"^\s*\{id:'s(?:99|100)'.*?\n",'',s,flags=re.M)
needle='];\nconst artifacts = ['
if needle not in s:raise RuntimeError('Kartenliste nicht gefunden')
newcards="""  {id:'s99',type:'special',name:'Sweetie Bot',effect:'sweetiebot',text:'Erdbeben! Ziehe 1 normale Karte nach.',useIcon:'🤖',useLabel:'Roboter-Chaos',image:'/assets/new_specials/sweetie_bot.svg'},
  {id:'s100',type:'special',name:'Helements of Armory',effect:'helementsarmory',text:'Erhalte 1 zufälliges Artefakt, das du noch nicht besitzt.',useIcon:'💎',useLabel:'Artefakt beschwören',image:'/assets/new_specials/helements_armory.svg'},
"""
s=s.replace(needle,',\n'+newcards+'];\nconst artifacts = [',1)
# remove accidental extra comma if previous last item already ends in comma
s=s.replace('},\n,\n  {id:\'s99\'', '},\n  {id:\'s99\'')
sv=server.read_text(encoding='utf8')
# Remove previously installed handler only, without damaging any other effect blocks.
pattern=r"    }else if\(effect==='sweetiebot'\)\{.*?    }else if\(effect==='cockatrice'\)\{"
sv=re.sub(pattern,"    }else if(effect==='cockatrice'){",sv,flags=re.S)
pattern2=r"    }else if\(effect==='sweetiebot'\|\|effect==='helementsarmory'\)\{.*?    }else if\(effect==='cockatrice'\)\{"
sv=re.sub(pattern2,"    }else if(effect==='cockatrice'){",sv,flags=re.S)
needle2="    }else if(effect==='cockatrice'){"
start=sv.find("    }else if(effect==='hydra'){",sv.find("socket.on('"))
idx=sv.find(needle2,start)
if start<0 or idx<0 or idx-start>1700:raise RuntimeError('Live-Spezialkartenroutine nicht gefunden')
insert="""    }else if(effect==='sweetiebot'){
      const drawn=drawNormalForHand(r,p,1);p.hand.push(...drawn);
      socket.emit('specialDone',{text:'Sweetie Bot: '+drawn.length+' normale Karte nachgezogen.'});
    }else if(effect==='helementsarmory'){
      const owned=new Set(p.artifacts||[]);
      const possible=artifacts.filter(a=>!owned.has(a.id));
      if(!possible.length){socket.emit('specialDone',{text:'Du besitzt bereits alle 3 Artefakte.'});}
      else{
        const a=possible[Math.floor(Math.random()*possible.length)];
        p.artifacts.push(a.id);
        io.to(r.code).emit('helementsArtifactGranted',{playerId:p.id,playerName:p.name,artifact:{id:a.id,name:a.name,image:a.image}});
        io.to(r.code).emit('artifactFound',{playerId:p.id,playerName:p.name,card:a,artifacts:p.artifacts.map(x=>byId[x]).filter(Boolean),collected:new Set(p.artifacts).size,total:artifacts.length});
        socket.emit('specialDone',{text:'Helements of Armory: '+a.name+' erhalten!'});
      }
"""
sv=sv[:idx]+insert+sv[idx:]
h=html.read_text(encoding='utf8')
h=re.sub(r'<link rel="stylesheet" href="/assets/new_specials/specials.css[^"]*"\s*/?>\s*','',h)
h=re.sub(r'<script defer src="/assets/new_specials/specials.js[^"]*"></script>\s*','',h)
h=h.replace('</head>','<link rel="stylesheet" href="/assets/new_specials/specials.css?v=original3"><script defer src="/assets/new_specials/specials.js?v=original3"></script></head>',1)
for path,content in ((card,s),(server,sv),(html,h)):
    if path.read_text(encoding='utf8')!=content:
        shutil.copy2(path,str(path)+'.backup_armory_v3')
        path.write_text(content,encoding='utf8')
        print('Aktualisiert:',path)
dest=root/'public/assets/new_specials';dest.mkdir(parents=True,exist_ok=True)
for file in (src/'public/assets/new_specials').iterdir():
    if file.is_file():shutil.copy2(file,dest/file.name)
print('Fertig. Jetzt die geänderten Spiel-Dateien nach GitHub hochladen und Render deployen.')
