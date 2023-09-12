import { StrictMode } from 'react'
import * as ReactDOM from 'react-dom/client'
import * as serviceWorker from './serviceWorker'

import { App } from './components/app'

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <StrictMode>
    <App />
  </StrictMode>
)

serviceWorker.register()
