import React from 'react';
import MainPage from './MainPage';
import FormBuilderPage from './FormBuilderPage';

function App() {
  const currentPath = window.location.pathname;
  
  if (currentPath === '/forms/builder') {
    return <FormBuilderPage />;
  }
  
  return <MainPage />;
}

export default App;
