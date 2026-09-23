export const VISIT_NAMESPACE = 'kuttenajith.github.io'
export const VISIT_KEY = 'goldhour'
export const VISIT_ENDPOINT = 'https://abacus.jsoncameron.dev'

const fromEnv = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY
export const WEB3FORMS_KEY =
  typeof fromEnv === 'string' && fromEnv.length > 8 ? fromEnv : 'e7e8e974-642c-411f-83ae-999cdbcdbb6e'

export const VISIT_REPLY_EMAIL = 'ajithkutten1998+goldhour@gmail.com'
