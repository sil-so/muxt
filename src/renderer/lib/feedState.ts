/**
 * Pure functions for feed state management
 * These functions handle visibility, splits, and layout calculations
 */

/**
 * Calculate equal split positions for N visible feeds
 * For N feeds, we need N-1 split positions
 * @param visibleCount Number of visible feeds
 * @returns Array of split percentages (e.g., [25, 50, 75] for 4 feeds)
 */
export function calculateEqualSplits(visibleCount: number): number[] {
  if (visibleCount <= 1) return []
  const splits: number[] = []
  for (let i = 1; i < visibleCount; i++) {
    splits.push((i / visibleCount) * 100)
  }
  return splits
}

/**
 * Toggle visibility of a feed at the given index
 * Prevents hiding the last visible feed
 * @param visibility Current visibility array
 * @param index Index of feed to toggle
 * @returns New visibility array (or same array if toggle not allowed)
 */
export function toggleVisibility(visibility: boolean[], index: number): boolean[] {
  if (index < 0 || index >= visibility.length) return visibility
  
  // If trying to hide and it's the last visible, don't allow
  if (visibility[index] && !canHide(visibility, index)) {
    return visibility
  }
  
  const newVisibility = [...visibility]
  newVisibility[index] = !newVisibility[index]
  return newVisibility
}

/**
 * Get count of visible feeds
 * @param visibility Visibility array
 * @returns Number of visible feeds
 */
export function getVisibleCount(visibility: boolean[]): number {
  return visibility.filter(v => v).length
}

/**
 * Check if a feed can be hidden (at least one other must remain visible)
 * @param visibility Current visibility array
 * @param index Index of feed to potentially hide
 * @returns true if the feed can be hidden
 */
export function canHide(visibility: boolean[], index: number): boolean {
  if (index < 0 || index >= visibility.length) return false
  if (!visibility[index]) return true // Already hidden, can "hide" again (no-op)
  
  const visibleCount = getVisibleCount(visibility)
  return visibleCount > 1
}

/**
 * Calculate column widths from split positions
 * @param splits Array of split percentages
 * @returns Array of column width percentages
 */
export function calculateColumnWidths(splits: number[]): number[] {
  if (splits.length === 0) return [100]
  
  const widths: number[] = []
  const allPositions = [0, ...splits, 100]
  
  for (let i = 0; i < allPositions.length - 1; i++) {
    widths.push(allPositions[i + 1] - allPositions[i])
  }
  
  return widths
}

/**
 * Validate that all column widths meet minimum constraint
 * @param splits Array of split percentages
 * @param minWidth Minimum width percentage (default 10%)
 * @returns true if all columns meet minimum width
 */
export function validateMinimumWidths(splits: number[], minWidth: number = 10): boolean {
  const widths = calculateColumnWidths(splits)
  return widths.every(w => w >= minWidth)
}

/**
 * Get the number of resize handles needed for visible feeds
 * @param visibleCount Number of visible feeds
 * @returns Number of resize handles (visibleCount - 1, minimum 0)
 */
export function getResizeHandleCount(visibleCount: number): number {
  return Math.max(0, visibleCount - 1)
}

/**
 * Check if a reorder operation produces a valid permutation
 * @param order The new order array
 * @param platformCount Total number of platforms
 * @returns true if order is a valid permutation
 */
export function isValidPermutation(order: number[], platformCount: number): boolean {
  if (order.length !== platformCount) return false
  
  const seen = new Set<number>()
  for (const idx of order) {
    if (idx < 0 || idx >= platformCount || seen.has(idx)) {
      return false
    }
    seen.add(idx)
  }
  
  return seen.size === platformCount
}

/**
 * Get indices of visible platforms in display order
 * @param order Platform order array
 * @param visibility Visibility array
 * @returns Array of platform indices that are visible, in display order
 */
export function getVisiblePlatformIndices(order: number[], visibility: boolean[]): number[] {
  return order.filter(idx => visibility[idx])
}
