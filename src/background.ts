namespace background {
  function main() {
    console.log("Background main called")
    chrome.runtime.onMessage.addListener((message, sender, cb) => {
      console.log(`Background script. message`)
      console.log(message)
    })
  }

  main()
}