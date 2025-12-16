import { net } from 'electron'

export async function checkForElectronUpdates(): Promise<string | null> {
  return new Promise((resolve) => {
    const request = net.request('https://registry.npmjs.org/electron/latest')
    
    request.on('response', (response) => {
      let data = ''
      
      response.on('data', (chunk) => {
        data += chunk.toString()
      })
      
      response.on('end', () => {
        try {
          const json = JSON.parse(data)
          resolve(json.version)
        } catch (e) {
          console.error('Failed to parse update check response:', e)
          resolve(null)
        }
      })
    })
    
    request.on('error', (error) => {
      console.error('Update check failed:', error)
      resolve(null)
    })
    
    request.end()
  })
}

export function isVersionOutdated(current: string, latest: string): boolean {
  // Simple semantic version comparison
  // If distinct major/minor/patch and latest is newer
  // For simplicity, we can assume exact match required for "latest secure"
  // but let's do a basic semver check
  if (current === latest) return false
  
  const v1 = current.split('.').map(Number)
  const v2 = latest.split('.').map(Number)
  
  for (let i = 0; i < 3; i++) {
    if (v2[i] > v1[i]) return true
    if (v2[i] < v1[i]) return false
  }
  
  return false
}
