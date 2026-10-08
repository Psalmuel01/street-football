# Native Nigerian commentary

The native pack uses Spitch's Nigerian Pidgin (`pcm`) voice `justice`. Other documented Pidgin voices can be selected with `SPITCH_VOICE`. No voice is cloned. API credentials stay in the terminal and are never bundled into the game.

Official API: https://docs.spitch.app/features/speech
Voice roster: https://docs.spitch.app/concepts/voices

1. Set `SPITCH_API_KEY` in your terminal environment using your Spitch account key. Set `SPITCH_VOICE` if choosing another stock voice.
2. `npm run voices:plan` lists the export size without a network request.
3. `npm run voices:build -- --event=goal` exports a small audition first (provider usage may be billed to your account).
4. Audition the files in `public/assets/audio/voices/native`. Review pronunciation, emotion and pace with a native Nigerian listener.
5. `npm run voices:build` exports all lines. Refresh the game. It reads the manifest and uses local MP3s; no runtime API requests or speech-service dependency.

Exports resume by content hash, preserve earlier successful clips if a request fails, and update the manifest atomically. Missing native recordings show contextual captions and crowd effects; the rejected generic TTS voice is not silently substituted. The audio settings display whether the pack is complete or awaiting export. The previous recordings remain on disk for recovery only.

Authenticity is not guaranteed by a locale or provider label. Final acceptance requires listening to this game’s generated lines, especially emotional calls and Pidgin pronunciation. No generated native clips have been claimed as reviewed before credentials and recordings are available.
