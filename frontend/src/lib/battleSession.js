const BATTLE_SESSION_KEY = 'innovative_science_2_battle_session'

export const battleSessionEvents = {
  changed: 'innovative-science-battle-session-changed',
}

export const getBattleSession = () => {
  try {
    const savedSession = JSON.parse(localStorage.getItem(BATTLE_SESSION_KEY) || 'null')

    if (!savedSession?.roomCode || !savedSession?.status) {
      localStorage.removeItem(BATTLE_SESSION_KEY)
      return null
    }

    return savedSession
  } catch (error) {
    localStorage.removeItem(BATTLE_SESSION_KEY)
    return null
  }
}

export const saveBattleSession = (session) => {
  const nextSession = {
    roomCode: String(session?.roomCode || '').trim().toUpperCase(),
    roomId: String(session?.roomId || '').trim(),
    status: String(session?.status || 'lobby'),
    route: String(session?.route || 'lobby'),
    updatedAt: Date.now(),
  }

  if (!nextSession.roomCode) {
    return null
  }

  localStorage.setItem(BATTLE_SESSION_KEY, JSON.stringify(nextSession))
  window.dispatchEvent(new CustomEvent(battleSessionEvents.changed, { detail: nextSession }))
  return nextSession
}

export const clearBattleSession = () => {
  localStorage.removeItem(BATTLE_SESSION_KEY)
  window.dispatchEvent(new CustomEvent(battleSessionEvents.changed))
}

export const getBattleSessionRoute = (session) => {
  if (!session?.roomCode) {
    return ''
  }

  return `/battle-mode/room/${session.roomCode}/${session.route || 'lobby'}`
}

