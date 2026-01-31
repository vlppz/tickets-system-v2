import React, { useState } from 'react';
import { User, Lock, Mail } from 'lucide-react';

function LoginPage({ onLoginSuccess, isTransitioning, isReversing }) {
  const [view, setView] = useState('login');

  return (
    <div style={styles.container}>
      <div style={{
        ...styles.leftPanel,
        ...(isTransitioning ? styles.leftPanelExpanding : {}),
        ...(isReversing ? styles.leftPanelReversing : {})
      }} className="left-panel">
        <div style={{
          ...styles.content,
          opacity: (isTransitioning || isReversing) ? 0 : 1,
          transition: isReversing ? 'opacity 0.6s ease-in 0.2s' : 'opacity 0.4s ease-out'
        }}>
          {view === 'login' ? (
            <LoginForm onSuccess={onLoginSuccess} onSwitchToRegister={() => setView('register')} />
          ) : (
            <RegisterForm onSuccess={onLoginSuccess} onSwitchToLogin={() => setView('login')} />
          )}
        </div>
      </div>
      <div style={styles.rightPanel} className="right-panel"></div>
    </div>
  );
}

function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Trigger animation before calling onSuccess
        setTimeout(() => {
          onSuccess(data.user);
        }, 50);
      } else {
        const data = await response.json();
        setError(data.error === 'Invalid credentials' ? 'Неверный email или пароль' : 'Ошибка входа');
      }
    } catch (err) {
      setError('Ошибка сети');
    }
  };

  return (
    <>
      <div style={styles.logoContainer} className="app-logo">
        <img src="/logo.png" alt="Tickets System" style={styles.logoImage} />
        <span style={styles.logoText}>Tickets System</span>
      </div>
      <div style={styles.card} className="app-card">
        <h2 style={styles.title} className="app-title">Вход</h2>
      {error && <div style={styles.error}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <div style={styles.inputWrapper}>
            <Mail size={18} style={styles.inputIcon} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="example@mail.com"
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Пароль</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Введите пароль"
            />
          </div>
        </div>

        <div style={styles.forgotPassword}>
          <a href="#" style={styles.link}>Забыли пароль?</a>
        </div>

        <button type="submit" style={styles.button}>
          Войти
        </button>
      </form>
      
      <p style={styles.switchText}>
        Нет аккаунта?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }} style={styles.link}>
          Зарегистрироваться
        </a>
      </p>
    </div>
    </>
  );
}

function RegisterForm({ onSuccess, onSwitchToLogin }) {
  const [surname, setSurname] = useState('');
  const [name, setName] = useState('');
  const [secondName, setSecondName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surname, name, second_name: secondName, email, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.status !== 'error') {
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
          credentials: 'include'
        });

        if (loginResponse.ok) {
          const loginData = await loginResponse.json();
          onSuccess(loginData.user);
        } else {
          setError('Ошибка входа после регистрации');
        }
      } else {
        // Handle error response
        if (data.detail && data.detail.includes('already exists')) {
          setError('Пользователь с таким email уже существует');
        } else if (data.detail) {
          setError(data.detail);
        } else {
          setError('Ошибка регистрации');
        }
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Ошибка сети');
    }
  };

  return (
    <>
      <div style={styles.logoContainer} className="app-logo">
        <img src="/logo.png" alt="Tickets System" style={styles.logoImage} />
        <span style={styles.logoText}>Tickets System</span>
      </div>
      <div style={styles.card} className="app-card">
        <h2 style={styles.title} className="app-title">Регистрация</h2>
      {error && <div style={styles.error}>{error}</div>}
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Фамилия</label>
          <div style={styles.inputWrapper}>
            <User size={18} style={styles.inputIcon} />
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              required
              style={styles.input}
              placeholder="Иванов"
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Имя</label>
          <div style={styles.inputWrapper}>
            <User size={18} style={styles.inputIcon} />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={styles.input}
              placeholder="Иван"
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Отчество</label>
          <div style={styles.inputWrapper}>
            <User size={18} style={styles.inputIcon} />
            <input
              type="text"
              value={secondName}
              onChange={(e) => setSecondName(e.target.value)}
              required
              style={styles.input}
              placeholder="Иванович"
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Email</label>
          <div style={styles.inputWrapper}>
            <Mail size={18} style={styles.inputIcon} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
              placeholder="example@mail.com"
            />
          </div>
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.label}>Пароль</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.inputIcon} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={styles.input}
              placeholder="Введите пароль"
            />
          </div>
        </div>

        <button type="submit" style={styles.button}>
          Зарегистрироваться
        </button>
      </form>
      
      <p style={styles.switchText}>
        Уже есть аккаунт?{' '}
        <a href="#" onClick={(e) => { e.preventDefault(); onSwitchToLogin(); }} style={styles.link}>
          Войти
        </a>
      </p>
    </div>
    </>
  );
}

const styles = {
  container: {
    position: 'relative',
    display: 'flex',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: 'hidden'
  },
  leftPanel: {
    position: 'relative',
    width: '420px',
    minWidth: '420px',
    maxWidth: '420px',
    backgroundColor: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 50px',
    zIndex: 10,
    boxShadow: '2px 0 20px rgba(0, 0, 0, 0.05)',
    transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  leftPanelExpanding: {
    width: '100vw',
    minWidth: '100vw',
    maxWidth: '100vw'
  },
  leftPanelReversing: {
    width: '100vw',
    minWidth: '100vw',
    maxWidth: '100vw',
    animation: 'shrinkPanel 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards'
  },
  content: {
    width: '100%',
    maxWidth: '420px'
  },
  rightPanel: {
    flex: 1,
    backgroundImage: 'url(/bg.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    position: 'relative'
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '100%',
    zIndex: 10,
    margin: 'auto',
    boxSizing: 'border-box'
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: '0.5px',
    position: 'absolute',
    top: '40px',
    left: '50px',
    zIndex: 20
  },
  logoImage: {
    height: '32px',
    width: 'auto'
  },
  logoText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    letterSpacing: '0.5px'
  },
  title: {
    fontSize: '32px',
    fontWeight: '700',
    marginBottom: '30px',
    marginTop: '80px',
    color: '#1f2937',
    textAlign: 'left'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    width: '100%',
    boxSizing: 'border-box'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    boxSizing: 'border-box'
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize'
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%'
  },
  inputIcon: {
    position: 'absolute',
    left: '16px',
    color: '#9ca3af',
    fontSize: '16px'
  },
  input: {
    padding: '11px 16px 11px 45px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    outline: 'none',
    transition: 'all 0.3s ease',
    fontFamily: 'inherit',
    backgroundColor: '#f9fafb',
    color: '#1f2937',
    width: '100%',
    boxSizing: 'border-box'
  },
  button: {
    padding: '13px',
    fontSize: '15px',
    fontWeight: '600',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '8px',
    transition: 'all 0.3s ease',
    textTransform: 'uppercase',
    width: '100%',
    boxSizing: 'border-box'
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
    border: '1px solid #fecaca'
  },
  switchText: {
    textAlign: 'center',
    marginTop: '20px',
    fontSize: '14px',
    color: '#6b7280'
  },
  link: {
    color: '#3b82f6',
    textDecoration: 'none',
    fontWeight: '600'
  },
  forgotPassword: {
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'left',
    marginTop: '-6px',
    marginBottom: '4px'
  }
};

export default LoginPage;
