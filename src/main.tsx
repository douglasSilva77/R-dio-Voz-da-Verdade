import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './index.css';

console.log("Main.tsx: Starting application...");

// Global error handler for debugging
window.onerror = (msg, url, line, col, error) => {
  console.error("Global error caught in main.tsx:", msg, url, line, col, error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 40px; color: white; background: #09090b; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: sans-serif;">
        <h1 style="color: #ef4444; margin-bottom: 16px;">Erro de Inicialização</h1>
        <p style="color: #a1a1aa; margin-bottom: 24px;">Ocorreu um erro ao carregar o aplicativo.</p>
        <div style="background: #18181b; padding: 16px; border-radius: 8px; font-size: 12px; color: #f4f4f5; max-width: 100%; overflow: auto; text-align: left;">
          <p><strong>Mensagem:</strong> ${msg}</p>
          <p><strong>Arquivo:</strong> ${url}</p>
          <p><strong>Linha:</strong> ${line}:${col}</p>
          ${error ? `<p><strong>Stack:</strong> ${error.stack}</p>` : ''}
        </div>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #D4AF37; color: #09090b; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">
          Recarregar Aplicativo
        </button>
      </div>
    `;
  }
  return false;
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Main.tsx: Root element not found!");
} else {
  console.log("Main.tsx: Root element found, rendering...");
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
  } catch (err) {
    console.error("Main.tsx: Error during initial render:", err);
    const msg = err instanceof Error ? err.message : String(err);
    rootElement.innerHTML = `
      <div style="padding: 40px; color: white; background: #09090b; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; font-family: sans-serif;">
        <h1 style="color: #ef4444; margin-bottom: 16px;">Erro de Renderização</h1>
        <p style="color: #a1a1aa; margin-bottom: 24px;">Ocorreu um erro ao renderizar o aplicativo.</p>
        <pre style="background: #18181b; padding: 16px; border-radius: 8px; font-size: 12px; color: #f4f4f5; max-width: 100%; overflow: auto;">${msg}</pre>
        <button onclick="window.location.reload()" style="margin-top: 24px; padding: 12px 24px; background: #D4AF37; color: #09090b; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">Recarregar</button>
      </div>
    `;
  }
}
