import type { ViewState, ViewStateObservable } from "./viewToggle";

/**
 * Views not currently visible are often expensive to update (e.g. table
 * re-rendering, map marker recalculation). This queues an `onRefresh` call
 * until `viewToggle` switches back to `activeView`, rather than doing it
 * immediately while the view is hidden.
 *
 * Returns a function to call whenever the underlying data changes; it either
 * refreshes immediately (if `activeView` is showing) or queues the refresh
 * for later.
 */
export function subscribeLazyViewRefresh(
  viewToggle: ViewStateObservable,
  activeView: ViewState,
  onRefresh: () => void,
): () => void {
  let refreshQueued = false;

  viewToggle.subscribe((view) => {
    if (view !== activeView || !refreshQueued) return;
    refreshQueued = false;
    onRefresh();
  }, `apply queued ${activeView} view refresh`);

  return () => {
    if (viewToggle.getValue() !== activeView) {
      refreshQueued = true;
      return;
    }
    onRefresh();
  };
}
