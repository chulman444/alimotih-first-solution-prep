async function main() {
  /**
   * Keep this log message to see if changing url reloads the page or updates the content only
   */
  console.log(`ContentScript main called.`)
  
  await onPageLoad()
  
  setupMessageHandler()
}

async function onPageLoad() {
  const _state = await getState()
  const { state, tab_id, interval, timer_ids } = _state
  
  if(state == "start") {
    while(timer_ids.length > 0) {
      const id = timer_ids.pop()
      console.log(`Pause id ${id}`)
      clearTimeout(id)
    }
    
    let biggest_img_el:HTMLImageElement|null = getLargestImg()
    
    if(biggest_img_el) {
      const min_img_area = biggest_img_el!.width * biggest_img_el!.height
      const old_min_img_area = await getMinImgArea(tab_id)
    
      if(min_img_area < old_min_img_area * 1/3) {
        await stopAutoClick(tab_id)
        console.log(`Stop auto click in onPageLoad`)
        await popupNotifyInvalidImg(tab_id)
      }
    }
    else {
      const { timer_id, start_dt } = startAutoClick(tab_id, interval)!
      await backgroundNotifyStart(tab_id, timer_id, start_dt)
    }
  }
  else if(state == "paused" || state == undefined) {
    // Do nothing
  }
}

async function setupMessageHandler() {
  chrome.runtime.onMessage.addListener(async (message, sender, cb) => {
    const action = message.action;
    const tab_id = message.tab_id
    
    if(action == "start") {
      const result = startAutoClick(tab_id, message.wait)
      if(result) {
        cb(result)
      }
    }
    else if(action == "pause") {      
      await stopAutoClick(tab_id)
    }
    else if(action == "getImgSrc") {
      const el = getLargestImg()
      
      if(el) {
        cb(el.src)
      }
    }
  });
}

function startAutoClick(tab_id:number, wait_milisec:number) {
  if(wait_milisec < 1000) {
    alert("Please provide a value greater than 1 second. Alimotih doesn't want to cause 'unexpected behavior' on your browser.")
    return
  }
  
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
        chrome.runtime.sendMessage({ action: "setMinImgArea", min_img_area, tab_id }, () => {
          biggest_img_el!.click()
        })
      }
    }
  }, wait_milisec)
  
  return { timer_id, start_dt }
}

function stopAutoClick(tab_id:number) {
  return new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action: "pause", tab_id }, ({ timer_ids }) => {
      while(timer_ids.length > 0) {
        const id = timer_ids.pop()
        console.log(`Pause id ${id}`)
        clearTimeout(id)
      }
      
      res()
    })
  })
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

async function getState() {
  const state = await new Promise<any>((res, rej) => {
    chrome.runtime.sendMessage({ action: "getState" }, (state) => {
      res(state)
    })
  })
  
  return state
}

async function backgroundNotifyStart(tab_id:number, timer_id:number, start_dt:number) {
  return await new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action: "start", tab_id, timer_id, start_dt }, () => {
      res()
    })
  })
}

async function getMinImgArea(tab_id:number) {
  return await new Promise<number>((res, rej) => {
    chrome.runtime.sendMessage({ action: "getMinImgArea", tab_id }, (min_img_area) => {
      res(min_img_area)
    })
  })
}

async function setMinImgArea(tab_id:number, min_img_area:number) {
  return await new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action: "setMinImgArea", min_img_area, tab_id }, () => {
      res()
    })
  })
}

async function popupNotifyInvalidImg(tab_id:number) {
  return await new Promise((res, rej) => {
    chrome.runtime.sendMessage({ action: "invalidImg", tab_id }, () => {
      res()
    })
  })
}

main()