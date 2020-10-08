function main() {
  /**
   * Keep this log message to see if changing url reloads the page or updates the content only
   */
  console.log(`ContentScript main called.`)
  
  chrome.runtime.onMessage.addListener((message, sender, cb) => {
    console.log(message)
    const action = message.action;
    
    if(action == "start") {
      const wait_milisec = message.wait;
      
      let biggest_img_el:HTMLImageElement|null = getLargestImg()
      if(biggest_img_el) {
        if(wait_milisec < 1000) {
          alert("Please provide a value greater than 1 second. Alimotih doesn't want to cause 'unexpected behavior' on your browser.")
          return
        }
        
        const timer_id = setInterval(() => {
          biggest_img_el!.click() 
        }, wait_milisec)
        
        cb(timer_id)
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
  });
}

function getLargestImg():HTMLImageElement|null {
  let biggest_img_el:HTMLImageElement|null = null
  document.querySelectorAll("img").forEach(el => {
    biggest_img_el = biggest_img_el ? biggest_img_el.width < el.width ? el : biggest_img_el : el
  })
  
  console.log(`Largest img:`, biggest_img_el)
  
  return biggest_img_el
}

main()