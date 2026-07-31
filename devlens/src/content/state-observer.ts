// Runs at document_start — captures framework state for the State tab (Phase 3)
(function () {
  if (typeof window === 'undefined') return

  window.addEventListener('message', (event) => {
    if (event.source !== window) return
    if (event.data?.type === 'DEVLENS_STATE_SNAPSHOT') {
      chrome.runtime.sendMessage({ type: 'STATE_SNAPSHOT', payload: event.data.payload })
    }
  })
})()
