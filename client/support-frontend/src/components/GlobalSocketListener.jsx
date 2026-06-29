import { useEffect } from 'react';
import socket from '../utils/socket';
import { showToast } from '../utils/toastEmitter';

const GlobalSocketListener = () => {
  useEffect(() => {
    const userId = sessionStorage.getItem('userId');
    const userRole = sessionStorage.getItem('userRole');

    if (!userId) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    socket.emit('register_user', userId);

    // ==========================================
    // 1. NEW REPLY NOTIFICATION (all roles)
    //    Shows an in-app toast whenever someone
    //    sends a reply in a ticket you're involved in.
    // ==========================================
    const handleNewReply = ({ ticketTitle, senderRole, message }) => {
      const senderLabel = {
        Agent:         'Support Agent',
        Admin:         'Admin',
        Company_Owner: 'Company Owner',
        Customer:      'Customer',
      }[senderRole] || senderRole;

      showToast(
        `"${message.length > 80 ? message.slice(0, 77) + '…' : message}"`,
        'info',
        `💬 ${senderLabel} replied on: ${ticketTitle}`
      );
    };

    socket.on('new_reply', handleNewReply);

    // ==========================================
    // 2. AGENT / OWNER NOTIFICATIONS
    // ==========================================
    if (userRole === 'Agent' || userRole === 'Admin') {
      socket.on('ticket_assigned', (ticket) => {
        showToast(
          `Ticket #${ticket._id.substring(ticket._id.length - 6)}: ${ticket.title}`,
          'success',
          '🎯 Ticket Assigned to You'
        );
        if (Notification.permission === 'granted') {
          new Notification('Ticket Assigned', {
            body: `You have been assigned to Ticket #${ticket._id.substring(ticket._id.length - 6)}: ${ticket.title}`
          });
        }
      });

      socket.on('new_ticket_created', (ticket) => {
        showToast(
          `#${ticket._id.substring(ticket._id.length - 6)}: ${ticket.title}`,
          'info',
          '🆕 New Ticket Submitted'
        );
        if (Notification.permission === 'granted') {
          new Notification('New Ticket Created', {
            body: `A customer just submitted Ticket #${ticket._id.substring(ticket._id.length - 6)}`
          });
        }
      });
    }

    // ==========================================
    // 3. COMPANY OWNER NOTIFICATIONS
    // ==========================================
    if (userRole === 'Company_Owner') {
      socket.on('new_ticket_created', (ticket) => {
        showToast(
          `#${ticket._id.substring(ticket._id.length - 6)}: ${ticket.title}`,
          'info',
          '🆕 New Ticket in Your Workspace'
        );
        if (Notification.permission === 'granted') {
          new Notification('New Ticket Alert', {
            body: `Ticket #${ticket._id.substring(ticket._id.length - 6)} has been created in your workspace.`
          });
        }
      });

      socket.on('ticket_urgent', (ticket) => {
        showToast(
          `Ticket #${ticket._id.substring(ticket._id.length - 6)}: ${ticket.title} needs immediate attention!`,
          'error',
          '🚨 URGENT Ticket Escalated'
        );
        if (Notification.permission === 'granted') {
          new Notification('🚨 URGENT TICKET 🚨', {
            body: `Ticket #${ticket._id.substring(ticket._id.length - 6)} has been escalated to Urgent priority!`
          });
        }
      });
    }

    // ==========================================
    // 4. CUSTOMER NOTIFICATIONS
    // ==========================================
    if (userRole === 'Customer') {
      socket.on('ticket_resolved', (ticket) => {
        showToast(
          `Your ticket "${ticket.title}" has been resolved. Click to close it.`,
          'success',
          '✅ Ticket Resolved'
        );
        if (Notification.permission === 'granted') {
          new Notification('Ticket Resolved', {
            body: `Your ticket "${ticket.title}" has been marked as resolved.`
          });
        }
      });
    }

    // ==========================================
    // CLEANUP
    // ==========================================
    return () => {
      socket.off('new_reply', handleNewReply);
      socket.off('ticket_assigned');
      socket.off('new_ticket_created');
      socket.off('ticket_urgent');
      socket.off('ticket_resolved');
    };
  }, []);

  return null; 
};

export default GlobalSocketListener;