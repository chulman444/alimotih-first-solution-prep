import { browser } from "webextension-polyfill-ts"

const DEFAULT_WAIT_SECONDS = 5

browser.tabs.onCreated.addListener(function(tab) {
  const tab_id = tab.id
  if(tab_id) {
    initializeStorage(tab_id)
  }
})

browser.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
  // This is called when the url changes but the page doesn't 'reload'
})

browser.tabs.onRemoved.addListener(function(tab_id) {
  chrome.storage.local.remove(String(tab_id), () => {
    chrome.storage.local.get(null, (results) => {
      console.log(`onRemoved debug ${tab_id}:`)
      console.log(results)
    })
  })
})

browser.windows.onRemoved.addListener(function() {
  console.log(`Clear local storage`)
  chrome.storage.local.clear()
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  const action = message.action
  const tab_id = message.tab_id
  
  if(action == "invalidImg") {
    const { [tab_id]: result } = await browser.storage.local.get([String(tab_id)])
    result.invalid_img_area = true
    browser.storage.local.set({ [tab_id]: result })
    window.dispatchEvent(new CustomEvent("invalidImg")) 
  }
  else if(action == "getState") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    const tab_id = tab.id!
    let { [tab_id]: state } = await browser.storage.local.get([String(tab_id)])
    if(state == undefined) {
      await initializeStorage(tab_id)
      const { [tab_id]: _state } = await browser.storage.local.get([String(tab_id)])
      state = _state
    }
      
    return state
  }
})

async function initializeStorage(tab_id:number) {
  return await new Promise((res, rej) => {
    chrome.storage.local.set({
      [String(tab_id)]: {
        /**
         * 2020-10-15 20:02
         * Relevant in the popup
         */
        tab_id: tab_id,
        interval: DEFAULT_WAIT_SECONDS,
        state: "paused",
        value: 100,
        invalid_img_area: false,
        
        /**
         * 2020-10-15 20:02
         * Not relevant in the popup script
         */
        timer_ids: [],
        min_img_area: undefined,
        start_dt: undefined
      }
    }, () => {
      chrome.storage.local.get(null, (results) => {
        console.log(`initializeStorage debug ${tab_id}:`)
        console.log(results)
        res()
      })
    })
  })
}