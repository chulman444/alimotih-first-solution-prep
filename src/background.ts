chrome.tabs.onCreated.addListener(function(tab) {
  const tab_id = tab.id
  if(tab_id) {
    initializeStorage(tab_id)
  }
})

chrome.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
  // This is called when the url changes but the page doesn't 'reload'
})

chrome.tabs.onRemoved.addListener(function(tab_id) {
  chrome.storage.local.remove(String(tab_id), () => {
    chrome.storage.local.get(null, (results) => {
      console.log(`onRemoved debug ${tab_id}:`)
      console.log(results)
    })
  })
})

chrome.windows.onRemoved.addListener(function() {
  console.log(`Clear local storage`)
  chrome.storage.local.clear()
})

chrome.runtime.onMessage.addListener((message, sender, cb) => {
  const action = message.action
  const tab_id = message.tab_id
  
  if(action == "start") {
    const timer_id = message.timer_id
    
    chrome.storage.local.get([String(tab_id)], (results) => {
      results[tab_id].timer_ids.push(timer_id)
      results[tab_id].state = "start"
      chrome.storage.local.set({ [String(tab_id)]: results[tab_id] }, () => {
        chrome.storage.local.get([String(tab_id)], (results) => {
          console.log(`Debug background action start`)
          console.log(results)
        })
      })
    })
  }
  else if(action == "pause") {
    chrome.storage.local.get([String(tab_id)], (results) => {
      const timer_ids = (results[tab_id].timer_ids as Array<any>).slice()
      
      results[tab_id].timer_ids = []
      results[tab_id].state = "paused"
      
      chrome.storage.local.set({ [String(tab_id)]: results[tab_id] }, () => {
        /**
         * 2020-10-08 10:09
         * 
         * https://developer.chrome.com/extensions/runtime#event-onMessage
         * 
         * "Should be" but seems like it MUST be a non-array JSON format.
         */
        cb({ timer_ids })
      })
    })
    /**
     * 2020-10-08 10:09
     * 
     * https://developer.chrome.com/extensions/runtime#event-onMessage
     * 
     * Must return true to use the third argument properly. Took long time to debug this
     */
    return true
  }
})

function initializeStorage(tab_id:number) {
  chrome.storage.local.set({
    [String(tab_id)]: {
      tab_id: tab_id,
      interval: 2000,
      state: "paused",
      timer_ids: []
    }
  }, () => {
    chrome.storage.local.get(null, (results) => {
      console.log(`initializeStorage debug ${tab_id}:`)
      console.log(results)
    })
  })
}