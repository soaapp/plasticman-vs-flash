// In-browser narration via the Web Speech API (speechSynthesis) — no backend,
// no API cost. Each agent gets a distinct voice profile (differentiated by
// rate/pitch, which is reliable across browsers, plus a named-voice match when
// one is available). Utterances queue, so calling speak() three times in a row
// plays them back-to-back.

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

let voices = [];
function loadVoices() {
  if (synth) voices = synth.getVoices() || [];
}
if (synth) {
  loadVoices();
  if (typeof synth.addEventListener === "function") synth.addEventListener("voiceschanged", loadVoices);
}

const PROFILES = {
  flash: { rate: 1.18, pitch: 1.0, match: ["Daniel", "Google UK English Male", "Alex", "Microsoft David", "Male"] },
  plastic: { rate: 1.04, pitch: 1.45, match: ["Google UK English Female", "Samantha", "Karen", "Tessa", "Female"] },
  referee: { rate: 0.96, pitch: 0.8, match: ["Google US English", "Fred", "Rishi", "Aaron", "Male"] },
};

function pickVoice(profile) {
  for (const m of profile.match) {
    const v = voices.find((v) => v.name && v.name.includes(m));
    if (v) return v;
  }
  return voices[0] || null;
}

export const narrator = {
  supported: !!synth,

  speak(text, role = "referee") {
    if (!synth || !text) return;
    if (!voices.length) loadVoices();
    const p = PROFILES[role] || PROFILES.referee;
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = p.rate;
    u.pitch = p.pitch;
    u.volume = 1;
    const v = pickVoice(p);
    if (v) u.voice = v;
    synth.speak(u);
  },

  cancel() {
    if (synth) synth.cancel();
  },
};
