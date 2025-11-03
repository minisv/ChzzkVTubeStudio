import { useRef, useCallback, useEffect, useState } from 'react'
import type { ChzzkData } from '../types/chzzk'

export const useChzzk = (onMessage?: (msg: string) => void) => {
  const socketRef = useRef<WebSocket | null>(null)
  const isManualCloseRef = useRef(false)
  const [chatChannelID, setChatChannelID] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // URL에서 chatChannelID 추출
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const channelID = params.get('chzzk')
    setChatChannelID(channelID)

    if (!channelID) {
      setError('chatChannelID가 없습니다. ?chzzk=CHANNEL_ID를 URL에 추가하세요.')
    }
  }, [])

  const connectWebSocket = useCallback(() => {
    if (!chatChannelID) {
      console.error('chatChannelID가 설정되지 않았습니다.')
      return
    }

    const ssID = Math.floor(Math.random() * 10) + 1
    const serverUrl = `wss://kr-ss${ssID}.chat.naver.com/chat`

    console.log('Chzzk WebSocket 연결 시도:', serverUrl)

    const socket = new WebSocket(serverUrl)
    socketRef.current = socket

    socket.addEventListener('open', () => {
      console.log('Chzzk WebSocket 연결됨')
      setIsConnected(true)
      setError(null)

      const option = {
        ver: '2',
        cmd: 100,
        svcid: 'game',
        cid: chatChannelID,
        bdy: { devType: 2001, auth: 'READ' },
        tid: 1
      }
      console.log('인증 메시지 전송:', option)
      socket.send(JSON.stringify(option))
    })

    socket.addEventListener('message', (event) => {
      try {
        const data: ChzzkData = JSON.parse(event.data)

        if (data.bdy && Symbol.iterator in Object(data.bdy)) {
          for (const body of data.bdy) {
            if (body.msg && onMessage) {
              console.log('메시지 수신:', body.msg)
              onMessage(body.msg)
            }
          }
        }

        // Ping-Pong 응답
        if (data.cmd === 0) {
          socket.send(JSON.stringify({ ver: '2', cmd: 10000 }))
        }
        if (data.cmd === 10100) {
          socket.send(JSON.stringify({ ver: '2', cmd: 0 }))
        }
      } catch (err) {
        console.error('메시지 파싱 오류:', err)
      }
    })

    socket.addEventListener('close', () => {
      console.log('Chzzk WebSocket 연결 끊김')
      setIsConnected(false)
      if (!isManualCloseRef.current) {
        console.log('3초 후 재연결 시도...')
        setTimeout(connectWebSocket, 3000)
      }
    })

    socket.addEventListener('error', (error) => {
      console.error('Chzzk WebSocket 오류:', error)
      setError('WebSocket 연결 오류')
      setIsConnected(false)
    })
  }, [chatChannelID, onMessage])

  const disconnect = useCallback(() => {
    isManualCloseRef.current = true
    socketRef.current?.close()
    setIsConnected(false)
  }, [])

  return {
    connectWebSocket,
    disconnect,
    socketRef,
    chatChannelID,
    isConnected,
    error
  }
}
