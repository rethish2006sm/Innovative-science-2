export const NAME_PATTERN = /^\p{L}[\p{L}\p{M}]*(?: +\p{L}[\p{L}\p{M}]*)*$/u

export const isValidName = (value = '') => NAME_PATTERN.test(String(value).trim())

export const NAME_VALIDATION_MESSAGE = 'Name can contain letters and spaces only.'
