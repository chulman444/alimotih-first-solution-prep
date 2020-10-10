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
    
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab_id = tabs[0].id!
      chrome.storage.local.get([String(tab_id)], (results) => {
        const result = results[tab_id]
        this.setState(result)
        
        if(this.state.state == "start") {
          this.startTimer(tab_id)
        }
      })
      
      chrome.tabs.sendMessage(tab_id, { action: "popup-open" }, (src) => {
        this.setState({ src })
      })
    })
  
  }
  
  render() {
    return (
      <div style={ { width: '500px' } }>
        <div>Tab id: {this.state.tab_id}</div>
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
        <Tooltip title="This image on the page will be clicked">
          <img
            src={this.state.src}
            alt="If you are seeing this try reopening the popup"
            style={{ maxHeight: "300px", maxWidth: "200px" }}
          />
        </Tooltip>
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
    chrome.tabs.query({ active: true, currentWindow: true }, async tabs => {
      const tab_id = tabs[0].id!
      const state = this.state.state
      
      if(state == "paused") {
        this.startTimer(tab_id)
      }
      else if(state == "start") {
        this.pauseTimer(tab_id)
      }
    });
  }
  
  startTimer(tab_id:number) {
    chrome.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval, tab_id }, ({ timer_id, start_dt }) => {
      chrome.runtime.sendMessage({ action: "start", tab_id, timer_id }, () => {
        const orig_value = this.state.interval
        const timer_id = setInterval(() => {
          const passed = (Number(new Date()) - Number(start_dt))
          const percentage = ((passed / orig_value) * 100)
          
          chrome.storage.local.get([String(tab_id)], (results) => {
            const result = results[tab_id]
            
            result.value = percentage
            chrome.storage.local.set({ [tab_id]: result }, () => {
              this.setState({ value: percentage })
            })
          })
        }, 100)
        
        this.setState({ state: "start", timer_id })
      })
    });
  }
  
  pauseTimer(tab_id:number) {
    chrome.runtime.sendMessage({ action: "pause", tab_id }, ({ timer_ids }) => {
      chrome.tabs.sendMessage(tab_id, { action: "pause", timer_ids }, () => {
        clearInterval(this.state.timer_id)
        this.setState({ state: "paused", timer_id: undefined, value: 100 })
      });
    })
  }
}

export default App