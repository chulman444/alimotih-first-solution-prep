import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  CircularProgressProps,
  Tooltip
} from "@material-ui/core"

type AppState = { tab_id?: number, state: "loading" | "pause" | ""}

class App extends React.Component<any, any> {
  constructor(props:any) {
    super(props)
    
    this.state = {
      tab_id: undefined,
      state: "paused",
      interval: 2000,
      value: 100,
      timer_id: undefined,
      src: undefined
    }
  }
  
  componentDidMount() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab_id = tabs[0].id!
      chrome.storage.local.get([String(tab_id)], (results) => {
        results[tab_id].tab_id = tab_id
        this.setState(results[tab_id], () => {
          /**
           * 2020-10-12 15:06
           * 
           * This is called eventually in `startTimerAnimation` but needs to show the
           * image when the pop up opens anyways, regardless of `this.state.state`.
           */
          this.updateImg()
          
          if(this.state.state == "start") {
            chrome.runtime.sendMessage({ action: "getStartDt", tab_id }, ({ start_dt }) => {
              this.startTimerAnimation(tab_id, start_dt)
            })
          }
        })
      })
    })
    
    chrome.runtime.getBackgroundPage((bgWindow) => {
      if(bgWindow) {
        bgWindow.addEventListener("pause", () => {
          /**
           * 2020-10-12 11:07
           * A bug was introduced in `bb84ab8`. It was a infinite loop of this event being fired.
           * The main reason is the the `pauseTimer` is called even when the state is already paused.
           * 
           * Consider checking for the `this.state.state` in each `pauseTimer` and `startTimer` later.
           */
          if(this.state.state == "start") {
            this.pauseTimer()
          }
        })
      }
    })
  }
  
  updateImg() {
    const tab_id = this.state.tab_id
    chrome.tabs.sendMessage(this.state.tab_id, { action: "getImgSrc", tab_id }, (src) => {
      this.setState({ src })
    })
  }
  
  render() {
    return (
      <div>
        <div>Tab id: {this.state.tab_id}</div>
        <div style={ { width: '500px', height: '300px', display: "flex", alignItems: "flex-start" } }>
          <Box position="relative" display="inline-flex">
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
              alignItems="center"
              justifyContent="center"
            >
              <input
                size={5}
                value={this.state.interval}
                onChange={(ev) => this.onIntervalUpdate(ev.target.value)}
              />
              <button onClick={() => this.toggleAction()}>{this.getActionText()}</button>
            </Box>
          </Box>
          <div>
            <Tooltip title="This image on the page will be clicked">
              <img
                src={this.state.src}
                alt="If you are seeing this try reopening the popup"
                style={{ maxHeight: "300px", maxWidth: "200px" }}
              />
            </Tooltip>
          </div>
        </div>
      </div>
    )
  }
  
  onIntervalUpdate(interval:string) {
    const tab_id = this.state.tab_id
    
    this.setState({ interval })
    
    chrome.storage.local.get([String(tab_id)], (results) => {
      const result = results[tab_id]
      
      result.interval = interval
      chrome.storage.local.set({ [tab_id]: result }, () => {
        console.log("Saved")
      })
    })
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
  
  startTimer() {
    const tab_id = this.state.tab_id
    
    chrome.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval, tab_id }, ({ timer_id, start_dt }) => {
      chrome.runtime.sendMessage({ action: "start", tab_id, timer_id, start_dt }, () => {
        this.startTimerAnimation(tab_id, start_dt)
      })
    });
  }
  
  startTimerAnimation(tab_id:number, start_dt:number) {
    const timer_id = setInterval(() => {
      this.updateImg()
      
      this.updateProgress(start_dt)
    }, 100)
    
    this.setState({ state: "start", timer_id })
  }
  
  updateProgress(start_dt:number) {
    const passed = (Number(new Date()) - Number(start_dt))
    const orig_value = this.state.interval
    const tab_id = this.state.tab_id
    
    const percentage = ((passed / orig_value) * 100)
    
    chrome.storage.local.get([String(tab_id)], (results) => {
      const result = results[tab_id]
      
      result.value = percentage
      chrome.storage.local.set({ [tab_id]: result }, () => {
        this.setState({ value: percentage })
      })
    })
  }
  
  pauseTimer() {
    const tab_id = this.state.tab_id
    
    chrome.tabs.sendMessage(tab_id, { action: "pause", tab_id }, () => {
      clearInterval(this.state.timer_id)
      this.setState({ state: "paused", timer_id: undefined, value: 100 })
    });
  }
}

export default App