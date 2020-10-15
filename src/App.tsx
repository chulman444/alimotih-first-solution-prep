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
      invalid_img_area: false,
      src: undefined
    }
  }
  
  async componentDidMount() {
    const tab_id = await getTabId()
    const entry = await getStorageEntry(tab_id)
    entry.tab_id = tab_id
    const img_src = await getImgSrc(tab_id)
    entry.src = img_src
    
    await this.setupBackgrounPageEventListener()
    
    await new Promise((res, rej) => this.setState(entry, () => res()))
    
    if(this.state.state == "start") {
      const start_dt = await getStartDt(tab_id)
      this.startTimerAnimation(tab_id, start_dt)
    }
  }
  
  async setupBackgrounPageEventListener() {
    const bgWindow = await getBgWindow()
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
        <div style={ { width: '500px', height: '300px', display: "flex", alignItems: "flex-start" } }>
          <div>
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
            {
              this.state.invalid_img_area ?
                <div>Paused due to invalid image size</div> : <div></div>
            }
          </div>
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
  
  async onIntervalUpdate(interval:string) {
    const tab_id = this.state.tab_id    
    await updateInterval(tab_id, interval)
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
  
  startTimer() {
    const tab_id = this.state.tab_id
    
    chrome.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval, tab_id }, ({ start_dt }) => {
      this.startTimerAnimation(tab_id, start_dt)
    });
  }
  
  startTimerAnimation(tab_id:number, start_dt:number) {
    const timer_id = setInterval(async () => {
      const passed = (Number(new Date()) - Number(start_dt))
      const orig_value = this.state.interval      
      const percentage = ((passed / orig_value) * 100)
      
      await updateValue(tab_id, percentage)
      
      const src = await getImgSrc(tab_id)
      this.setState({ value: percentage, src })
    }, 100)
    
    this.setState({ state: "start", invalid_img_area: false, timer_id })
  }
  
  pauseTimer() {
    const tab_id = this.state.tab_id
    
    chrome.tabs.sendMessage(tab_id, { action: "pause", tab_id }, () => {
      this.pauseTimerAnimation()
    });
  }
  
  pauseTimerAnimation(invalid_img_area:boolean = false) {
    clearInterval(this.state.timer_id)
    this.setState({ state: "paused", timer_id: undefined, value: 100, invalid_img_area })
  }
}

export default App

/**
 * Callback to async await
 */

async function getTabId() {
  const tab_id = await new Promise<number>((res, rej) => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab_id = tabs[0].id!
      res(tab_id)
    })
  })
  
  return tab_id
}

async function getStorageEntry(tab_id:number) {
  const result = await new Promise<any>((res, rej) => {
    chrome.storage.local.get([String(tab_id)], (results) => {
      res(results[tab_id])
    })
  })
  return result
}

async function getImgSrc(tab_id:number) {
  const src = await new Promise<any>((res, rej) => {
    chrome.tabs.sendMessage(tab_id, { action: "getImgSrc", tab_id }, (src) => {
      res(src)
    })
  })
  return src
}

async function getStartDt(tab_id:number) {
  const start_dt = await new Promise<number>((res, rej) => {
    chrome.runtime.sendMessage({ action: "getStartDt", tab_id }, ({ start_dt }) => {
      res(start_dt)
    })
  })
  return start_dt
}

async function updateValue(tab_id:number, value:number) {
  return await new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action: "updateValue", tab_id, value }, () => {
      res()
    })
  })
}

async function updateInterval(tab_id:number, input:any) {
  return await new Promise((res, rej) => {
    chrome.storage.local.get([String(tab_id)], (results) => {
      const result = results[tab_id]
      
      result.interval = input
      chrome.storage.local.set({ [tab_id]: result }, () => {
        res()
      })
    })
  })
}

async function getBgWindow() {
  return await new Promise<Window>((res, rej) => {
    chrome.runtime.getBackgroundPage((bgWindow) => {
      res(bgWindow)
    })
  })
}