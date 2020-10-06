import React from 'react';
import { Box, Typography, CircularProgress, CircularProgressProps } from "@material-ui/core"

function CircularProgressWithLabel(props: CircularProgressProps) {
  return (
    <Box position="relative" display="inline-flex">
      <CircularProgress variant="static" value={50} {...props} />
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

class App extends React.Component<any, any> {
  constructor(props:any) {
    super(props)
    
    this.state = { cur_tab_id: undefined, action: "pause", interval_milisec: 2000, response: undefined }
    
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      this.setState({ cur_tab_id: tabs[0].id! })
    })
  }
  
  render() {
    return (
      <div style={ { width: '300px' } }>
        <div>Tab id: {this.state.cur_tab_id} {this.state.test}</div>
        <input value={this.state.interval_milisec} onChange={(ev) => this.setState({ interval_milisec: ev.target.value })}/>
        <button onClick={() => this.toggleAction()}>{this.getActionText()}</button>
        <div>{this.state.interval_milisec}</div>
        <CircularProgressWithLabel />
        <div>{this.state.response}</div>
      </div>
    )
  }
  
  getActionText() {
    const action = this.state.action
    if(action == "pause") {
      return "Start"
    }
    else {
      return "Pause"
    }
  }
  
  toggleAction() {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const tab_id = tabs[0].id!
      const action = this.state.action
      
      chrome.runtime.sendMessage("And this goes to the background script")
      
      if(action == "pause") {
        chrome.tabs.sendMessage(tab_id, { action: "start", wait: this.state.interval_milisec }, () => {
          this.setState({ action: "start" })
        });
      }
      else if(action == "start") {
        chrome.tabs.sendMessage(tab_id, { action: "pause" }, (foo) => {
          this.setState({ action: "pause" })
        });
      }
    });
  }
}

export default App