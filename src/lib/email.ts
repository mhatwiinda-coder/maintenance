import emailjs from '@emailjs/browser'

const PUBLIC_KEY   = import.meta.env.VITE_EMAILJS_PUBLIC_KEY   as string
const SERVICE_ID   = import.meta.env.VITE_EMAILJS_SERVICE_ID   as string
const WELCOME_TPL  = import.meta.env.VITE_EMAILJS_TEMPLATE_WELCOME as string
const STATUS_TPL   = import.meta.env.VITE_EMAILJS_TEMPLATE_STATUS  as string

function isConfigured() {
  return PUBLIC_KEY && SERVICE_ID
}

/** Send welcome / credentials email when owner onboards a client or technician */
export async function sendWelcomeEmail(params: {
  to_email: string
  to_name: string
  role: 'Client' | 'Technician'
  login_email: string
  temp_password: string
}) {
  if (!isConfigured() || !WELCOME_TPL) {
    console.warn('[email] EmailJS not configured — skipping welcome email')
    return
  }
  try {
    await emailjs.send(SERVICE_ID, WELCOME_TPL, {
      email:         params.to_email,   // matches {{email}} in EmailJS template
      to_email:      params.to_email,   // fallback
      to_name:       params.to_name,
      role:          params.role,
      login_email:   params.login_email,
      temp_password: params.temp_password,
      app_url:       window.location.origin,
    }, PUBLIC_KEY)
    console.log('[email] Welcome email sent to', params.to_email)
  } catch (e) {
    console.warn('[email] Failed to send welcome email:', e)
  }
}

/** Send job status notification to client or technician */
export async function sendStatusEmail(params: {
  to_email: string
  to_name: string
  job_title: string
  status: 'Accepted' | 'In Progress' | 'Completed'
  message: string
  technician_name?: string
}) {
  if (!isConfigured() || !STATUS_TPL) {
    console.warn('[email] EmailJS not configured — skipping status email')
    return
  }
  try {
    await emailjs.send(SERVICE_ID, STATUS_TPL, {
      email:            params.to_email,   // matches {{email}} in EmailJS template
      to_email:         params.to_email,   // fallback
      to_name:          params.to_name,
      job_title:        params.job_title,
      status:           params.status,
      message:          params.message,
      technician_name:  params.technician_name ?? '',
      app_url:          window.location.origin,
    }, PUBLIC_KEY)
    console.log('[email] Status email sent to', params.to_email)
  } catch (e) {
    console.warn('[email] Failed to send status email:', e)
  }
}
