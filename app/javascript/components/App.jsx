import React from 'react';
import MainPage from './MainPage';
import FormBuilderPage from './FormBuilderPage';
import AdminFormsPage from './AdminFormsPage';
import AdminAnswersPage from './AdminAnswersPage';
import AdminAnswerDetailsPage from './AdminAnswerDetailsPage';
import { ThemeProvider } from '../lib/theme';

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
    </ThemeProvider>
  );
}

export default App;
