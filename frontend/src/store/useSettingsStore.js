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

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Appearance
      theme: 'warm-dark', // warm-dark | midnight | pure-black
      accentColor: 'coral', // coral | violet | emerald | amber | cyan
      density: 'comfortable', // comfortable | compact
      animations: true,

      // Playback
      autoplay: true,
      gapless: true,
      crossfade: 0,
      volumeNormalization: false,
      defaultSpeed: 1,
      preferredQuality: 'high', // high | medium | data-saver

      // Lyrics
      autoShowLyrics: false,
      syncLyrics: true,
      autoScroll: true,
      lyricsFontSize: 18,
      lyricsOffsetMs: 0,

      // Equalizer
      eqEnabled: false,
      eqPreset: 'Flat',
      eqGains: [...EQ_PRESETS.Flat],

      // User Profile (Account info matching Screenshot 1)
      account: {
        username: 'SPIDERMÄN',
        handle: '@Strieee',
        telegramUserId: '5216415651',
        memberSince: '9/18/2026',
        avatarUrl: null,
      },

      // Appearance Actions
      setTheme: theme => {
        document.body.classList.remove('theme-midnight', 'theme-pure-black');
        if (theme === 'midnight') document.body.classList.add('theme-midnight');
        if (theme === 'pure-black') document.body.classList.add('theme-pure-black');
        set({ theme });
      },

      setAccentColor: accentColor => {
        document.body.classList.remove(
          'accent-violet',
          'accent-emerald',
          'accent-amber',
          'accent-cyan'
        );
        if (accentColor !== 'coral') {
          document.body.classList.add(`accent-${accentColor}`);
        }
        set({ accentColor });
      },

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
      adjustLyricsOffset: delta =>
        set(s => ({ lyricsOffsetMs: Math.max(-5000, Math.min(5000, s.lyricsOffsetMs + delta)) })),

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
