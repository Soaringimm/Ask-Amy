// ─── Named constants (replaces magic numbers) ─────────────────────────────

// PiP dimensions
export const PIP_W = 224
export const PIP_H = 160
export const PIP_MARGIN = 16
export const PIP_MIN_W = 120
export const PIP_MIN_H = 86
export const PIP_MAX_W = 448
export const PIP_MAX_H = 320
export const PIP_BAR_W = 100
export const PIP_BAR_H = 32
export const PIP_RATIO = PIP_W / PIP_H

// Timeouts (ms)
export const COPY_FEEDBACK_TIMEOUT = 2000
export const ERROR_DISMISS_TIMEOUT = 3000
export const PROCESSING_ERROR_DISMISS_TIMEOUT = 5000
export const POLLING_INTERVAL = 3000
export const POLLING_MAX_RETRIES = 60 // 60 * 3s = 3 minutes max
export const YT_IGNORE_STATE_DELAY = 500
export const YT_TIME_UPDATE_INTERVAL = 500
export const RECORDING_TIMER_INTERVAL = 500
export const MUSIC_RESTART_THRESHOLD = 3 // seconds before restart vs prev track

// Signal server
export const SIGNAL_URL = window.location.origin

// Video resolutions
export const RESOLUTIONS = {
  sd: { width: 640, height: 480 },
  hd: { width: 1280, height: 720 },
  fhd: { width: 1920, height: 1080 },
}

// YT playback rates
export const YT_PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]
