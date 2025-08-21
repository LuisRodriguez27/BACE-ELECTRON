import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import ClientList from './features/clients/index.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClientList />
  </StrictMode>,
)
