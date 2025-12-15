import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (error) {
  console.error("Critical rendering error:", error);
  // Mostrar error en pantalla en caso de fallo catastrófico
  rootElement.innerHTML = `
    <div style="color: #ff5555; padding: 40px; font-family: monospace; background: rgba(0,0,0,0.8); height: 100vh;">
      <h1 style="font-size: 24px; margin-bottom: 20px;">Fallo de Sistemas Críticos</h1>
      <p>La aplicación no pudo iniciarse.</p>
      <pre style="background: #222; padding: 10px; border-radius: 5px; overflow: auto;">${error instanceof Error ? error.message : JSON.stringify(error)}</pre>
      <p style="margin-top: 20px; color: #aaa;">Revisa la consola del navegador para más detalles.</p>
    </div>
  `;
}