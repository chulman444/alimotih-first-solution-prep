import { browser } from "webextension-polyfill-ts"

/**
 * 2020-10-23 18:49
 * `browser.storage.local` is available in all the background, content, and
 *  pop up contexts
 */

const DEFAULT_WAIT_SECONDS = 5

export async function getEntry(tab_id:number, key?:string):Promise<any> {
  const { [tab_id]: result } = await browser.storage.local.get([String(tab_id)])
  
  if(result) {
    let entry = result
    if(key) {
      entry = result[key]
    }
    return entry
  }
  else {
    await browser.storage.local.set({
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
        start_dt: undefined,
        host: undefined,
      }
    })
    return await getEntry(tab_id, key)
  }
}

export async function updateEntry(tab_id:number, pairs:{ [key:string]: any }) {
  const entry = await getEntry(tab_id)
  for(const key in pairs) {
    entry[key] = pairs[key]
  }
  await browser.storage.local.set({ [tab_id]: entry })
  const result = await getEntry(tab_id)
  return result
}

/**
 * 2020-10-24 12:42
 * Prevents unexpected behavior when the user forgets to pause the extension, and navigates to
 * other url. Eg, manga websites to YouTube. Then YouTube videos will click every interval.
 * 
 * @param tab_id 
 * @param host `location.host` includes the port number as well while `location.hostname` doesn't.
 *             Eg, User could be using the extension in `localhost`.
 *             https://developer.mozilla.org/en-US/docs/Web/API/Location
 */
export async function reinitIfPossible(tab_id:number, host:string) {
  let entry = await getEntry(tab_id)
  if(entry.host != host) {
    await browser.storage.local.remove(String(tab_id))
    entry = await updateEntry(tab_id, { host })
  }
  return entry
}