"use client"

import { useState, useEffect, useRef } from "react"
import { HandLandmarker, FilesetResolver } from "@mediapipe/tasks-vision"

export function useHandTracking() {
  const [rotateY, setRotateY] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isEggGesture, setIsEggGesture] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let handLandmarker: HandLandmarker
    let animationFrameId: number
    let video: HTMLVideoElement | null = null
    let active = true

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

      const startTimeMs = performance.now()
      if (video.currentTime > 0) {
        const results = handLandmarker.detectForVideo(video, startTimeMs)

        if (results.landmarks && results.landmarks.length > 0) {
          const landmarks = results.landmarks[0]
          
          const thumbTip = landmarks[4]
          const indexTip = landmarks[8]
          const middleTip = landmarks[12]
          
          // Check if ring (16) and pinky (20) are curled below PIP joints (14, 18)
          const isRingCurled = landmarks[16].y > landmarks[14].y
          const isPinkyCurled = landmarks[20].y > landmarks[18].y
          
          // Pinch distance between thumb, index, middle tips 
          const distThumbIndex = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y)
          const distIndexMiddle = Math.hypot(indexTip.x - middleTip.x, indexTip.y - middleTip.y)
          
          const isEggGrip = isRingCurled && isPinkyCurled && distThumbIndex < 0.25 && distIndexMiddle < 0.25

          if (isEggGrip) {
            setIsEggGesture(true)
            
            // X coordinate of wrist mapped to -220 scale
            // Mirrored horizontally: Hand moving right raises X. 
            const handX = landmarks[0].x 
            const targetRotation = (handX - 0.5) * -220 + 45
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
  }, [])

  return { rotateY, isReady, isEggGesture, videoRef }
}
