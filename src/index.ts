import { Recorder, Observers, ObserverName, ElementX } from './models/index'
import { Observer } from './models/observers'
import { _log, _warn, _now, _throttle } from './tools/helpers'
import { RECORDER_PRESET } from './constants'

import ConsoleObserver from './observers/console'
import EventObserver from './observers/event'
import HttpObserver from './observers/http'
import DOMMutationObserver from './observers/mutation'
import ErrorObserver from './observers/error'
import HistoryObserver from './observers/history'
import MouseObserver from './observers/mouse'

import SonyA7R3 from './tools/SonyA7R3'
import XT30 from './tools/X-T30'

export default class SessionRecorder implements Recorder {
  public observers: Observers = {
    mutation: null,
    console: null,
    event: null,
    mouse: null,
    error: null,
    history: null,
    http: null
  }
  public options = RECORDER_PRESET
  public trail: any[] = []
  public recording: boolean = false
  private baseTime: number = 0

  private lastSnapshot: { time: number; index: number } = {
    time: 0,
    index: 0
  }

  constructor(options?) {
    if (options && typeof options === 'object') {
      this.options = { ...this.options, ...options }
    }

    const { mutation, history, http, event, error, console: consoleOptions, mouse } = this.options

    this.observers = {
      mutation: new DOMMutationObserver(mutation),
      http: new HttpObserver(http),
      console: new ConsoleObserver(consoleOptions),
      event: new EventObserver(event),
      mouse: new MouseObserver(mouse),
      error: new ErrorObserver(error),
      history: new HistoryObserver(history)
    }

    Object.keys(this.observers).forEach((observerName: ObserverName) => {
      const observer = this.observers[observerName]

      observer.$on('observed', this.pushToTrail.bind(this))
    })
  }

  public observeScroll = (ele: ElementX) => {
    if (ele) {
      ele.addEventListener('scroll', _throttle((this.observers.event as any).getScrollRecord))
    } else {
      _warn("Element doesn't existsed!")
    }
  }

  private pushToTrail = (record): void => {
    if (!this.recording) return

    const thisRecordTime = _now() - this.baseTime

    record = { t: thisRecordTime, ...record }
    const { time: lastSnapshotTime, index: lastSnapshotIndex } = this.lastSnapshot

    if (thisRecordTime - lastSnapshotTime >= this.options.maxTimeSpan / 2) {
      if (lastSnapshotIndex !== 0) {
        this.trail = this.trail.slice(lastSnapshotIndex)
      }

      const snapshotRecord = this.getSnapshotRecord()
      this.trail.push(snapshotRecord)
    }

    this.trail.push(record)
  }

  private getSnapshotRecord() {
    this.lastSnapshot.time = _now() - (this.baseTime || _now())
    this.lastSnapshot.index = this.trail.length

    const { clientWidth: w, clientHeight: h } = document.documentElement
    const { x, y } = (this.observers.event as any).getScrollPosition()
    console.log(XT30.captureEvent())
    return {
      t: this.lastSnapshot.time,
      type: 'snapshot',
      scroll: { x, y },
      resize: {
        w,
        h
      },
      snapshot: XT30.captureEvent().data.snapshot
    }
  }

  public start = (): void => {
    if (this.recording) {
      _warn('record already started')
      return
    }

    this.recording = true

    this.baseTime = _now()
    XT30.startRecording()
    // note the getSnapshotRecord method depend on baseTime
    this.trail[0] = this.getSnapshotRecord()
    Object.keys(this.observers).forEach(observerName => {
      if (this.options[observerName]) {
        ;(this.observers[observerName] as Observer).install()
      }
    })
    ;(window as any).SessionRecorder = this
  }

  public stop = (): void => {
    if (!this.recording) {
      _warn('record not started')
      return
    }

    this.recording = false

    // clear trail
    this.trail.length = 0
  }

  public uninstallObservers = (): void => {
    // walk and uninstall observers
    Object.keys(this.observers).forEach(observerName => {
      ;(this.observers[observerName] as Observer).uninstall()
    })
  }
}
