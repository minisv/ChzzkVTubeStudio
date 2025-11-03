import { useRef, useCallback, useState } from 'react'
import type { VTSWebSocket, VTSRequest } from '../types/vtubestudio'

export const useVTubeStudio = () => {
  const vtsRef = useRef<VTSWebSocket>({
    socket: null,
    isAuthenticated: false,
    authToken: localStorage.getItem('vts_auth_token')
  })

  const [isConnected, setIsConnected] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionAttempt, setConnectionAttempt] = useState(0)
  const lastTriggerTime = useRef<Map<string, number>>(new Map())
  const COOLDOWN_MS = 1000
  const MAX_RETRY_ATTEMPTS = 5
  const RETRY_DELAY = 3000

  const handleVTSResponse = useCallback((data: any) => {
    console.log('VTubeStudio 응답:', data.messageType)

    if (data.messageType === 'AuthenticationTokenResponse') {
      const token = data.data?.authenticationToken
      if (token) {
        vtsRef.current.authToken = token
        localStorage.setItem('vts_auth_token', token)
        console.log('인증 토큰 획득 완료')
      }
    } else if (data.messageType === 'AuthenticationResponse') {
      const authenticated = data.data?.authenticated
      vtsRef.current.isAuthenticated = authenticated
      setIsAuthenticated(authenticated)
      setIsConnected(authenticated)
      if (authenticated) {
        setError(null)
        console.log('VTubeStudio 인증 성공')
      } else {
        setError('VTubeStudio 인증 실패')
      }
    }
  }, [])

  const requestVTSToken = useCallback(() => {
    const request: VTSRequest = {
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID: 'TokenRequest',
      messageType: 'AuthenticationTokenRequest',
      data: {
        pluginName: 'Chzzk Chat Item Thrower',
        pluginDeveloper: 'Your Name'
      }
    }
    console.log('토큰 요청 전송')
    vtsRef.current.socket?.send(JSON.stringify(request))
  }, [])

  const authenticateVTS = useCallback(() => {
    const request: VTSRequest = {
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID: 'AuthRequest',
      messageType: 'AuthenticationRequest',
      data: {
        pluginName: 'Chzzk Chat Item Thrower',
        pluginDeveloper: 'Your Name',
        authenticationToken: vtsRef.current.authToken
      }
    }
    console.log('인증 요청 전송')
    vtsRef.current.socket?.send(JSON.stringify(request))
  }, [])

  const connectVTubeStudio = useCallback((port: number = 8001) => {
    try {
      const wsUrl = `ws://localhost:${port}`
      console.log(`VTubeStudio 연결 시도: ${wsUrl} (시도 ${connectionAttempt + 1}/${MAX_RETRY_ATTEMPTS})`)

      const vtsSocket = new WebSocket(wsUrl)
      vtsRef.current.socket = vtsSocket

      // 연결 타임아웃 설정
      const timeoutId = setTimeout(() => {
        if (vtsSocket.readyState === WebSocket.CONNECTING) {
          console.warn('VTubeStudio 연결 타임아웃')
          vtsSocket.close()
        }
      }, 5000)

      vtsSocket.addEventListener('open', () => {
        clearTimeout(timeoutId)
        console.log('VTubeStudio WebSocket 연결됨')
        setConnectionAttempt(0) // 성공하면 시도 카운트 초기화
        setError(null)

        if (vtsRef.current.authToken) {
          authenticateVTS()
        } else {
          requestVTSToken()
        }
      })

      vtsSocket.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data)
          handleVTSResponse(data)
        } catch (err) {
          console.error('VTubeStudio 메시지 파싱 오류:', err)
        }
      })

      vtsSocket.addEventListener('close', () => {
        clearTimeout(timeoutId)
        console.log('VTubeStudio WebSocket 연결 끊김')
        setIsConnected(false)
        setIsAuthenticated(false)

        // 재시도 로직
        if (connectionAttempt < MAX_RETRY_ATTEMPTS) {
          setConnectionAttempt(prev => prev + 1)
          setTimeout(() => {
            connectVTubeStudio(port)
          }, RETRY_DELAY)
        } else {
          setError(`VTubeStudio 연결 실패. 포트 ${port}에서 VTubeStudio가 실행 중인지 확인하세요.`)
        }
      })

      vtsSocket.addEventListener('error', (err) => {
        clearTimeout(timeoutId)
        console.error('VTubeStudio WebSocket 오류:', err)
        setError(`VTubeStudio 연결 오류: ${err}`)
        setIsConnected(false)
      })
    } catch (error) {
      console.error('VTubeStudio 연결 실패:', error)
      setError('VTubeStudio 연결 설정 오류')
    }
  }, [connectionAttempt, authenticateVTS, requestVTSToken, handleVTSResponse])

  const triggerDynamicItemDrop = useCallback((emoji: string) => {
    if (!vtsRef.current.isAuthenticated || !vtsRef.current.socket) {
      console.warn('VTubeStudio 인증되지 않음. 이모지 무시:', emoji)
      return
    }

    const now = Date.now()
    const lastTime = lastTriggerTime.current.get(emoji) || 0

    if (now - lastTime < COOLDOWN_MS) {
      return
    }

    lastTriggerTime.current.set(emoji, now)

    const request: VTSRequest = {
      apiName: 'VTubeStudioPublicAPI',
      apiVersion: '1.0',
      requestID: `ItemDrop_${Date.now()}_${Math.random()}`,
      messageType: 'ItemLoadRequest',
      data: {
        fileName: `emoji_${emoji}`,
        positionX: (Math.random() - 0.5) * 100,
        positionY: (Math.random() - 0.5) * 100,
        rotation: Math.random() * 360,
        scale: 1.2,
        fadeIn: 0.3,
        lifetime: 3000,
        fadeOut: 0.5
      }
    }

    vtsRef.current.socket.send(JSON.stringify(request))
    console.log('아이템 드롭:', emoji)
  }, [])

  const disconnect = useCallback(() => {
    vtsRef.current.socket?.close()
    setIsConnected(false)
    setIsAuthenticated(false)
  }, [])

  return {
    connectVTubeStudio,
    triggerDynamicItemDrop,
    disconnect,
    isConnected,
    isAuthenticated,
    error,
    connectionAttempt
  }
}
