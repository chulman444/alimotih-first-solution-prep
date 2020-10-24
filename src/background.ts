import { browser } from "webextension-polyfill-ts"
import { updateEntry, getEntry, reinitIfPossible } from "./storage-local"

const DEFAULT_WAIT_SECONDS = 5

browser.tabs.onCreated.addListener(async function(tab) {
  /**
   * 2020-10-24 11:48
   * Triggered when the tab is created by clicking on new tab or `ctrl + t` or
   * restoring the closed tab with `ctrl + shift + t`.
   */
})

browser.tabs.onUpdated.addListener(async function(tab_id, change_info, tab) {
  /**
   * 2020-10-24 11:48
   * Triggered after `tabs.onCreated` fires. Does NOT get triggered when page reloads.
   * Seems like it only gets triggered when the url changes.
   * 
   * Googled "javascript how to detect url change". Getting `onhashchange` which does not
   * work if url doesn't have hash.
   */
  if(tab.url) {
    await reinitIfPossible(tab_id, new URL(tab.url).host)
  }
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