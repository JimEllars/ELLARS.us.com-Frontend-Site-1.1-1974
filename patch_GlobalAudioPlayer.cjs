const fs = require('fs');
let content = fs.readFileSync('src/components/common/GlobalAudioPlayer.jsx', 'utf8');

content = content.replace(
`  useEffect(() => {
    if (audioActiveTrack && audioRef.current) {
      if (audioRef.current.src !== audioActiveTrack.url) {
         audioRef.current.src = audioActiveTrack.url;
         if (audioIsPlaying) {
             audioRef.current.play().catch(e => {
             console.error("Playback failed", e);
             setAudioIsPlaying(false);
             showToast("// STREAM_UNAVAILABLE: Check network connection");
         });
         }
      }
    }
  }, [audioActiveTrack, audioIsPlaying]);`,
`  useEffect(() => {
    let isActive = true;
    if (audioActiveTrack && audioRef.current) {
      if (audioRef.current.src !== audioActiveTrack.url) {
         audioRef.current.src = audioActiveTrack.url;
         if (audioIsPlaying) {
             audioRef.current.play().catch(e => {
               if (isActive) {
                 console.error("Playback failed", e);
                 setAudioIsPlaying(false);
                 showToast("// STREAM_UNAVAILABLE: Check network connection");
               }
             });
         }
      }
    }

    return () => {
      isActive = false;
      if (audioRef.current) {
         audioRef.current.pause();
         audioRef.current.src = '';
      }
      if ('mediaSession' in navigator) {
         navigator.mediaSession.metadata = null;
      }
    };
  }, [audioActiveTrack, audioIsPlaying]);`
);

fs.writeFileSync('src/components/common/GlobalAudioPlayer.jsx', content);
