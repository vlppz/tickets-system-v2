import React, { useState, useEffect } from 'react';

function Footer() {
  const [version, setVersion] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    fetchVersion();
    fetchState();
  }, []);

  const fetchVersion = async () => {
    try {
      const response = await fetch('/api/version', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setVersion(data.version);
      }
    } catch (error) {
      console.error('Failed to fetch version:', error);
    }
  };

  const fetchState = async () => {
    try {
      const response = await fetch('/api/state', {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.status === 'ok') {
        setState(data.state);
      }
    } catch (error) {
      console.error('Failed to fetch state:', error);
    }
  };

  return (
    <footer style={styles.footer}>
      <div style={styles.content}>
        <span style={styles.text}>Tickets System</span>
        <span style={styles.separator}>•</span>
        <span style={styles.text}>
          Версия: <span style={styles.value}>{version || '...'}</span>
        </span>
        <span style={styles.separator}>•</span>
        <span style={styles.text}>
          Статус: <span style={{...styles.value, color: state === 'up' ? '#10b981' : '#6b7280'}}>{state || '...'}</span>
        </span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e5e7eb',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '13px'
  },
  text: {
    color: '#6b7280'
  },
  value: {
    fontWeight: '600',
    color: '#374151'
  },
  separator: {
    color: '#d1d5db'
  }
};

export default Footer;
