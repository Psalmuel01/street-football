"""Original callout text rendered with generic Nigerian English synthetic voices.
Build dependency: edge-tts. Runtime uses the bundled MP3s, with no speech service calls.
"""
import asyncio, pathlib, edge_tts
lines = {
 'kickoff-1': ('Oya! Play ball! No dulling!', 'en-NG-AbeoNeural'),
 'kickoff-2': ('Oya, make we go! Show your skill!', 'en-NG-EzinneNeural'),
 'goal-1': ('Na goal! Omo! What a finish!', 'en-NG-AbeoNeural'),
 'goal-2': ('E choke! Na correct goal be that!', 'en-NG-EzinneNeural'),
 'save-1': ('Ah! Keeper! You too much!', 'en-NG-AbeoNeural'),
 'save-2': ('See save! Safe hands!', 'en-NG-EzinneNeural'),
 'pass-1': ('Correct pass! Carry go!', 'en-NG-AbeoNeural'),
 'pass-2': ('Oya, pass am! I dey here!', 'en-NG-EzinneNeural'),
 'tackle-1': ('Collect am! No shaking!', 'en-NG-AbeoNeural'),
 'skill-1': ('Comot body! See footwork!', 'en-NG-EzinneNeural'),
 'shot-1': ('Fire am! Oya!', 'en-NG-AbeoNeural'),
 'substitution-1': ('Fresh legs don enter! Oya, show them!', 'en-NG-EzinneNeural'),
 'fulltime-1': ('Game don finish! Respect the game. Well played!', 'en-NG-AbeoNeural'),
 'atmosphere-1': ('No dulling! Everybody get game!', 'en-NG-EzinneNeural'),
 'atmosphere-2': ('Oya! Your area dey watch you!', 'en-NG-AbeoNeural'),
}
async def main():
 root=pathlib.Path('public/assets/audio/voices');root.mkdir(parents=True,exist_ok=True)
 for name,(text,voice) in lines.items():
  path=root/f'{name}.mp3'
  if path.exists() and path.stat().st_size>1000: continue
  await edge_tts.Communicate(text,voice,rate='+12%',volume='+10%').save(str(path))
  print(name,path.stat().st_size,flush=True)
asyncio.run(main())
