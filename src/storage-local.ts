import { keys } from "@material-ui/core/styles/createBreakpoints"
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
        start_dt: undefined
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
}