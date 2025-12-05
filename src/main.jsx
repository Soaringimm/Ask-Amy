import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// 调试 fetch 调用
const _origFetch = window.fetch;
window.fetch = (...args) => {
  console.log('>>> FETCH CALLED WITH:', args);
  console.log('>>> First arg type:', typeof args[0]);
  console.log('>>> First arg value:', args[0]);
  return _origFetch(...args);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
