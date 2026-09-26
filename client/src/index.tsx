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
    <MantineProvider defaultColorScheme="dark" theme={{ primaryColor: 'cyan', fontFamily: 'Inter, sans-serif' }}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
