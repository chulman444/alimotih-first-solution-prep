import { browser } from "webextension-polyfill-ts"
import { updateEntry, getEntry, reinitIfPossible } from "./storage-local"

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
  const { state, interval } = await reinitIfPossible(tab_id, location.host)
  
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
    else if(action == "getImgDataUrl") {
      const el = getLargestImg()
      
      if(el) {
        /**
         * 2020-11-13 01:38
         * 
         * Changing `crossOrigin` sets `img.complete` to false, eg is `true` before
         * changing. This results in getting data url using Convas return an empty
         * image. Using `.decode()` sets `complete` back to true and returns the
         * data url expectedly.
         */
        el.crossOrigin = 'anonymous'
        await el.decode()
        const dataUrl = getDataUrl(el)
        return dataUrl
      }
    }
    else if(action == "shakeTargetImgEl") {
      const el = getLargestImg()
      
      if(el) {
        const style_before = el.style
        el.style.animation = 'shake 0.5s'
        el.style.animationIterationCount = 'infinite'
        setTimeout(() => {
          // @ts-ignore
          el.style = style_before
        }, 500)
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

/**
 * 2020-10-24 13:11
 * TODO? Restriction on the size of the width and height? In YouTube, width of 9999 img
 * element is picked from this function but still clicks the first video that appears
 * at the top left of the video.
 * 
 * I don't assume this extension to be used for YouTube, but I need to add restrictions
 * on the size of the img element?
 */
function getLargestImg():HTMLImageElement|null {
  let biggest_img_el:HTMLImageElement|null = null
  Array.from(document.querySelectorAll("img"))
    .filter((el:HTMLImageElement) => {
      const rect = el.getBoundingClientRect()
      return rect.height > 0 && rect.width > 0
    })
    .forEach(el => {
      biggest_img_el = biggest_img_el ? biggest_img_el.width < el.width ? el : biggest_img_el : el
    })
  
  return biggest_img_el
}

/**
 * https://stackoverflow.com/a/934925
 */
function getDataUrl(img:HTMLImageElement):string {
  // Create an empty canvas element
  var canvas = document.createElement("canvas");
  
  /**
   * 2020-11-13 01:31
   * 
   * Using width and height gives the shrunk size that is currently
   * displayed in the image. That also means that these values will
   * be even smaller with the console log open at the side of the
   * same window.
   * 
   * The ratio is respected but when used for drawing into canvas,
   * the image content is "cropped".
   */
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;

  // Copy the image contents to the canvas
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  // Get the data-URL formatted image
  // Firefox supports PNG and JPEG. You could check img.src to
  // guess the original format, but be aware the using "image/jpg"
  // will re-encode the image.
  var dataURL = canvas.toDataURL("image/png");
  return dataURL;
  // return dataURL.replace(/^data:image\/(png|jpg);base64,/, "");
}