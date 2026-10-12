from pathlib import Path
import shutil,sys
src=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
files=[root/'cards.js',root/'server.js',root/'public/index.html']
if not all(f.is_file() for f in files):
 print('FEHLER: INSTALLIEREN.py im Spiel-Hauptordner ausfuehren oder Spielordner als Argument angeben');sys.exit(1)
card,server,html=files
s=card.read_text(encoding='utf8')
newcards="""  {id:'s99',type:'special',name:'Sweetie Bot',effect:'sweetiebot',text:'Erdbeben! Ziehe 1 normale Karte nach.',useIcon:'🤖',useLabel:'Roboter-Chaos',image:'/assets/new_specials/sweetie_bot.svg'},
  {id:'s100',type:'special',name:'Helements of Armory',effect:'helementsarmory',text:'Erhalte 1 zufaelliges Artefakt, das du noch nicht besitzt.',useIcon:'💎',useLabel:'Gemeinsame Elementarmacht',image:'/assets/new_specials/helements_armory.svg'},
"""
import re
s=re.sub(r"^  \{id:'s99'.*\n",'',s,flags=re.M)
s=re.sub(r"^  \{id:'s100'.*\n",'',s,flags=re.M)
if 'const artifacts = [' not in s:raise RuntimeError('Kartenanker fehlt')
s=s.replace('const artifacts = [',newcards+'const artifacts = [',1)
sv=server.read_text(encoding='utf8')
# Replace installed old handler if it exists
sv=re.sub(r"    }else if\(effect==='sweetiebot'\|\|effect==='helementsarmory'\)\{.*?    }else if\(effect==='cockatrice'\)\{", "    }else if(effect==='cockatrice'){",sv,flags=re.S)
needle="    }else if(effect==='cockatrice'){"
assert needle in sv,'Server-Handler fehlt'
code="""    }else if(effect==='sweetiebot'){
      const drawn=drawNormalForHand(r,p,1);p.hand.push(...drawn);
      socket.emit('specialDone',{text:'Sweetie Bot: '+drawn.length+' normale Karte nachgezogen.'});
    }else if(effect==='helementsarmory'){
      // Artefakt wird ausschliesslich auf dem Server vergeben.
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
    }else if(effect==='cockatrice'){"""
# there are several branches; only install in live socket effect branch, use last occurrence before special action.
pos=sv.find("    }else if(effect==='hydra'){",sv.find('socket.on('))
if pos==-1:raise RuntimeError('Hydra-Effekt im Server nicht gefunden')
idx=sv.find(needle,pos)
if idx<0 or idx-pos>1500:raise RuntimeError('Spezialkartenstelle nicht gefunden')
sv=sv[:idx]+sv[idx:].replace(needle,code,1)
h=html.read_text(encoding='utf8')
if '/assets/new_specials/specials.js' not in h:
 h=h.replace('</head>','  <link rel="stylesheet" href="/assets/new_specials/specials.css?v=fix2">\n  <script defer src="/assets/new_specials/specials.js?v=fix2"></script>\n</head>',1)
else:
 h=h.replace('specials.js?v=20261012-new','specials.js?v=fix2').replace('specials.css?v=20261012-new','specials.css?v=fix2')
for f,new in [(card,s),(server,sv),(html,h)]:
 if f.read_text(encoding='utf8')!=new:
  shutil.copy2(f,str(f)+'.backup_helements_fix2')
  f.write_text(new,encoding='utf8');print('Aktualisiert:',f)
folder=root/'public/assets/new_specials';folder.mkdir(parents=True,exist_ok=True)
for f in (src/'public/assets/new_specials').iterdir():
 if f.is_file():shutil.copy2(f,folder/f.name)
print('FERTIG: Spiel auf GitHub hochladen und Render neu deployen.')
