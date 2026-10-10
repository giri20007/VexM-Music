import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Bass Boost': [6, 5, 4, 2, 0, 0, 0, 0, 0, 0],
  'Treble Boost': [0, 0, 0, 0, 0, 1, 2, 4, 5, 6],
  Vocal: [-2, -1, 1, 3, 5, 4, 2, 1, 0, -1],
  Rock: [4, 3, 2, 0, -1, 0, 2, 3, 4, 4],
  Classical: [3, 2, 1, 0, 0, 0, 1, 2, 3, 3],
};

const THEME_CLASSES = [
  'theme-cyberpunk-neon',
  'theme-midnight-navy',
  'theme-pure-black',
  'theme-emerald-forest',
  'theme-sunset-rose',
  'theme-amethyst-purple',
  'theme-retro-amber',
];

const ACCENT_CLASSES = [
  'accent-coral',
  'accent-amber',
  'accent-cyan',
  'accent-violet',
  'accent-emerald',
  'accent-rose',
  'accent-lime',
  'accent-sky',
];

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Appearance & Themes
      theme: 'warm-espresso',
      accentColor: 'coral',
      livelyBackground: 'aurora', // aurora | glow | mesh | off
      density: 'comfortable',
      animations: true,

      // Playback
      autoplay: true,
      gapless: true,
      crossfade: 0,
      volumeNormalization: false,
      defaultSpeed: 1,
      preferredQuality: 'high',

      // Lyrics
      autoShowLyrics: false,
      syncLyrics: true,
      autoScroll: true,
      lyricsFontSize: 18,
      lyricsOffsetMs: 0,
      lyricsStyle: 'fluid', // fluid | karaoke | zen

      // Equalizer
      eqEnabled: false,
      eqPreset: 'Flat',
      eqGains: [...EQ_PRESETS.Flat],

      // User Profile
      account: {
        username: 'SPIDERMÄN',
        handle: '@Strieee',
        telegramUserId: '5216415651',
        memberSince: '9/18/2026',
        avatarUrl: null,
      },

      // Theme Actions
      setTheme: theme => {
        THEME_CLASSES.forEach(cls => document.body.classList.remove(cls));
        if (theme !== 'warm-espresso') {
          document.body.classList.add(`theme-${theme}`);
        }
        set({ theme });
      },

      setAccentColor: accentColor => {
        ACCENT_CLASSES.forEach(cls => document.body.classList.remove(cls));
        if (accentColor !== 'coral') {
          document.body.classList.add(`accent-${accentColor}`);
        }
        set({ accentColor });
      },

      setLivelyBackground: livelyBackground => set({ livelyBackground }),
      setDensity: density => set({ density }),
      setAnimations: animations => set({ animations }),

      // Playback Actions
      setAutoplay: autoplay => set({ autoplay }),
      setGapless: gapless => set({ gapless }),
      setCrossfade: crossfade => set({ crossfade }),
      setVolumeNormalization: volumeNormalization => set({ volumeNormalization }),
      setPreferredQuality: preferredQuality => set({ preferredQuality }),

      // Lyrics Actions
      setAutoShowLyrics: autoShowLyrics => set({ autoShowLyrics }),
      setSyncLyrics: syncLyrics => set({ syncLyrics }),
      setAutoScroll: autoScroll => set({ autoScroll }),
      setLyricsFontSize: lyricsFontSize => set({ lyricsFontSize }),
      setLyricsOffsetMs: lyricsOffsetMs => set({ lyricsOffsetMs }),
      setLyricsStyle: lyricsStyle => set({ lyricsStyle }),
      adjustLyricsOffset: delta =>
        set(s => ({ lyricsOffsetMs: Math.max(-5000, Math.min(5000, (s.lyricsOffsetMs || 0) + delta)) })),

      // Visualizer Actions
      setVisualizerMode: visualizerMode => set({ visualizerMode }),

      // Equalizer Actions
      setEqEnabled: eqEnabled => set({ eqEnabled }),
      setEqPreset: presetName => {
        if (EQ_PRESETS[presetName]) {
          set({
            eqPreset: presetName,
            eqGains: [...EQ_PRESETS[presetName]],
          });
        }
      },
      setEqBandGain: (bandIndex, gainDb) => {
        const safe = Math.max(-12, Math.min(12, gainDb));
        set(state => {
          const updated = [...state.eqGains];
          updated[bandIndex] = safe;
          return { eqGains: updated, eqPreset: 'Custom' };
        });
      },

      // Profile Actions
      updateAccount: updates =>
        set(s => ({ account: { ...s.account, ...updates } })),

      // Export/Import/Reset
      exportSettings: () => {
        const data = get();
        return JSON.stringify(data, null, 2);
      },

      importSettings: jsonString => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed && typeof parsed === 'object') {
            set(state => ({ ...state, ...parsed }));
            return { success: true };
          }
          throw new Error('Invalid settings payload');
        } catch (e) {
          return { success: false, error: e.message };
        }
      },

      resetSettings: () => {
        localStorage.removeItem('spideyxflash_settings');
        window.location.reload();
      },
    }),
    {
      name: 'spideyxflash_settings',
    }
  )
);
