'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'

export function TimerControls() {
  const { state, dispatch } = useBluebooth()
  const room = useRoom()
  return (
    <>
      <div className="bb-control-card">
        <strong>Countdown</strong>
        <div className="bb-option-row">
          {([3, 5, 10] as const).map((timer) => (
            <button key={timer} className={state.timer === timer ? 'is-active' : ''} onClick={() => room.updateSharedSettings({ timer })}>{timer} seconds</button>
          ))}
        </div>
      </div>
      <div className="bb-control-card">
        <strong>Between shots</strong>
        <div className="bb-option-row">
          {[1, 2, 3, 5].map((delay) => (
            <button key={delay} className={state.shotDelay === delay ? 'is-active' : ''} onClick={() => dispatch({ type: 'set-shot-delay', delay })}>{delay}s</button>
          ))}
        </div>
        <label className="bb-switch-row"><span>Countdown sound</span><input type="checkbox" checked={state.timerSound} onChange={(event) => dispatch({ type: 'set-timer-sound', enabled: event.target.checked })} /></label>
        <label className="bb-switch-row"><span>Flash effect</span><input type="checkbox" checked={state.flash} onChange={(event) => dispatch({ type: 'set-flash', enabled: event.target.checked })} /></label>
      </div>
    </>
  )
}
