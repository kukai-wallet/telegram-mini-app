import { TonConnectUIProvider } from '@tonconnect/ui-react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initAppKit } from './utils/reown-utils.ts'
import { EventEmitter } from 'events';

const emitter = new EventEmitter();

emitter.setMaxListeners(15); // Increase the limit as needed

initAppKit()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TonConnectUIProvider manifestUrl={`${window.location.origin}/tonconnect-manifest.json`}>
      <App />
    </TonConnectUIProvider>
  </StrictMode>,
)
