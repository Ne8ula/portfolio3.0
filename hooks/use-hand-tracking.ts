"use client"

import { useState, useEffect, useRef } from "react"
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export function useHandTracking() {
  const [rotateY, setRotateY] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isEggGesture, setIsEggGesture] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!isEnabled) {
      setIsReady(false)
      setIsEggGesture(false)
      setRotateY(null)
      return
    }

    let handLandmarker: HandLandmarker
    let animationFrameId: number
    let video: HTMLVideoElement | null = null
    let active = true
    let lastVideoTime = -1

    const initMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        )
        
        if (!active) return

        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        })

        if (!active) return

        video = document.createElement("video")
        video.playsInline = true
        videoRef.current = video

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
        
        if (!active) {
            stream.getTracks().forEach(t => t.stop())
            return
        }

        video.srcObject = stream
        video.addEventListener("loadeddata", () => {
            if (active) {
                predictWebcam()
                setIsReady(true)
            }
        })
        video.play()

      } catch (err) {
        console.error("Error initializing MediaPipe API or webcam:", err)
      }
    }

    const predictWebcam = () => {
      if (!active || !handLandmarker || !video) return

      if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime
        const startTimeMs = performance.now()
        const results = handLandmarker.detectForVideo(video, startTimeMs)

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]
          const wrist = landmarks[0]
          
          const getDist = (l1: any, l2: any) => Math.hypot(l1.x - l2.x, l1.y - l2.y)
          
          // Relaxed Egg Grip via 2D Distance Geometry: 
          // Ensure index and middle fingers are "extended" (tip further from wrist than PIP joint)
          const isIndexExtended = getDist(wrist, landmarks[8]) > getDist(wrist, landmarks[6])
          const isMiddleExtended = getDist(wrist, landmarks[12]) > getDist(wrist, landmarks[10])
          
          // Ensure ring and pinky are "curled" (tip closer to wrist than PIP joint)
          const isRingCurled = getDist(wrist, landmarks[16]) < getDist(wrist, landmarks[14])
          const isPinkyCurled = getDist(wrist, landmarks[20]) < getDist(wrist, landmarks[18])
          
          const isEggGrip = isIndexExtended && isMiddleExtended && isRingCurled && isPinkyCurled

          if (isEggGrip) {
            setIsEggGesture(true)
            
            // 1. Amplified Wrist X Position
            const handX = landmarks[0].x 
            
            // 2. 2D Twist (Middle Knuckle vs Wrist X distance)
            // Captures the wrist twist angle safely without relying on Z-depth
            const twistDeltaX = landmarks[9].x - landmarks[0].x
            
            // Combine both factors with massive amplification
            const targetRotation = (handX - 0.5) * -800 + (twistDeltaX * -2500) + 45
            setRotateY(targetRotation)
          } else {
            setIsEggGesture(false)
            setRotateY(null)
          }
        } else {
          setIsEggGesture(false)
          setRotateY(null)
        }
      }

      animationFrameId = requestAnimationFrame(predictWebcam)
    }

    initMediaPipe()

    return () => {
      active = false
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (video?.srcObject) {
        const stream = video.srcObject as MediaStream
        stream.getTracks().forEach(t => t.stop())
      }
      if (handLandmarker) handLandmarker.close()
    }
  }, [isEnabled])

  return { 
    rotateY, 
    isReady, 
    isEggGesture, 
    videoRef,
    isEnabled,
    toggleTracking: () => setIsEnabled(prev => !prev)
  }
}
