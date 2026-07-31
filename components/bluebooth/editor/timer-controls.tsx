'use client'

import { useBluebooth } from '@/components/bluebooth/state/bluebooth-state'
import { useRoom } from '@/components/bluebooth/state/room-state'

export function TimerControls() {
  const { state } = useBluebooth()
  const room = useRoom()
  return (
    <>
      <div className="bb-control-card">
        <strong>Countdown</strong>
        <div className="bb-option-row" role="group" aria-label="Countdown duration">
          {([3, 5, 10] as const).map((timer) => (
            <button disabled={!room.canControlBooth} key={timer} aria-pressed={state.timer === timer} className={state.timer === timer ? 'is-active' : ''} onClick={() => room.updateSharedSettings({ timer })}>{timer} seconds</button>
          ))}
        </div>
      </div>
      <div className="bb-control-card">
        <strong>Between shots</strong>
        <div className="bb-option-row" role="group" aria-label="Delay between shots">
          {[1, 2, 3, 5].map((delay) => (
            <button disabled={!room.canControlBooth} key={delay} aria-pressed={state.shotDelay === delay} className={state.shotDelay === delay ? 'is-active' : ''} onClick={() => room.updateSharedSettings({ shotDelay: delay })}>{delay}s</button>
          ))}
        </div>
        <label className="bb-switch-row"><span>Countdown sound</span><input disabled={!room.canControlBooth} type="checkbox" checked={state.timerSound} onChange={(event) => room.updateSharedSettings({ timerSound: event.target.checked })} /></label>
        <label className="bb-switch-row"><span>Flash effect</span><input disabled={!room.canControlBooth} type="checkbox" checked={state.flash} onChange={(event) => room.updateSharedSettings({ flash: event.target.checked })} /></label>
      </div>
    </>
  )
}
