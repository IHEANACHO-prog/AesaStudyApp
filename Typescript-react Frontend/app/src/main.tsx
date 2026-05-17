import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

// Global styles (Tailwind + Shadcn variables)
import './index.css'

// Root component
import App from './App.tsx'

// The '!' tells TypeScript that 'root' definitely exists in index.html
const rootElement = document.getElementById('root')!;

createRoot(rootElement).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)