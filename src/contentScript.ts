import { browser } from "webextension-polyfill-ts"
import { updateEntry, getEntry } from "./storage-local"

async function main() {
  /**
   * 2020-10-24 12:03
   * Not triggered when the tab is just created and is an empty url, or special urls like
   * `chrome://extensions`. Not that `browser.tabs.onUpdated` does get triggered when
   * an empty url tab is created and when navigating to 'special urls'.
   */
  await onPageLoad()
  setupMessageHandler()
}
main()

async function onPageLoad() {
  const tab_id = await browser.runtime.sendMessage({ action: "getTabId" })
  const { state, interval } = await getEntry(tab_id)
  
  if(state == "start") {    
    await startAutoClick(tab_id, interval);
  }
  else if(state == "paused" || state == undefined) {
    // Do nothing
  }
}

function setupMessageHandler() {
  browser.runtime.onMessage.addListener(async (message, sender) => {
    const action = message.action;
    const tab_id = message.tab_id
    
    if(action == "start") {
      const auto_click_result = startAutoClick(tab_id, message.wait)
      return auto_click_result
    }
    else if(action == "pause") {      
      await stopAutoClick(tab_id)
    }
    else if(action == "getImgSrc") {
      const el = getLargestImg()
      
      if(el) {
        return el.src
      }
    }
  });
}

async function startAutoClick(tab_id:number, wait_sec:number) {
  await clearTimers(tab_id)
  
  if(wait_sec < 1 || wait_sec > 60) {
    alert("Please provide a value between 1 second and 60 seconds. Alimotih doesn't want to cause 'unexpected behavior' on your browser.")
    return
  }
  
  const wait_milisec = wait_sec * 1000
  
  /**
   * 2020-10-08 16:46
   * Convert Date to Number because only JSON-parsable data can be
   * passed to the third parameter callback function.
   * 
   * Note that whether I use start_dt from here or from the popup script,
   * there still exists little 'offset' between the img click trigger and
   * the interval timer reaching 100%. Annoying.
   */
  const start_dt = Number(new Date())
  const timer_id = setInterval(async () => {
    let biggest_img_el:HTMLImageElement|null = getLargestImg()
    
    if(biggest_img_el) {
      const min_img_area = biggest_img_el!.width * biggest_img_el!.height
      const old_min_img_area = await getEntry(tab_id, "min_img_area")
    
      if(min_img_area < old_min_img_area * 1/3) {
        await stopAutoClick(tab_id)
        await await browser.runtime.sendMessage({ action: "invalidImg", tab_id })
      }
      else {
        await updateEntry(tab_id, { min_img_area })
        biggest_img_el!.click()
      }
    }
  }, wait_milisec)
  
  if(timer_id != null && start_dt != null ) {
    await updateEntry(tab_id, {
      timer_ids: [timer_id],
      state: "start",
      invalid_img_area: false,
      min_img_area: undefined,
      start_dt
    })
    return { timer_id, start_dt }
  }
}

async function stopAutoClick(tab_id:number) {
  const state = await getEntry(tab_id, "state")
  /**
   * 2020-10-12 11:11
   * 
   * Double prevention of bug introduced in `bb84ab8`
   */
  if(state == "paused") {
    return
  }
  
  await clearTimers(tab_id)
  
  await updateEntry(tab_id, {
    timer_ids: [],
    value: 100,
    state: "paused",
  })
}

async function clearTimers(tab_id:number) {
  const timer_ids = await getEntry(tab_id, "timer_ids")
  while(timer_ids.length > 0) {
    const id = timer_ids.pop()
    clearTimeout(id)
  }
}

function getLargestImg():HTMLImageElement|null {
  let biggest_img_el:HTMLImageElement|null = null
  document.querySelectorAll("img").forEach(el => {
    biggest_img_el = biggest_img_el ? biggest_img_el.width < el.width ? el : biggest_img_el : el
  })
  
  return biggest_img_el
}