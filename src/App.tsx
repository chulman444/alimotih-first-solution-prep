import React from 'react';
import { Box, Typography, CircularProgress, CircularProgressProps } from "@material-ui/core"

function CircularProgressWithLabel(props: CircularProgressProps & { value: number }) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="static" {...props} />
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
        <Typography variant="caption" component="div" color="textSecondary">
          hihihi
        </Typography>
      </Box>
    </Box>
  );
}

type AppState = { tab_id?: number, state: "loading" | "pause" | ""}

class App extends React.Component<any, any> {
  constructor(props:any) {
    super(props)
    
    this.state = { tab_id: undefined, state: "paused", interval: 2000, value: 100 }
    
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab_id = tabs[0].id!
      chrome.storage.local.get([String(tab_id)], (results) => {
        console.log(results)
        const result = results[tab_id]
        this.setState(result)
      })
    })
  }
  
  render() {
    return (
      <div style={ { width: '300px' } }>
        <div>Tab id: {this.state.tab_id}</div>
        <input value={this.state.interval} onChange={(ev) => this.onIntervalUpdate(ev.target.value)}/>
        <button onClick={() => this.toggleAction()}>{this.getActionText()}</button>
        <div>{this.state.interval_milisec}</div>
        <CircularProgressWithLabel value={this.state.value} />
        <div>{this.state.response}</div>
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
        chrome.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval, tab_id }, (timer_id) => {
          chrome.runtime.sendMessage({ action: "start", tab_id, timer_id }, () => {
            this.setState({ state: "start" })
          })
        });
      }
      else if(state == "start") {
        chrome.runtime.sendMessage({ action: "pause", tab_id }, ({ timer_ids }) => {
          chrome.tabs.sendMessage(tab_id, { action: "pause", timer_ids }, () => {
            this.setState({ state: "paused" })
          });
        })
      }
    });
  }
}

export default App