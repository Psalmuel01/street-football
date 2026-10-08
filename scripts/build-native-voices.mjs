import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const pack = JSON.parse(await readFile(new URL('../src/content/commentary-pack.json', import.meta.url), 'utf8'));
const key = process.env.SPITCH_API_KEY, voice = process.env.SPITCH_VOICE || 'justice';
const args = process.argv.slice(2), dry = args.includes('--dry-run'), event = args.find(a => a.startsWith('--event='))?.slice(8);
const root = new URL('../public/assets/audio/voices/native/', import.meta.url); await mkdir(root, { recursive: true });
let manifest = { provider: 'Spitch', voice, language: 'pcm', clips: {} };
try { const saved = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8')); if (saved.voice === voice) manifest = saved; } catch { }
const jobs = Object.entries(pack).filter(([name]) => !event || name === event).flatMap(([name, lines]) => lines.map((text, i) => ({ id: `${name}-${i + 1}`, text })));
if (!jobs.length) throw new Error('Unknown commentary event');
if (dry) { console.log(JSON.stringify({ provider: 'Spitch', voice, language: 'pcm', clips: jobs.length, characters: jobs.reduce((n, j) => n + j.text.length, 0) }, null, 2)); process.exit(0); }
if (!key) throw new Error('Set SPITCH_API_KEY in your terminal environment. Never use a VITE_ variable or put the key in browser code.');
for (const job of jobs) {
    const hash = createHash('sha256').update(`${voice}:pcm:${job.text}`).digest('hex');
    if (manifest.clips[job.id]?.hash === hash) continue;
    const response = await fetch('https://api.spitch.app/v1/speech', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ text: job.text, voice, language: 'en', format: 'mp3', speed: 1 }), signal: AbortSignal.timeout(60000) });
    if (!response.ok) { const detail = await response.text(); throw new Error(`Spitch request failed (${response.status}) for ${job.id}: ${detail}; previous clips are preserved.`); }
    if (!(response.headers.get('content-type') || '').startsWith('audio/')) throw new Error('Provider returned a non-audio response');
    const audio = Buffer.from(await response.arrayBuffer()); if (audio.length < 500) throw new Error('Provider audio is empty or incomplete');
    const filename = `${job.id}-${hash.slice(0, 10)}.mp3`; await writeFile(new URL(filename, root), audio);
    manifest.clips[job.id] = { url: `/assets/audio/voices/native/${filename}`, hash, text: job.text };
    await writeFile(new URL('manifest.tmp.json', root), JSON.stringify(manifest, null, 2)); await rename(new URL('manifest.tmp.json', root), new URL('manifest.json', root));
    console.log(`Saved ${job.id}`);
}
console.log('Native pack exported. Audition the clips before approving their delivery.');
