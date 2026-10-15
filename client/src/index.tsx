import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import App from './App';
import './styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root was not found');

createRoot(root).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="dark"
      theme={{
        primaryColor: 'tokyo',
        primaryShade: 5,
        defaultRadius: 0,
        fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace",
        fontFamilyMonospace: "'JetBrains Mono', ui-monospace, Consolas, monospace",
        headings: { fontFamily: "'JetBrains Mono', ui-monospace, Consolas, monospace" },
        colors: {
          tokyo: [
            '#eaf0ff', '#cdd8ff', '#b4c6fb', '#9db4f9', '#8bb0f8',
            '#7aa2f7', '#6183bb', '#4c6aa3', '#3b5688', '#2a3f6b',
          ],
        },
      }}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
