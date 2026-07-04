import { getClientId } from './clientIdentity'

export const getFeedbackClientKey = () => {
  try {
    return getClientId()
  } catch (error) {
    return getClientId()
  }
}
