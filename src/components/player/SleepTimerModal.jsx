import React from 'react';
import { Moon, X, Clock, Check } from 'lucide-react';
import { useAudioStore } from '../../store/useAudioStore';
import { formatDuration } from '../../utils/formatters';

const PRESETS = [
  { label: '5 Minutes', seconds: 5 * 60 },
  { label: '10 Minutes', seconds: 10 * 60 },
  { label: '15 Minutes', seconds: 15 * 60 },
  { label: '30 Minutes', seconds: 30 * 60 },
  { label: '45 Minutes', seconds: 45 * 60 },
  { label: '60 Minutes', seconds: 60 * 60 },
  { label: 'End of Track', seconds: 'end_of_track' },
];

export function SleepTimerModal({ isOpen, onClose }) {
  const sleepTimer = useAudioStore(s => s.sleepTimer);
  const setSleepTimer = useAudioStore(s => s.setSleepTimer);
  const cancelSleepTimer = useAudioStore(s => s.cancelSleepTimer);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-sm rounded-3xl bg-[#1c120e] border border-white/10 shadow-2xl p-6 text-warm-white space-y-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Sleep Timer</h3>
              <p className="text-xs text-warm-muted">Stop audio automatically</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-warm-muted hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Timer Countdown Banner */}
        {sleepTimer && sleepTimer.remaining > 0 && (
          <div className="p-3.5 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-between text-xs text-accent font-semibold">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 animate-spin-slow" />
              <span>
                {sleepTimer.mode === 'end_of_track'
                  ? 'Stopping at end of current track'
                  : `${formatDuration(sleepTimer.remaining)} remaining`}
              </span>
            </div>
            <button
              onClick={() => cancelSleepTimer()}
              className="px-2.5 py-1 rounded-lg bg-accent text-bg-primary text-[11px] font-bold hover:scale-105 transition"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Preset Options */}
        <div className="space-y-1.5">
          {PRESETS.map(preset => {
            const isSelected = Boolean(
              sleepTimer && (
                preset.seconds === 'end_of_track'
                  ? sleepTimer.mode === 'end_of_track'
                  : sleepTimer.duration === preset.seconds
              )
            );

            return (
              <button
                key={preset.label}
                onClick={() => {
                  setSleepTimer(preset.seconds);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-xs font-semibold transition ${
                  isSelected
                    ? 'bg-accent/15 border-accent text-accent'
                    : 'bg-white/5 border-white/5 text-warm-white hover:bg-white/10'
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && <Check className="w-4 h-4 text-accent" />}
              </button>
            );
          })}

          {sleepTimer && (
            <button
              onClick={() => {
                cancelSleepTimer();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl text-center text-xs font-semibold text-red-400 hover:bg-red-500/10 transition mt-2"
            >
              Turn Off Timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
