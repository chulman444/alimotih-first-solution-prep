import { browser } from "webextension-polyfill-ts"
import { updateEntry, getEntry } from "./storage-local"

const DEFAULT_WAIT_SECONDS = 5

browser.tabs.onCreated.addListener(async function(tab) {
  const tab_id = tab.id
  if(tab_id) {
    await getEntry(tab_id)
  }
})

browser.tabs.onUpdated.addListener(function(tab_id, change_info, tab) {
  // This is called when the url changes but the page doesn't 'reload'
})

browser.tabs.onRemoved.addListener(async function(tab_id) {
  await browser.storage.local.remove(String(tab_id))
  const entries = await browser.storage.local.get()
})

browser.windows.onRemoved.addListener(async function() {
  console.log(`Clear local storage`)
  await browser.storage.local.clear()
})

browser.runtime.onMessage.addListener(async (message, sender) => {
  const action = message.action
  const tab_id = message.tab_id
  
  if(action == "invalidImg") {
    await updateEntry(tab_id, { invalid_img_area: true })
    window.dispatchEvent(new CustomEvent("invalidImg")) 
  }
  else if(action == "getTabId") {
    console.log(sender)
    return sender.tab?.id
  }
})