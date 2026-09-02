/**
 * SkeletonPlaceholder — lightweight Suspense fallback for lazy-loaded
 * visualization components. Reuses the existing .loading-spinner style.
 */
import React from 'react';

function SkeletonPlaceholder() {
  return (
    <div className="loading-container" style={{ height: '100%' }}>
      <div className="loading-spinner" />
      <p>Loading visualization...</p>
    </div>
  );
}

export default SkeletonPlaceholder;
