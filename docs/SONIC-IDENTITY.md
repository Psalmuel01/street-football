# Lagos Street Radio — 6 October 2026

## Implemented

Ten original, source-authored instrumental arrangements live in `public/assets/audio/music`. The catalogue owns track selection: two menu tracks (about 103–109 seconds), two quieter pitch loops (52–55 seconds), two intro stings, win/draw/loss arrangements and a champion arrangement. The champion arrangement supplies a short goal accent; King of the Pitch mode and its special events are not implemented.

The composition source combines syncopated kick/rim/shaker patterns, plucked guitar synthesis, bass, bending percussion and melodic variations. Tracks have different harmony, tempo and arrangement, including breakdowns. No commercial recordings or borrowed melodies were used. This is an original synthesized prototype pack, not a commissioned Nigerian producer recording.

A persistent two-deck Web Audio manager crossfades arrangements. Home, community, squad and setup preserve the playing menu track; the two menu tracks rotate on completion. Match play moves to an ambient loop selected by community. Results select win, draw or loss. A visible speaker beside the court at (-12, -19) corresponds to distance attenuation, stereo pan and low-pass filtering. Gameplay music is deliberately faint.

Eight independent, saved buses are available in Controls: Master, Music, Commentary, Player voices, Crowd, Environment, Sound effects and Menu sounds. Music can be switched off separately. Voices duck music; goal/full-time calls have priority over routine calls. Ball/footstep sounds, whistles, synthetic crowd texture, occasional horns and generator hum use their own channels. Existing bundled Nigerian-English prototype voice clips remain in use. Testing a callout no longer changes match state.

Browser audio begins after an interaction, subject to browser autoplay rules. Hidden tabs suspend the mixer. No licensing infrastructure or network music service was added.

## Validation

- Production build passes; the existing Three.js bundle-size warning remains.
- Browser checks passed for uninterrupted menu playback, near/far speaker attenuation (sampled gain 0.100 versus 0.043), independent channels, goal voice priority, results track selection and music mute.
- Existing conditions/audio checks pass: rain selection, voice controls, decoded voice assets and no browser runtime errors.
- `scripts/audio-audition.mjs` records a 38-second sequence across home, selection, intro, play near/far, goal, replay and full time. The captured pre-limiter peak was 0.508; this sample did not clip. It is a scripted mixer sequence, not a recording of an organically played full match.
- Audition WAV and phase timestamps are in `artifacts/audio/`.

## Still unresolved

Cultural authenticity and musical enjoyment cannot be established by automated checks. The assistant has not listened to this recording. The user-facing audition is the next listening reference; the pack is not certified as meeting the brief's sound-only Nigerian recognition test.

Crowd noise, horns and generator are synthesized approximations. There are no recorded vendor performances, moving-vehicle engine recordings or full team chants. Voice variety remains limited and synthetic. A production release needs stronger original performances and detailed environmental recordings.

The concurrent visual work is assessed separately in `VISUAL-FIDELITY-PASS.md`; its hero-image realism target remains unmet.
