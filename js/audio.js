// Minimal WebAudio chime for reward
export function playChime(){
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o1.type = 'sine'; o2.type='triangle';
    o1.frequency.value = 880; o2.frequency.value = 660;
    g.gain.value = 0;
    o1.connect(g); o2.connect(g); g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.25, now + 0.01);
    g.gain.linearRampToValueAtTime(0.0001, now + 1);
    o1.start(now); o2.start(now);
    o1.stop(now + 1.05); o2.stop(now + 1.05);
  }catch(err){console.warn('Audio not available', err)}
}