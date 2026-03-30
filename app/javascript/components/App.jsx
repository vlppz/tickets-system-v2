import React from 'react';
import { Toaster } from 'react-hot-toast';
import MainPage from './MainPage';
import FormBuilderPage from './FormBuilderPage';
import AdminFormsPage from './AdminFormsPage';
import AdminAnswersPage from './AdminAnswersPage';
import AdminAnswerDetailsPage from './AdminAnswerDetailsPage';
import { ThemeProvider, useTheme } from '../lib/theme';

function ThemedToaster() {
  const { isDark } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '500',
          padding: '12px 16px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: isDark ? '#27272a' : '#ffffff',
          color: isDark ? '#e4e4e7' : '#1f2937',
          boxShadow: isDark
            ? '0 4px 20px rgba(0,0,0,0.5)'
            : '0 4px 20px rgba(0,0,0,0.1)'
        }
      }}
    />
  );
}

function App() {
  const currentPath = window.location.pathname;

  let page = <MainPage />;

  if (currentPath === '/forms/builder') {
    page = <FormBuilderPage />;
  } else if (currentPath === '/admin/forms') {
    page = <AdminFormsPage />;
  } else if (currentPath === '/admin/answers') {
    page = <AdminAnswersPage />;
  } else if (currentPath === '/admin/answers/view') {
    page = <AdminAnswerDetailsPage />;
  }

  return (
    <ThemeProvider>
      {page}
      <ThemedToaster />
    </ThemeProvider>
  );
}

export default App;
