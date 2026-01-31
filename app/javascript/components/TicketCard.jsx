import React from 'react';
import { FileText } from 'lucide-react';

function TicketCard({ ticket, onTakeTicket }) {
  return (
    <div style={styles.card}>
      <div style={styles.iconWrapper}>
        <FileText size={24} color="#3b82f6" />
      </div>
      
      <div style={styles.content}>
        <h3 style={styles.title}>{ticket.title}</h3>
        {ticket.description && (
          <p style={styles.description}>{ticket.description}</p>
        )}
      </div>
      
      <button onClick={() => onTakeTicket(ticket.id)} style={styles.button}>
        Взять заявку
      </button>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    transition: 'box-shadow 0.2s, border-color 0.2s',
    cursor: 'pointer',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  iconWrapper: {
    width: '48px',
    height: '48px',
    backgroundColor: '#eff6ff',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: {
    flex: 1
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: '8px'
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    lineHeight: '1.5'
  },
  button: {
    padding: '10px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    textTransform: 'uppercase'
  }
};

export default TicketCard;
