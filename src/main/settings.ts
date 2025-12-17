import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'

export interface AppSettings {
  platformOrder: number[]
  platformVisibility: boolean[]
  scrollSyncEnabled: boolean
  focusModeEnabled: boolean
}

const PLATFORM_COUNT = 5

const DEFAULT_SETTINGS: AppSettings = {
  platformOrder: [0, 1, 2, 3, 4],
  platformVisibility: [true, true, true, true, true],
  scrollSyncEnabled: true,
  focusModeEnabled: false,
}

/**
 * Validates that platformOrder is a valid permutation of indices 0 to PLATFORM_COUNT-1
 */
export function isValidPlatformOrder(order: unknown): order is number[] {
  if (!Array.isArray(order) || order.length !== PLATFORM_COUNT) return false
  const sorted = [...order].sort((a, b) => a - b)
  for (let i = 0; i < PLATFORM_COUNT; i++) {
    if (sorted[i] !== i) return false
  }
  return true
}

/**
 * Validates that platformVisibility is a boolean array with at least one true value
 */
export function isValidVisibility(visibility: unknown): visibility is boolean[] {
  if (!Array.isArray(visibility) || visibility.length !== PLATFORM_COUNT) return false
  if (!visibility.every(v => typeof v === 'boolean')) return false
  return visibility.some(v => v === true)
}

/**
 * Get the path to the settings file
 */
export function getSettingsPath(): string {
  const userDataPath = app.getPath('userData')
  return join(userDataPath, 'settings.json')
}

/**
 * Load settings from disk, returning defaults if file doesn't exist or is invalid
 */
export function loadSettings(): AppSettings {
  try {
    const settingsPath = getSettingsPath()
    if (!existsSync(settingsPath)) {
      return { ...DEFAULT_SETTINGS }
    }

    const data = readFileSync(settingsPath, 'utf-8')
    const parsed = JSON.parse(data)

    const result: AppSettings = { ...DEFAULT_SETTINGS }

    if (isValidPlatformOrder(parsed.platformOrder)) {
      result.platformOrder = parsed.platformOrder
    }

    if (isValidVisibility(parsed.platformVisibility)) {
      result.platformVisibility = parsed.platformVisibility
    }

    if (typeof parsed.scrollSyncEnabled === 'boolean') {
      result.scrollSyncEnabled = parsed.scrollSyncEnabled
    }

    if (typeof parsed.focusModeEnabled === 'boolean') {
      result.focusModeEnabled = parsed.focusModeEnabled
    }

    return result
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * Save settings to disk
 */
export function saveSettings(settings: Partial<AppSettings>): void {
  try {
    const settingsPath = getSettingsPath()
    const dir = join(settingsPath, '..')
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }

    const current = loadSettings()
    const merged: AppSettings = {
      platformOrder: settings.platformOrder ?? current.platformOrder,
      platformVisibility: settings.platformVisibility ?? current.platformVisibility,
      scrollSyncEnabled: settings.scrollSyncEnabled ?? current.scrollSyncEnabled,
      focusModeEnabled: settings.focusModeEnabled ?? current.focusModeEnabled,
    }

    // Validate before saving
    if (!isValidPlatformOrder(merged.platformOrder)) {
      merged.platformOrder = DEFAULT_SETTINGS.platformOrder
    }
    if (!isValidVisibility(merged.platformVisibility)) {
      merged.platformVisibility = DEFAULT_SETTINGS.platformVisibility
    }

    writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

export { DEFAULT_SETTINGS, PLATFORM_COUNT }
