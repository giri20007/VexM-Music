import React from 'react';
import { useAudioStore } from '../../store/useAudioStore';
import { useSettingsStore, EQ_FREQUENCIES, EQ_PRESETS } from '../../store/useSettingsStore';
import { X, Sliders } from 'lucide-react';

export function EqualizerModal() {
  const isEqualizerOpen = useAudioStore(s => s.isEqualizerOpen);
  const setEqualizerOpen = useAudioStore(s => s.setEqualizerOpen);

  const eqEnabled = useSettingsStore(s => s.eqEnabled);
  const setEqEnabled = useSettingsStore(s => s.setEqEnabled);
  const eqPreset = useSettingsStore(s => s.eqPreset);
  const setEqPreset = useSettingsStore(s => s.setEqPreset);
  const eqGains = useSettingsStore(s => s.eqGains);
  const setEqBandGain = useSettingsStore(s => s.setEqBandGain);

  if (!isEqualizerOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={() => setEqualizerOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-bg-secondary border border-white/10 shadow-2xl p-6 select-none animate-scale-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-warm-white">Audio Equalizer</h2>
              <p className="text-[11px] text-warm-muted">10-band Web Audio frequency control</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Enable switch */}
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-warm-muted">
              <span>{eqEnabled ? 'Active' : 'Off'}</span>
              <input
                type="checkbox"
                checked={eqEnabled}
                onChange={e => setEqEnabled(e.target.checked)}
                className="w-4 h-4 rounded accent-accent cursor-pointer"
              />
            </label>

            <button
              onClick={() => setEqualizerOpen(false)}
              className="p-1.5 rounded-lg text-warm-muted hover:text-white hover:bg-white/5 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Presets Pills */}
        <div className="flex items-center gap-2 py-4 overflow-x-auto no-scrollbar">
          {Object.keys(EQ_PRESETS).map(name => (
            <button
              key={name}
              onClick={() => setEqPreset(name)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                eqPreset === name
                  ? 'bg-accent text-bg-primary font-bold shadow-md shadow-accent/20'
                  : 'bg-bg-card text-warm-muted hover:text-white border border-white/5'
              }`}
            >
              {name}
            </button>
          ))}
          {eqPreset === 'Custom' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-accent/20 text-accent border border-accent/40">
              Custom
            </span>
          )}
        </div>

        {/* Equalizer Frequency Sliders */}
        <div className="grid grid-cols-10 gap-2 h-44 pt-4 pb-2 items-end">
          {EQ_FREQUENCIES.map((freq, idx) => {
            const gain = eqGains[idx] || 0;
            const label = freq >= 1000 ? `${freq / 1000}k` : `${freq}`;
            return (
              <div key={freq} className="flex flex-col items-center h-full justify-between">
                <span className="text-[10px] font-mono tabular-nums text-accent">
                  {gain > 0 ? `+${gain}` : gain}
                </span>

                <div className="relative flex-1 flex items-center justify-center my-2">
                  <input
                    type="range"
                    min="-12"
                    max="12"
                    step="1"
                    disabled={!eqEnabled}
                    value={gain}
                    onChange={e => setEqBandGain(idx, Number(e.target.value))}
                    className="w-28 h-1 bg-white/10 appearance-none cursor-pointer -rotate-90 disabled:opacity-40"
                  />
                </div>

                <span className="text-[10px] text-warm-muted font-medium mt-1">
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
