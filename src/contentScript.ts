function main() {
  /**
   * Keep this log message to see if changing url reloads the page or updates the content only
   */
  console.log(`ContentScript main called.`)
  
  chrome.runtime.sendMessage({ action: "getState" }, (_state) => {
    const { state, tab_id, interval } = _state
    console.log(`Current state of auto trigger`)
    console.log(_state)
    
    if(state == "start") {
      const result = startAutoClick(tab_id, interval)
    }
    else if(state == "paused" || state == undefined) {
      // Do nothing
    }
  })
  
  chrome.runtime.onMessage.addListener((message, sender, cb) => {
    const action = message.action;
    
    if(action == "start") {
      const tab_id = message.tab_id
      const result = startAutoClick(tab_id, message.wait)
      if(result) {
        cb(result)
        return true
      }
    }
    else if(action == "pause") {
      const timer_ids = message.timer_ids
      
      while(timer_ids.length > 0) {
        const id = timer_ids.pop()
        console.log(`Pause id ${id}`)
        clearTimeout(id)
      }
      
      cb()
    }
    else if(action == "popup-open") {
      const el = getLargestImg()
      
      if(el) {
        cb(el.src)
      }
    }
  });
}

function startAutoClick(tab_id:number, wait_milisec:number) {      
  let biggest_img_el:HTMLImageElement|null = getLargestImg()
  if(biggest_img_el) {
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
    const timer_id = setInterval(() => {
      const min_img_area = biggest_img_el!.width * biggest_img_el!.height
      chrome.runtime.sendMessage({ action: "setMinImgArea", min_img_area, tab_id }, () => {
        biggest_img_el!.click()
      })
    }, wait_milisec)
    
    return { timer_id, start_dt }
  }
}

function getLargestImg():HTMLImageElement|null {
  let biggest_img_el:HTMLImageElement|null = null
  document.querySelectorAll("img").forEach(el => {
    biggest_img_el = biggest_img_el ? biggest_img_el.width < el.width ? el : biggest_img_el : el
  })
  
  return biggest_img_el
}

main()