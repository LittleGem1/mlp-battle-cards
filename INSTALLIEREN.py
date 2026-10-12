from pathlib import Path
import sys,re,shutil
src=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else Path.cwd()
paths=[root/'cards.js',root/'server.js',root/'public/index.html']
if not all(p.is_file() for p in paths):
 raise SystemExit('Spielordner nicht gefunden. Starte das Skript im Hauptordner von mlp-battle-cards (bei server.js).')
card,server,html=paths
cs=card.read_text('utf-8');sv=server.read_text('utf-8');h=html.read_text('utf-8')
# Replace only this named card; preserve all others.
cs=re.sub(r"(?m)^\s*\{id:'s100',type:'special',name:'Helements of Armory'.*?\n",'',cs)
entry="  {id:'s100',type:'special',name:'Helements of Armory',effect:'helementsarmory',text:'Erhalte ein zufälliges Artefakt, das du noch nicht besitzt.',useIcon:'💎',useLabel:'Artefakt beschwören',image:'/assets/new_specials/helements_armory.svg'},\n"
mark='];\nconst artifacts = ['
if mark not in cs:raise SystemExit('Abbruch: cards.js hat eine unbekannte Struktur.')
cs=cs.replace(mark,entry+mark,1)
# Remove older armory handler only in LIVE special use branch. Avoid double installs.
start=sv.find("    }else if(effect==='hydra'){",sv.find("socket.on('"))
if start<0:raise SystemExit('Abbruch: Live-Spezialkartenlogik nicht erkannt.')
idx=sv.find("    }else if(effect==='cockatrice'){",start)
if idx<0 or idx-start>3600:raise SystemExit('Abbruch: Position der Spezialkartenlogik nicht erkannt.')
segment=sv[start:idx]
segment=re.sub(r"    }else if\(effect==='helementsarmory'\)\{.*?(?=    }else if\(effect===|\Z)",'',segment,flags=re.S)
# Newly added effect just before cockatrice.
insert="""    }else if(effect==='helementsarmory'){
      const missing=artifacts.filter(a=>!(p.artifacts||[]).includes(a.id));
      if(!missing.length){socket.emit('specialDone',{text:'Du besitzt bereits alle Artefakte.'});}
      else{
        const a=missing[Math.floor(Math.random()*missing.length)];
        p.artifacts.push(a.id);
        io.to(r.code).emit('helementsArtifactGranted',{playerId:p.id,playerName:p.name,artifact:{id:a.id,name:a.name,image:a.image}});
        io.to(r.code).emit('artifactFound',{playerId:p.id,playerName:p.name,card:a,artifacts:p.artifacts.map(x=>byId[x]).filter(Boolean),collected:new Set(p.artifacts).size,total:artifacts.length});
        socket.emit('specialDone',{text:'Helements of Armory: '+a.name+' erhalten!'});
      }
"""
sv=sv[:start]+segment+insert+sv[idx:]
h=re.sub(r'<link[^>]+/assets/new_specials/(?:helements_integration|specials)\.css[^>]*>','',h)
h=re.sub(r'<script[^>]+/assets/new_specials/(?:helements_integration|specials)\.js[^>]*></script>','',h)
h=h.replace('</head>', '<link rel="stylesheet" href="/assets/new_specials/helements_integration.css?v=orig4"><script defer src="/assets/new_specials/helements_integration.js?v=orig4"></script></head>',1)
for path,content in ((card,cs),(server,sv),(html,h)):
 if path.read_text('utf-8')!=content:
  shutil.copy2(path,str(path)+'.armory_backup')
  path.write_text(content,'utf-8')
dest=root/'public/assets/new_specials';dest.mkdir(parents=True,exist_ok=True)
for file in (src/'public/assets/new_specials').iterdir():
 if file.is_file():shutil.copy2(file,dest/file.name)
print('Fertig! Originalvorschau und Spielverbindung installiert.')
