export async function runSupabaseSql(query, readOnly = false) {
  const base = process.env.SUPABASE_DASHBOARD_URL || process.env.SUPABASE_URL
  const user = process.env.DASHBOARD_USERNAME, password = process.env.DASHBOARD_PASSWORD, key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !user || !password || !key) throw new Error('Faltan credenciales administrativas de Supabase en el entorno.')
  if (new URL(base).protocol !== 'https:') throw new Error('Se requiere HTTPS.')
  const response = await fetch(`${base.replace(/\/$/,'')}/pg/query`, {
    method:'POST', headers:{Authorization:`Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`,apikey:key,'Content-Type':'application/json'},
    body:JSON.stringify({query,read_only:readOnly}), signal:AbortSignal.timeout(60000),
  })
  const body = await response.text()
  if (!response.ok) {
    let message = body.slice(0,1500)
    for (const secret of [password,key]) message = message.replaceAll(secret,'[REDACTED]')
    throw new Error(`SQL HTTP ${response.status}: ${message}`)
  }
  return body ? JSON.parse(body) : []
}

export const sqlJson = value => `'${JSON.stringify(value).replaceAll("'","''")}'::jsonb`
