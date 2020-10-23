import { browser } from "webextension-polyfill-ts"

async function main() {
  /**
   * Keep this log message to see if changing url reloads the page or updates the content only
   */
  console.log(`ContentScript main called.`)
  
  await onPageLoad()
  
  setupMessageHandler()
}
main()

async function onPageLoad() {
  const { state, tab_id, interval } = await browser.runtime.sendMessage({ action: "getState" })
  
  if(state == "start") {    
    await startAutoClick(tab_id, interval);
  }
  else if(state == "paused" || state == undefined) {
    // Do nothing
  }
}

async function setupMessageHandler() {
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
  const { timer_ids } = await browser.runtime.sendMessage({ action: "getState" })
  while(timer_ids.length > 0) {
    const id = timer_ids.pop()
    console.log(`Pause id ${id}`)
    clearTimeout(id)
  }
  
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
      const old_min_img_area = await getMinImgArea(tab_id)
    
      if(min_img_area < old_min_img_area * 1/3) {
        await stopAutoClick(tab_id)
        await popupNotifyInvalidImg(tab_id)
      }
      else {
        const { [tab_id]: result } = await browser.storage.local.get([String(tab_id)])
        result.min_img_area = min_img_area
        await browser.storage.local.set({ [String(tab_id)]: result })
        biggest_img_el!.click()
      }
    }
  }, wait_milisec)
  
  if(timer_id != null && start_dt != null ) {
    await backgroundNotifyStart(tab_id, timer_id, start_dt)
    return { timer_id, start_dt }
  }
}

async function stopAutoClick(tab_id:number) {
  const { [tab_id]: result } = await browser.storage.local.get([String(tab_id)])
  /**
   * 2020-10-12 11:11
   * 
   * Double prevention of bug introduced in `bb84ab8`
   */
  if(result.state == "paused") {
    return
  }

  const timer_ids = (result.timer_ids as Array<any>).slice()

  result.timer_ids = []
  result.value = 100
  result.state = "paused"

  await browser.storage.local.set({ [String(tab_id)]: result })
  
  while(timer_ids.length > 0) {
    const id = timer_ids.pop()
    console.log(`Pause id ${id}`)
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

/**
 * Callback to async await
 */

async function backgroundNotifyStart(tab_id:number, timer_id:number, start_dt:number) {
  const { [tab_id]: result } = await browser.storage.local.get([String(tab_id)])
  result.timer_ids.push(timer_id)
  result.state = "start"
  result.invalid_img_area = false
  result.min_img_area = undefined
  result.start_dt = start_dt
  await browser.storage.local.set({ [String(tab_id)]: result })
}

async function getMinImgArea(tab_id:number) {
  const { [tab_id]: { min_img_area } } = await browser.storage.local.get([String(tab_id)])
  return min_img_area
}

async function popupNotifyInvalidImg(tab_id:number) {
  await browser.runtime.sendMessage({ action: "invalidImg", tab_id })
}

const DEFAULT_WAIT_SECONDS = 5
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