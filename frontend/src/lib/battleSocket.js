import { io } from 'socket.io-client'
import { API_BASE_URL } from '../api'

export const createBattleSocket = (token) =>
  io(API_BASE_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 3000,
    auth: { token },
  })

