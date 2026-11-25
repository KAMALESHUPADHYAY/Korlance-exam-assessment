export type ProctorStatus =
  | "INITIALIZING"
  | "OK"
  | "NO_FACE"
  | "MULTIPLE_FACES"
  | "LOOKING_AWAY"
  | "CAMERA_BLOCKED"
  | "UNSUPPORTED";

export interface FaceAnalysisResult {
  status: ProctorStatus;
  faceCount: number;
  direction?: "LEFT" | "RIGHT" | "DOWN";
}

interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

interface FaceLandmarkerLike {
  detectForVideo: (
    video: HTMLVideoElement,
    timestampMs: number
  ) => { faceLandmarks: NormalizedLandmark[][] };
  close: () => void;
}

/**
 * Loads MediaPipe FaceLandmarker strictly in-browser (no video leaves device).
 */
export async function createInBrowserFaceLandmarker(): Promise<FaceLandmarkerLike> {
  const vision = await import("@mediapipe/tasks-vision");
  const { FaceLandmarker, FilesetResolver } = vision;

  // Prefer local WASM if available, fallback to official CDN
  const wasmPath = "/mediapipe/wasm";
  let resolver;
  try {
    const check = await fetch(`${wasmPath}/vision_wasm_internal.js`, {
      method: "HEAD",
    });
    resolver = await FilesetResolver.forVisionTasks(
      check.ok
        ? wasmPath
        : "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    );
  } catch {
    resolver = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
    );
  }

  const localModel = "/mediapipe/face_landmarker.task";
  let modelAssetPath =
    "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
  try {
    const modelCheck = await fetch(localModel, { method: "HEAD" });
    if (modelCheck.ok) {
      modelAssetPath = localModel;
    }
  } catch {
    // Use CDN model URL
  }

  try {
    return await FaceLandmarker.createFromOptions(resolver, {
      baseOptions: { modelAssetPath, delegate: "GPU" },
      runningMode: "VIDEO",
      numFaces: 3,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  } catch {
    // Graceful CPU fallback for browsers without WebGL/GPU delegate
    return await FaceLandmarker.createFromOptions(resolver, {
      baseOptions: { modelAssetPath, delegate: "CPU" },
      runningMode: "VIDEO",
      numFaces: 3,
      minFaceDetectionConfidence: 0.5,
      minFacePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
  }
}

/**
 * Checks whether a video frame is pitch-black / physically covered.
 */
export function isFrameBlockedOrDark(
  video: HTMLVideoElement,
  scratchCanvas: HTMLCanvasElement
): boolean {
  if (video.readyState < 2 || video.videoWidth === 0) return false;
  scratchCanvas.width = 32;
  scratchCanvas.height = 24;
  const ctx = scratchCanvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  ctx.drawImage(video, 0, 0, 32, 24);
  const { data } = ctx.getImageData(0, 0, 32, 24);

  let sum = 0;
  let sumSq = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    sum += luma;
    sumSq += luma * luma;
  }
  const mean = sum / pixels;
  const variance = sumSq / pixels - mean * mean;
  return mean < 10 || variance < 6;
}

/**
 * Evaluates face count and head pose (looking left, right, or down).
 */
export function analyzeFaceLandmarks(
  landmarker: FaceLandmarkerLike,
  video: HTMLVideoElement,
  timestampMs: number
): FaceAnalysisResult {
  const res = landmarker.detectForVideo(video, timestampMs);
  const faces = res.faceLandmarks ?? [];

  if (faces.length === 0) {
    return { status: "NO_FACE", faceCount: 0 };
  }

  if (faces.length > 1) {
    return { status: "MULTIPLE_FACES", faceCount: faces.length };
  }

  const lm = faces[0];
  const nose = lm[1];
  const leftCheek = lm[234];
  const rightCheek = lm[454];
  const forehead = lm[10];
  const chin = lm[152];
  const bridge = lm[168];

  if (!nose || !leftCheek || !rightCheek || !forehead || !chin || !bridge) {
    return { status: "OK", faceCount: 1 };
  }

  const faceWidth = Math.max(0.01, Math.abs(rightCheek.x - leftCheek.x));
  const centerX = (leftCheek.x + rightCheek.x) / 2;
  const yawOffset = (nose.x - centerX) / faceWidth;

  if (yawOffset > 0.21) {
    return { status: "LOOKING_AWAY", faceCount: 1, direction: "LEFT" };
  }
  if (yawOffset < -0.21) {
    return { status: "LOOKING_AWAY", faceCount: 1, direction: "RIGHT" };
  }

  const faceHeight = Math.max(0.01, Math.abs(chin.y - forehead.y));
  const noseDropRatio = (nose.y - bridge.y) / faceHeight;
  if (noseDropRatio > 0.34) {
    return { status: "LOOKING_AWAY", faceCount: 1, direction: "DOWN" };
  }

  return { status: "OK", faceCount: 1 };
}
