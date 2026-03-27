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
          
          // Relaxed Egg Grip: 
          // Ensure index and middle fingers are "up" relative to their knuckles
          const isIndexUp = landmarks[8].y < landmarks[5].y
          const isMiddleUp = landmarks[12].y < landmarks[9].y
          
          // Ensure ring and pinky are curled (tips below PIP joints)
          const isRingCurled = landmarks[16].y > landmarks[14].y
          const isPinkyCurled = landmarks[20].y > landmarks[18].y
          
          const isEggGrip = isIndexUp && isMiddleUp && isRingCurled && isPinkyCurled

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
  }, [])

  return { rotateY, isReady, isEggGesture, videoRef }
}
