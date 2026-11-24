const FEEDBACK_FLOW_PREFIX = 'innovative_science_2_feedback_flow'

export const buildFeedbackFlowKey = (sourceType = 'general', sourceKey = '') => {
  const normalizedType = String(sourceType || 'general').toLowerCase()
  const normalizedKey = String(sourceKey || '').trim() || 'global'
  return `${FEEDBACK_FLOW_PREFIX}:${normalizedType}:${normalizedKey}`
}

export const hasFeedbackFlowBeenSubmitted = (sourceType = 'general', sourceKey = '') => {
  try {
    return localStorage.getItem(buildFeedbackFlowKey(sourceType, sourceKey)) === '1'
  } catch (error) {
    return false
  }
}

export const markFeedbackFlowSubmitted = (sourceType = 'general', sourceKey = '') => {
  try {
    localStorage.setItem(buildFeedbackFlowKey(sourceType, sourceKey), '1')
  } catch (error) {
    // Ignore storage failures and keep the popup usable.
  }
}

