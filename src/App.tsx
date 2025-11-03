import { useEffect, useCallback } from 'react'
import { useChzzk } from './hooks/useChzzk'
import { useVTubeStudio } from './hooks/useVTubeStudio'
import './App.css'

function App() {
  const {
    connectVTubeStudio,
    triggerDynamicItemDrop,
    isConnected: vtsConnected,
    isAuthenticated: vtsAuthenticated,
    error: vtsError,
    connectionAttempt
  } = useVTubeStudio()

  const handleMessage = useCallback((msg: string) => {
    // 이모지 정규식
    const emojiRegex = /\p{Emoji}/ug
    const emojis = msg.match(emojiRegex)

    if (emojis && emojis.length > 0) {
      console.log('감지된 이모지:', emojis)
      emojis.forEach(emoji => {
        triggerDynamicItemDrop(emoji)
      })
    }
  }, [triggerDynamicItemDrop])

  const {
    connectWebSocket,
    chatChannelID,
    isConnected: chzzkConnected,
    error: chzzkError
  } = useChzzk(handleMessage)

  // VTubeStudio 먼저 연결
  useEffect(() => {
    console.log('VTubeStudio 연결 시작...')
    connectVTubeStudio()
  }, [connectVTubeStudio])

  // chatChannelID가 설정된 후 Chzzk 연결
  useEffect(() => {
    if (chatChannelID) {
      console.log('Chzzk 연결 시작...')
      connectWebSocket()
    }
  }, [chatChannelID, connectWebSocket])

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎮 Chzzk VTubeStudio Item Thrower</h1>

        <div className="status-container">
          <div className={`status ${vtsAuthenticated ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <div>
              <p className="status-title">VTubeStudio</p>
              <p className="status-text">
                {vtsError ? `❌ ${vtsError}` : vtsAuthenticated ? '✅ 인증 완료' : vtsConnected ? '⏳ 인증 대기 중' : `⏳ 연결 중... (${connectionAttempt}/5)`}
              </p>
            </div>
          </div>

          <div className={`status ${chzzkConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            <div>
              <p className="status-title">Chzzk Chat</p>
              <p className="status-text">
                {chzzkError ? `❌ ${chzzkError}` : chzzkConnected ? '✅ 연결됨' : '⏳ 대기 중'}
              </p>
            </div>
          </div>
        </div>

        {chatChannelID && (
          <p className="channel-info">채널 ID: {chatChannelID}</p>
        )}

        <p className="guide-text">
          URL에 <code>?chzzk=CHANNEL_ID</code>를 추가해주세요
        </p>
      </header>
    </div>
  )
}

export default App
