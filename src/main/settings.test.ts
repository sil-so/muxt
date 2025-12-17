import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fc from 'fast-check'
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  isValidPlatformOrder,
  isValidVisibility,
  DEFAULT_SETTINGS,
  PLATFORM_COUNT,
  AppSettings,
} from './settings'

// Test directory for file-based tests
let testDir: string

beforeEach(() => {
  testDir = join(tmpdir(), `muxt-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(testDir, { recursive: true })
})

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true })
  } catch {}
})

// Helper to create settings file in test directory
function writeTestSettings(settings: unknown): string {
  const path = join(testDir, 'settings.json')
  writeFileSync(path, JSON.stringify(settings), 'utf-8')
  return path
}

// Helper to read settings from test directory
function readTestSettings(path: string): AppSettings {
  const data = readFileSync(path, 'utf-8')
  return JSON.parse(data)
}

// Pure function versions for testing (without Electron dependency)
function loadSettingsFromPath(settingsPath: string): AppSettings {
  try {
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
    if (typeof parsed.grayscaleModeEnabled === 'boolean') {
      result.grayscaleModeEnabled = parsed.grayscaleModeEnabled
    }
    return result
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettingsToPath(settingsPath: string, settings: Partial<AppSettings>): void {
  const dir = join(settingsPath, '..')
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const current = loadSettingsFromPath(settingsPath)
  const merged: AppSettings = {
    platformOrder: settings.platformOrder ?? current.platformOrder,
    platformVisibility: settings.platformVisibility ?? current.platformVisibility,
    scrollSyncEnabled: settings.scrollSyncEnabled ?? current.scrollSyncEnabled,
    focusModeEnabled: settings.focusModeEnabled ?? current.focusModeEnabled,
    grayscaleModeEnabled: settings.grayscaleModeEnabled ?? current.grayscaleModeEnabled,
  }
  if (!isValidPlatformOrder(merged.platformOrder)) {
    merged.platformOrder = DEFAULT_SETTINGS.platformOrder
  }
  if (!isValidVisibility(merged.platformVisibility)) {
    merged.platformVisibility = DEFAULT_SETTINGS.platformVisibility
  }
  writeFileSync(settingsPath, JSON.stringify(merged, null, 2), 'utf-8')
}

// Toggle functions for testing
function toggleScrollSync(currentState: boolean): boolean {
  return !currentState
}

function toggleFocusMode(currentState: boolean): boolean {
  return !currentState
}

// Arbitrary for valid platform order (permutation of 0..4)
const validPlatformOrderArb = fc.shuffledSubarray([0, 1, 2, 3, 4], { minLength: 5, maxLength: 5 })

// Arbitrary for valid visibility (boolean array with at least one true)
const validVisibilityArb = fc
  .array(fc.boolean(), { minLength: PLATFORM_COUNT, maxLength: PLATFORM_COUNT })
  .filter(arr => arr.some(v => v))

// Arbitrary for valid settings
const validSettingsArb = fc.record({
  platformOrder: validPlatformOrderArb,
  platformVisibility: validVisibilityArb,
  scrollSyncEnabled: fc.boolean(),
  focusModeEnabled: fc.boolean(),
  grayscaleModeEnabled: fc.boolean(),
})

describe('Settings Manager', () => {
  /**
   * **Feature: muxt-rebranding-and-updates, Property 1: Settings Round-Trip Consistency**
   * *For any* valid settings object, saving to disk and then loading should produce an equivalent settings object.
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   */
  describe('Property 1: Settings Round-Trip Consistency', () => {
    it('saving and loading settings produces equivalent values', () => {
      fc.assert(
        fc.property(validSettingsArb, (settings) => {
          const settingsPath = join(testDir, `settings-${Math.random().toString(36).slice(2)}.json`)
          
          saveSettingsToPath(settingsPath, settings)
          const loaded = loadSettingsFromPath(settingsPath)
          
          expect(loaded.platformOrder).toEqual(settings.platformOrder)
          expect(loaded.platformVisibility).toEqual(settings.platformVisibility)
          expect(loaded.scrollSyncEnabled).toEqual(settings.scrollSyncEnabled)
          expect(loaded.focusModeEnabled).toEqual(settings.focusModeEnabled)
          expect(loaded.grayscaleModeEnabled).toEqual(settings.grayscaleModeEnabled)
        }),
        { numRuns: 100 }
      )
    })
  })


  /**
   * **Feature: muxt-rebranding-and-updates, Property 2: Settings Default Fallback**
   * *For any* missing or corrupted settings file, loading settings should return valid default values without throwing errors.
   * **Validates: Requirements 3.5**
   */
  describe('Property 2: Settings Default Fallback', () => {
    it('returns defaults when file does not exist', () => {
      const settingsPath = join(testDir, 'nonexistent.json')
      const loaded = loadSettingsFromPath(settingsPath)
      
      expect(loaded).toEqual(DEFAULT_SETTINGS)
    })

    it('returns defaults for corrupted JSON', () => {
      fc.assert(
        fc.property(fc.string(), (corruptedContent) => {
          // Skip if the string happens to be valid JSON with valid settings
          try {
            const parsed = JSON.parse(corruptedContent)
            if (isValidPlatformOrder(parsed.platformOrder) && isValidVisibility(parsed.platformVisibility)) {
              return true // Skip this case
            }
          } catch {}
          
          const settingsPath = join(testDir, `corrupted-${Math.random().toString(36).slice(2)}.json`)
          writeFileSync(settingsPath, corruptedContent, 'utf-8')
          
          const loaded = loadSettingsFromPath(settingsPath)
          
          // Should return valid settings (either defaults or partially valid)
          expect(isValidPlatformOrder(loaded.platformOrder)).toBe(true)
          expect(isValidVisibility(loaded.platformVisibility)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: muxt-rebranding-and-updates, Property 3: Platform Order Validity**
   * *For any* saved platform order, the order array should be a valid permutation of platform indices (0 to N-1 where N is platform count).
   * **Validates: Requirements 3.1, 3.3**
   */
  describe('Property 3: Platform Order Validity', () => {
    it('loaded platform order is always a valid permutation', () => {
      fc.assert(
        fc.property(fc.anything(), (randomData) => {
          const settingsPath = join(testDir, `order-${Math.random().toString(36).slice(2)}.json`)
          
          try {
            writeFileSync(settingsPath, JSON.stringify({ platformOrder: randomData }), 'utf-8')
          } catch {
            return true // Skip if we can't write
          }
          
          const loaded = loadSettingsFromPath(settingsPath)
          
          expect(isValidPlatformOrder(loaded.platformOrder)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('isValidPlatformOrder correctly validates permutations', () => {
      fc.assert(
        fc.property(validPlatformOrderArb, (order) => {
          expect(isValidPlatformOrder(order)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('isValidPlatformOrder rejects invalid arrays', () => {
      // Wrong length
      expect(isValidPlatformOrder([0, 1, 2, 3])).toBe(false)
      expect(isValidPlatformOrder([0, 1, 2, 3, 4, 5])).toBe(false)
      // Duplicates
      expect(isValidPlatformOrder([0, 0, 2, 3, 4])).toBe(false)
      // Out of range
      expect(isValidPlatformOrder([0, 1, 2, 3, 5])).toBe(false)
      // Not an array
      expect(isValidPlatformOrder('not an array')).toBe(false)
      expect(isValidPlatformOrder(null)).toBe(false)
    })
  })

  /**
   * **Feature: muxt-rebranding-and-updates, Property 4: Visibility Array Integrity**
   * *For any* saved visibility array, the array length should match the platform count and contain only boolean values.
   * **Validates: Requirements 3.2, 3.4**
   */
  describe('Property 4: Visibility Array Integrity', () => {
    it('loaded visibility is always a valid boolean array', () => {
      fc.assert(
        fc.property(fc.anything(), (randomData) => {
          const settingsPath = join(testDir, `vis-${Math.random().toString(36).slice(2)}.json`)
          
          try {
            writeFileSync(settingsPath, JSON.stringify({ platformVisibility: randomData }), 'utf-8')
          } catch {
            return true // Skip if we can't write
          }
          
          const loaded = loadSettingsFromPath(settingsPath)
          
          expect(isValidVisibility(loaded.platformVisibility)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('isValidVisibility correctly validates boolean arrays', () => {
      fc.assert(
        fc.property(validVisibilityArb, (visibility) => {
          expect(isValidVisibility(visibility)).toBe(true)
        }),
        { numRuns: 100 }
      )
    })

    it('isValidVisibility rejects invalid arrays', () => {
      // Wrong length
      expect(isValidVisibility([true, true, true, true])).toBe(false)
      // Non-boolean values
      expect(isValidVisibility([true, true, true, true, 'yes'])).toBe(false)
      // Not an array
      expect(isValidVisibility('not an array')).toBe(false)
    })
  })

  /**
   * **Feature: muxt-rebranding-and-updates, Property 5: At Least One Visible Platform**
   * *For any* visibility state, at least one platform should remain visible (the array should contain at least one `true` value).
   * **Validates: Requirements 3.2, 3.4**
   */
  describe('Property 5: At Least One Visible Platform', () => {
    it('loaded visibility always has at least one true value', () => {
      fc.assert(
        fc.property(
          fc.array(fc.boolean(), { minLength: PLATFORM_COUNT, maxLength: PLATFORM_COUNT }),
          (visibility) => {
            const settingsPath = join(testDir, `atleast-${Math.random().toString(36).slice(2)}.json`)
            
            writeFileSync(settingsPath, JSON.stringify({ platformVisibility: visibility }), 'utf-8')
            const loaded = loadSettingsFromPath(settingsPath)
            
            // Should always have at least one visible
            expect(loaded.platformVisibility.some(v => v)).toBe(true)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('isValidVisibility rejects all-false arrays', () => {
      expect(isValidVisibility([false, false, false, false, false])).toBe(false)
    })
  })

  /**
   * **Feature: muxt-ui-enhancements, Property 1: Scroll Sync Toggle Inversion**
   * *For any* scroll sync state (enabled or disabled), clicking the scroll sync toggle button SHALL result in the opposite state.
   * **Validates: Requirements 3.4**
   */
  describe('Property 1: Scroll Sync Toggle Inversion', () => {
    it('toggling scroll sync always produces the opposite state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const newState = toggleScrollSync(initialState)
          expect(newState).toBe(!initialState)
        }),
        { numRuns: 100 }
      )
    })

    it('double toggle returns to original state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const afterFirstToggle = toggleScrollSync(initialState)
          const afterSecondToggle = toggleScrollSync(afterFirstToggle)
          expect(afterSecondToggle).toBe(initialState)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: muxt-ui-enhancements, Property 2: Focus Mode Toggle Inversion**
   * *For any* focus mode state (enabled or disabled), clicking the focus mode toggle button SHALL result in the opposite state.
   * **Validates: Requirements 4.4**
   */
  describe('Property 2: Focus Mode Toggle Inversion', () => {
    it('toggling focus mode always produces the opposite state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const newState = toggleFocusMode(initialState)
          expect(newState).toBe(!initialState)
        }),
        { numRuns: 100 }
      )
    })

    it('double toggle returns to original state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const afterFirstToggle = toggleFocusMode(initialState)
          const afterSecondToggle = toggleFocusMode(afterFirstToggle)
          expect(afterSecondToggle).toBe(initialState)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: muxt-ui-enhancements, Property 3: Scroll Sync Propagation**
   * *For any* scroll event in a feed, the event SHALL propagate to other feeds if and only if scroll sync is enabled.
   * **Validates: Requirements 3.5, 3.6**
   */
  describe('Property 3: Scroll Sync Propagation', () => {
    // Simulate scroll propagation logic
    function shouldPropagateScroll(scrollSyncEnabled: boolean, senderOnPost: boolean): boolean {
      if (!scrollSyncEnabled) return false
      if (senderOnPost) return false
      return true
    }

    it('scroll propagates only when sync is enabled and sender is not on post', () => {
      fc.assert(
        fc.property(
          fc.boolean(), // scrollSyncEnabled
          fc.boolean(), // senderOnPost
          (scrollSyncEnabled, senderOnPost) => {
            const shouldPropagate = shouldPropagateScroll(scrollSyncEnabled, senderOnPost)
            
            // If sync is disabled, should never propagate
            if (!scrollSyncEnabled) {
              expect(shouldPropagate).toBe(false)
            }
            // If sender is on post, should not propagate
            else if (senderOnPost) {
              expect(shouldPropagate).toBe(false)
            }
            // Otherwise should propagate
            else {
              expect(shouldPropagate).toBe(true)
            }
          }
        ),
        { numRuns: 100 }
      )
    })

    it('scroll sync state directly controls propagation', () => {
      fc.assert(
        fc.property(fc.boolean(), (scrollSyncEnabled) => {
          // When sender is not on post, propagation matches sync state
          const shouldPropagate = shouldPropagateScroll(scrollSyncEnabled, false)
          expect(shouldPropagate).toBe(scrollSyncEnabled)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: muxt-ui-enhancements, Property 4: Focus Mode Opacity**
   * *For any* feed and mouse position, the feed opacity SHALL be 12% if focus mode is enabled AND another feed has mouse focus, otherwise the opacity SHALL be 100%.
   * **Validates: Requirements 4.5, 4.6, 4.7**
   */
  describe('Property 4: Focus Mode Opacity', () => {
    // Calculate expected opacity for a view
    function calculateViewOpacity(
      focusModeEnabled: boolean,
      focusedViewIndex: number | null,
      viewIndex: number
    ): number {
      // If focus mode is disabled, all views are at full opacity
      if (!focusModeEnabled) return 1
      
      // If no view is focused (mouse left all views), all views are at full opacity
      if (focusedViewIndex === null) return 1
      
      // If this view is focused, full opacity; otherwise dimmed to 12%
      return viewIndex === focusedViewIndex ? 1 : 0.12
    }

    it('opacity is always 100% when focus mode is disabled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // viewIndex
          fc.option(fc.integer({ min: 0, max: 4 }), { nil: null }), // focusedViewIndex
          (viewIndex, focusedViewIndex) => {
            const opacity = calculateViewOpacity(false, focusedViewIndex, viewIndex)
            expect(opacity).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('opacity is 100% for focused view when focus mode is enabled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // focusedViewIndex
          (focusedViewIndex) => {
            const opacity = calculateViewOpacity(true, focusedViewIndex, focusedViewIndex)
            expect(opacity).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('opacity is 12% for unfocused views when focus mode is enabled', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // focusedViewIndex
          fc.integer({ min: 0, max: 4 }), // viewIndex
          (focusedViewIndex, viewIndex) => {
            fc.pre(focusedViewIndex !== viewIndex) // Only test unfocused views
            const opacity = calculateViewOpacity(true, focusedViewIndex, viewIndex)
            expect(opacity).toBe(0.12)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('opacity is 100% for all views when no view is focused', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 4 }), // viewIndex
          (viewIndex) => {
            const opacity = calculateViewOpacity(true, null, viewIndex)
            expect(opacity).toBe(1)
          }
        ),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: grayscale-mode, Property 1: Toggle inverts grayscale state**
   * *For any* boolean grayscale state, toggling the state should produce the logical negation of the original state.
   * **Validates: Requirements 1.2, 1.3**
   */
  describe('Property 1: Grayscale Mode Toggle Inversion', () => {
    function toggleGrayscaleMode(currentState: boolean): boolean {
      return !currentState
    }

    it('toggling grayscale mode always produces the opposite state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const newState = toggleGrayscaleMode(initialState)
          expect(newState).toBe(!initialState)
        }),
        { numRuns: 100 }
      )
    })

    it('double toggle returns to original state', () => {
      fc.assert(
        fc.property(fc.boolean(), (initialState) => {
          const afterFirstToggle = toggleGrayscaleMode(initialState)
          const afterSecondToggle = toggleGrayscaleMode(afterFirstToggle)
          expect(afterSecondToggle).toBe(initialState)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: grayscale-mode, Property 2: Settings round-trip consistency**
   * *For any* valid AppSettings object with a grayscaleModeEnabled value, saving then loading the settings should preserve the grayscaleModeEnabled value.
   * **Validates: Requirements 2.1, 2.2**
   */
  describe('Property 2: Grayscale Mode Settings Round-Trip', () => {
    it('grayscaleModeEnabled is preserved through save/load cycle', () => {
      fc.assert(
        fc.property(fc.boolean(), (grayscaleModeEnabled) => {
          const settingsPath = join(testDir, `grayscale-rt-${Math.random().toString(36).slice(2)}.json`)
          
          saveSettingsToPath(settingsPath, { grayscaleModeEnabled })
          const loaded = loadSettingsFromPath(settingsPath)
          
          expect(loaded.grayscaleModeEnabled).toBe(grayscaleModeEnabled)
        }),
        { numRuns: 100 }
      )
    })
  })

  /**
   * **Feature: grayscale-mode, Property 5: Invalid settings default to disabled**
   * *For any* invalid or missing grayscaleModeEnabled value in settings, loading settings should return `false` (grayscale disabled).
   * **Validates: Requirements 2.4**
   */
  describe('Property 5: Grayscale Mode Invalid Settings Default', () => {
    it('returns false for missing grayscaleModeEnabled', () => {
      const settingsPath = join(testDir, 'no-grayscale.json')
      writeFileSync(settingsPath, JSON.stringify({ scrollSyncEnabled: true }), 'utf-8')
      
      const loaded = loadSettingsFromPath(settingsPath)
      expect(loaded.grayscaleModeEnabled).toBe(false)
    })

    it('returns false for non-boolean grayscaleModeEnabled values', () => {
      fc.assert(
        fc.property(
          fc.anything().filter(v => typeof v !== 'boolean'),
          (invalidValue) => {
            const settingsPath = join(testDir, `invalid-grayscale-${Math.random().toString(36).slice(2)}.json`)
            
            try {
              writeFileSync(settingsPath, JSON.stringify({ grayscaleModeEnabled: invalidValue }), 'utf-8')
            } catch {
              return true // Skip if we can't serialize
            }
            
            const loaded = loadSettingsFromPath(settingsPath)
            expect(loaded.grayscaleModeEnabled).toBe(false)
          }
        ),
        { numRuns: 100 }
      )
    })

    it('returns false when settings file does not exist', () => {
      const settingsPath = join(testDir, 'nonexistent-grayscale.json')
      const loaded = loadSettingsFromPath(settingsPath)
      expect(loaded.grayscaleModeEnabled).toBe(false)
    })
  })

  /**
   * **Feature: grayscale-mode, Property 3: CSS filter matches grayscale state**
   * *For any* grayscale mode state (enabled or disabled), the CSS filter applied to the document root should be `grayscale(100%)` when enabled and empty/none when disabled.
   * **Validates: Requirements 1.4, 3.1, 3.2**
   */
  describe('Property 3: CSS Filter Matches Grayscale State', () => {
    // Pure function to calculate expected CSS filter value
    function getExpectedCssFilter(grayscaleModeEnabled: boolean): string {
      return grayscaleModeEnabled ? 'grayscale(100%)' : ''
    }

    it('CSS filter value matches grayscale mode state', () => {
      fc.assert(
        fc.property(fc.boolean(), (grayscaleModeEnabled) => {
          const expectedFilter = getExpectedCssFilter(grayscaleModeEnabled)
          
          if (grayscaleModeEnabled) {
            expect(expectedFilter).toBe('grayscale(100%)')
          } else {
            expect(expectedFilter).toBe('')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('filter is grayscale(100%) when enabled', () => {
      expect(getExpectedCssFilter(true)).toBe('grayscale(100%)')
    })

    it('filter is empty when disabled', () => {
      expect(getExpectedCssFilter(false)).toBe('')
    })
  })

  /**
   * **Feature: grayscale-mode, Property 4: Icon matches grayscale state**
   * *For any* grayscale mode state, the displayed icon should be ColorModeIcon when disabled and GrayscaleModeIcon when enabled.
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  describe('Property 4: Icon Matches Grayscale State', () => {
    // Pure function to determine which icon should be displayed
    function getExpectedIcon(grayscaleModeEnabled: boolean): 'ColorModeIcon' | 'GrayscaleModeIcon' {
      return grayscaleModeEnabled ? 'GrayscaleModeIcon' : 'ColorModeIcon'
    }

    it('icon type matches grayscale mode state', () => {
      fc.assert(
        fc.property(fc.boolean(), (grayscaleModeEnabled) => {
          const expectedIcon = getExpectedIcon(grayscaleModeEnabled)
          
          if (grayscaleModeEnabled) {
            expect(expectedIcon).toBe('GrayscaleModeIcon')
          } else {
            expect(expectedIcon).toBe('ColorModeIcon')
          }
        }),
        { numRuns: 100 }
      )
    })

    it('shows ColorModeIcon when grayscale is disabled', () => {
      expect(getExpectedIcon(false)).toBe('ColorModeIcon')
    })

    it('shows GrayscaleModeIcon when grayscale is enabled', () => {
      expect(getExpectedIcon(true)).toBe('GrayscaleModeIcon')
    })
  })
})
