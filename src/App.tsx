import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  CircularProgressProps,
  Tooltip
} from "@material-ui/core"
import { browser } from "webextension-polyfill-ts"
import { updateEntry, getEntry } from "./storage-local"

type AppState = { tab_id?: number, state: "loading" | "pause" | ""}

class App extends React.Component<any, any> {  
  constructor(props:any) {
    super(props)
    
    /**
     * 2020-10-15 19:58
     * Will be overridden in `componentDidMount`. Refer to the
     * `background.ts > initializeStorage` for the overriding value.
     */
    this.state = {
      tab_id: undefined,
      state: "paused",
      interval: 5,
      value: 100,
      timer_animation_id: undefined,
      invalid_img_area: false
    }
  }
  
  async componentDidMount() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const tab_id = tab.id!
    const entry = await getEntry(tab_id)
    entry.tab_id = tab_id

    /**
     * 2020-10-15 20:00
     * `timer_ids` refer to the interval tasks that trigger auto click in
     * content script.
     */
    delete entry.timer_ids
    /**
     * 2020-10-15 20:03
     * Property only relevant for the App component
     */
    entry.timer_animation_id = undefined
    
    await this.setupBackgrounPageEventListener()
    
    await new Promise((res, rej) => this.setState(entry, () => res()))
    
    if(this.state.state == "start") {
      const start_dt = await getEntry(tab_id, "start_dt")
      this.startTimerAnimation(tab_id, start_dt)
    }
  }
  
  async setupBackgrounPageEventListener() {
    const bgWindow = await browser.runtime.getBackgroundPage()
    if(bgWindow) {
      bgWindow.addEventListener("invalidImg", () => {
        /**
         * 2020-10-12 11:07
         * A bug was introduced in `bb84ab8`. It was a infinite loop of this event being fired.
         * The main reason is the the `pauseTimer` is called even when the state is already paused.
         * 
         * Consider checking for the `this.state.state` in each `pauseTimer` and `startTimer` later.
         */
        if(this.state.state == "start") {
          this.pauseTimerAnimation(true)
        }
      })
    }
  }
  
  render() {
    return (
      <div>
        <div>Tab id: {this.state.tab_id}</div>
        <div style={ { display: "flex", alignItems: "flex-start" } }>
          <div>
            <Box position="relative" display="inline-flex">
              {/* Refer to material-ui for centering somethingin a circular probress: https://material-ui.com/components/progress/ */}
              <CircularProgress
                variant="static"
                value={this.state.value}
                size={200}
              />
              <Box
                top={0}
                left={0}
                bottom={0}
                right={0}
                position="absolute"
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
              >
                <div>
                  <input
                    size={5}
                    value={this.state.interval}
                    onChange={(ev) => this.onIntervalUpdate(ev.target.value)}
                    disabled={this.state.state == "start"}
                  />
                  <button onClick={() => this.toggleAction()}>{this.getActionText()}</button>
                </div>
                <div>
                  <button onClick={() => this.onShakeClick()}>Shake</button>
                </div>
              </Box>
            </Box>
            {
              this.state.invalid_img_area ?
                <div>Paused due to invalid image size</div> : <div></div>
            }
          </div>
        </div>
      </div>
    )
  }
  
  async onShakeClick() {
    const tab_id = this.state.tab_id
    await browser.tabs.sendMessage(tab_id, { action: "shakeTargetImgEl", tab_id })
  }
  
  async onIntervalUpdate(interval:string) {
    const tab_id = this.state.tab_id
    await updateEntry(tab_id, { interval })
    this.setState({ interval })
  }
  
  getActionText() {
    const state = this.state.state
    if(state == "paused") {
      return "Start"
    }
    else {
      return "Pause"
    }
  }
  
  toggleAction() {
    const state = this.state.state
    
    if(state == "paused") {
      this.startTimer()
    }
    else if(state == "start") {
      this.pauseTimer()
    }
  }
  
  async startTimer() {
    const tab_id = this.state.tab_id
    
    const { start_dt } = await browser.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval, tab_id })
    this.startTimerAnimation(tab_id, start_dt);
  }
  
  startTimerAnimation(tab_id:number, start_dt:number) {
    const timer_animation_id = setInterval(async () => {
      const passed_milisec = (Number(new Date()) - Number(start_dt))
      const passed_sec = passed_milisec / 1000
      const orig_value = this.state.interval      
      const percentage = ((passed_sec / orig_value) * 100)
      
      await updateEntry(tab_id, { value: percentage })
      
      this.setState({ value: percentage })
    }, 100)
    
    this.setState({ state: "start", invalid_img_area: false, timer_animation_id })
  }
  
  async pauseTimer() {
    const tab_id = this.state.tab_id
    
    await browser.tabs.sendMessage(tab_id, { action: "pause", tab_id })
    this.pauseTimerAnimation();
  }
  
  pauseTimerAnimation(invalid_img_area:boolean = false) {
    clearInterval(this.state.timer_animation_id)
    this.setState({ state: "paused", timer_animation_id: undefined, value: 100, invalid_img_area })
  }
}

export default App