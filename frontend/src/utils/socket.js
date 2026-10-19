import { io } from 'socket.io-client';
import { API_URL } from './api';

// One live connection to the backend, shared by the whole app
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(API_URL.replace(/\/api\/?$/, ''), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnectionDelay: 2000
    });
  }
  return socket;
};

// Fired on window whenever bookings change, so open pages can refresh
export const BOOKINGS_CHANGED = 'nmp:bookings-changed';
export const notifyBookingsChanged = (detail = {}) =>
  window.dispatchEvent(new CustomEvent(BOOKINGS_CHANGED, { detail }));
