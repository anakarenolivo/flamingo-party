"use client";

interface SoundEffects {
  flap: HTMLAudioElement | null;
  score: HTMLAudioElement | null;
  gameOver: HTMLAudioElement | null;
  backgroundMusic: HTMLAudioElement | null;
}

const sounds: SoundEffects = {
  flap: null,
  score: null,
  gameOver: null,
  backgroundMusic: null,
};

let isMuted = false;

const loadSound = (name: keyof SoundEffects, filePath: string, loop = false): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined") {
      const audio = new Audio(filePath);
      audio.loop = loop;
      audio.oncanplaythrough = () => {
        sounds[name] = audio;
        resolve();
      };
      audio.onerror = (e) => {
        console.error(`Error loading sound: ${name} from ${filePath}`, e);
        reject(new Error(`Failed to load sound: ${name}`));
      };
    } else {
      // Skip loading on server
      resolve();
    }
  });
};

export const initAudio = async () => {
  try {
    // Ensure this runs only on the client
    if (typeof window !== "undefined") {
      await Promise.all([
        loadSound("flap", "/sounds/flap.wav"),
        loadSound("score", "/sounds/score.wav"),
        loadSound("gameOver", "/sounds/gameOver.wav"),
        loadSound("backgroundMusic", "/sounds/music.mp3", true),
      ]);
      console.log("All sounds loaded successfully");
    }
  } catch (error) {
    console.error("Error initializing audio:", error);
  }
};

export const playSound = (name: keyof SoundEffects) => {
  if (isMuted || typeof window === "undefined") return;
  const sound = sounds[name];
  if (sound) {
    sound.currentTime = 0; // Rewind to start
    sound.play().catch(e => console.error(`Error playing sound ${name}:`, e));
  } else {
    console.warn(`Sound not loaded or found: ${name}`);
  }
};

export const stopSound = (name: keyof SoundEffects) => {
  if (typeof window === "undefined") return;
  const sound = sounds[name];
  if (sound) {
    sound.pause();
    sound.currentTime = 0;
  }
};

export const toggleMute = () => {
  isMuted = !isMuted;
  if (isMuted) {
    if (sounds.backgroundMusic && !sounds.backgroundMusic.paused) {
      sounds.backgroundMusic.pause();
    }
  } else {
    if (sounds.backgroundMusic) {
      sounds.backgroundMusic.play().catch(e => console.error("Error playing background music after unmute:", e));
    }
  }
  return isMuted;
};

export const getIsMuted = () => {
  return isMuted;
};

// Call initAudio once when the module is loaded on the client side
if (typeof window !== "undefined") {
  initAudio();
} 