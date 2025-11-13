/**
 * Screenshot Modal Component
 * Export visualizations as PNG with watermark
 * Per PRD: Social sharing, watermarked exports, WCAG compliant
 */

import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import '../styles/ScreenshotModal.css';

function ScreenshotModal({ isOpen, onClose, activeView }) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState(null);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef(null);

  // Capture screenshot of the active visualization
  const captureScreenshot = async () => {
    setIsCapturing(true);
    setScreenshot(null);

    try {
      // Find the visualization element
      let targetElement;
      if (activeView === 'graph') {
        targetElement = document.querySelector('#graph-view');
      } else if (activeView === 'map') {
        targetElement = document.querySelector('#map-view');
      } else if (activeView === 'table') {
        targetElement = document.querySelector('#table-view');
      }

      if (!targetElement) {
        throw new Error('Visualization element not found');
      }

      // Capture the element
      const canvas = await html2canvas(targetElement, {
        backgroundColor: '#1a1a1a',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      });

      // Add watermark
      const ctx = canvas.getContext('2d');
      const watermarkHeight = 60;
      const newCanvas = document.createElement('canvas');
      newCanvas.width = canvas.width;
      newCanvas.height = canvas.height + watermarkHeight;
      const newCtx = newCanvas.getContext('2d');

      // Copy original canvas
      newCtx.fillStyle = '#1a1a1a';
      newCtx.fillRect(0, 0, newCanvas.width, newCanvas.height);
      newCtx.drawImage(canvas, 0, 0);

      // Add watermark bar
      newCtx.fillStyle = '#0f0f0f';
      newCtx.fillRect(0, canvas.height, newCanvas.width, watermarkHeight);

      // Add text
      newCtx.fillStyle = '#00d4aa';
      newCtx.font =
        'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      newCtx.fillText('EchoFootPrint', 30, canvas.height + 38);

      newCtx.fillStyle = '#666';
      newCtx.font =
        '20px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      const rightText = 'Privacy-first tracking visualization';
      const textWidth = newCtx.measureText(rightText).width;
      newCtx.fillText(
        rightText,
        newCanvas.width - textWidth - 30,
        canvas.height + 38
      );

      // Convert to data URL
      const dataUrl = newCanvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      canvasRef.current = newCanvas;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Download screenshot
  const downloadScreenshot = () => {
    if (!screenshot) return;

    const link = document.createElement('a');
    link.download = `echofootprint-${activeView}-${Date.now()}.png`;
    link.href = screenshot;
    link.click();
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    if (!canvasRef.current) return;

    try {
      canvasRef.current.toBlob(async blob => {
        if (!blob) return;

        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);

        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      alert(
        'Failed to copy to clipboard. Your browser may not support this feature.'
      );
    }
  };

  // Close modal and reset state
  const handleClose = () => {
    setScreenshot(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="screenshot-modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="screenshot-modal-title"
    >
      <div className="screenshot-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2 id="screenshot-modal-title">Export Visualization</h2>
          <button
            className="close-button"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="modal-body">
          {!screenshot && !isCapturing && (
            <div className="capture-prompt">
              <svg
                width="64"
                height="64"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="camera-icon"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <h3>
                Capture{' '}
                {activeView === 'graph'
                  ? 'Graph'
                  : activeView === 'map'
                    ? 'Map'
                    : 'Table'}{' '}
                View
              </h3>
              <p>
                Take a screenshot of your current visualization with the
                EchoFootPrint watermark.
              </p>
              <p className="privacy-note">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 1a2 2 0 0 1 2 2v4H6V3a2 2 0 0 1 2-2zm3 6V3a3 3 0 0 0-6 0v4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
                </svg>
                Screenshots are processed locally and never uploaded.
              </p>
              <button
                className="capture-button"
                onClick={captureScreenshot}
                disabled={isCapturing}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Capture Screenshot
              </button>
            </div>
          )}

          {isCapturing && (
            <div className="capturing-state">
              <div className="spinner"></div>
              <p>Capturing screenshot...</p>
            </div>
          )}

          {screenshot && (
            <div className="screenshot-preview">
              <img
                src={screenshot}
                alt="Screenshot preview"
                className="preview-image"
              />
              <div className="screenshot-actions">
                <button
                  className="action-button primary"
                  onClick={downloadScreenshot}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z" />
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z" />
                  </svg>
                  Download PNG
                </button>
                <button
                  className="action-button secondary"
                  onClick={copyToClipboard}
                  disabled={copied}
                >
                  {copied ? (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                      >
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z" />
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z" />
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>
                <button
                  className="action-button secondary"
                  onClick={() => {
                    setScreenshot(null);
                    setCopied(false);
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                  >
                    <path d="M8.086 2.207a2 2 0 0 1 2.828 0l3.879 3.879a2 2 0 0 1 0 2.828l-5.5 5.5A2 2 0 0 1 7.879 15H5.12a2 2 0 0 1-1.414-.586l-2.5-2.5a2 2 0 0 1 0-2.828l6.879-6.879zm2.121.707a1 1 0 0 0-1.414 0L4.16 7.547l5.293 5.293 4.633-4.633a1 1 0 0 0 0-1.414l-3.879-3.879zM8.746 13.547L3.453 8.254 1.914 9.793a1 1 0 0 0 0 1.414l2.5 2.5a1 1 0 0 0 .707.293H7.88a1 1 0 0 0 .707-.293l.16-.16z" />
                  </svg>
                  Retake
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScreenshotModal;
