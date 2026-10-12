from pathlib import Path
import sys, re, shutil
base=Path(__file__).resolve().parent
root=Path(sys.argv[1]).resolve() if len(sys.argv)>1 else base
if not (root/'cards.js').exists():
    print('FEHLER: Entpacke die ZIP direkt im mlp-battle-cards-Hauptordner neben cards.js und server.js.')
    input('Enter zum Schliessen...')
    sys.exit(1)
files=[root/'cards.js',root/'server.js',root/'public/index.html']
if not all(p.is_file() for p in files):raise SystemExit('FEHLER: Spiel-Hauptordner unvollstaendig.')
card,server,html=files
s=card.read_text('utf-8');sv=server.read_text('utf-8')
# Only place entries INSIDE the specials array; no impact on other cards.
special_start=s.find('const specials = [')
end=s.find('];',special_start)
assert special_start>=0 and end>special_start, 'Kartenformat nicht erkannt'
specials=s[special_start:end]
specials=re.sub(r"(?m)^\s*\{id:'s99',[^\n]*\n",'',specials)
specials=re.sub(r"(?m)^\s*\{id:'s100',[^\n]*\n",'',specials)
new="""  {id:'s99',type:'special',name:'Sweetie Bot',effect:'sweetiebot',text:'Ziehe 1 normale Karte nach.',useIcon:'🤖',useLabel:'Roboter-Chaos',image:'/assets/new_specials/sweetie_bot.svg'},
  {id:'s100',type:'special',name:'Helements of Armory',effect:'helementsarmory',text:'Erhalte 1 zufälliges Artefakt, das du noch nicht besitzt.',useIcon:'💎',useLabel:'Artefakt beschwören',image:'/assets/new_specials/helements_armory.svg'},
"""
s=s[:special_start]+specials+new+s[end:]
# Add handlers in live special execution only, not in bot simulation.
start=sv.find("    }else if(effect==='hydra'){",sv.find("socket.on('"))
if start<0:raise SystemExit('Server-Spielmechanik nicht erkannt.')
finish=sv.find("    }else if(effect==='cockatrice'){",start)
if finish<0 or finish-start>3200:raise SystemExit('Einbauposition im Server nicht gefunden.')
section=sv[start:finish]
section=re.sub(r"    }else if\(effect==='sweetiebot'\)\{.*?(?=    }else if\(effect===|\Z)",'',section,flags=re.S)
section=re.sub(r"    }else if\(effect==='helementsarmory'\)\{.*?(?=    }else if\(effect===|\Z)",'',section,flags=re.S)
section=re.sub(r"    }else if\(effect==='sweetiebot'\|\|effect==='helementsarmory'\)\{.*?(?=    }else if\(effect===|\Z)",'',section,flags=re.S)
block="""    }else if(effect==='sweetiebot'){
      const drawn=drawNormalForHand(r,p,1);p.hand.push(...drawn);
      socket.emit('specialDone',{text:'Sweetie Bot: '+drawn.length+' normale Karte gezogen.'});
    }else if(effect==='helementsarmory'){
      const missing=artifacts.filter(a=>!(p.artifacts||[]).includes(a.id));
      if(!missing.length)socket.emit('specialDone',{text:'Du hast bereits alle drei Artefakte.'});
      else{
        const a=missing[Math.floor(Math.random()*missing.length)];
        p.artifacts.push(a.id);
        io.to(r.code).emit('helementsArtifactGranted',{playerId:p.id,playerName:p.name,artifact:{id:a.id,name:a.name,image:a.image}});
        io.to(r.code).emit('artifactFound',{playerId:p.id,playerName:p.name,card:a,artifacts:p.artifacts.map(id=>byId[id]).filter(Boolean),collected:new Set(p.artifacts).size,total:artifacts.length});
        socket.emit('specialDone',{text:'Helements of Armory: '+a.name+' erhalten!'});
      }
"""
sv=sv[:start]+section+block+sv[finish:]
# No change to existing animations. Existing gallery reads current server specials.
for f,content in [(card,s),(server,sv)]:
  if f.read_text('utf-8')!=content:
    shutil.copy2(f,str(f)+'.backup_before_two_cards')
    f.write_text(content,'utf-8')
assets=root/'public/assets/new_specials';assets.mkdir(parents=True,exist_ok=True)
for name in ['sweetie_bot.svg','helements_armory.svg']:
  shutil.copy2(base/'public/assets/new_specials'/name, assets/name)
print('ERFOLG: Sweetie Bot (s99) und Helements of Armory (s100) eingetragen.')
print('Starte das Spiel neu / lade geaenderte Dateien bei GitHub hoch, damit Render sie uebernimmt.')
input('Enter zum Schliessen...')
