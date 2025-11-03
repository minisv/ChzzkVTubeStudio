export interface VTSWebSocket {
  socket: WebSocket | null
  isAuthenticated: boolean
  authToken: string | null
}

export interface VTSRequest {
  apiName: string
  apiVersion: string
  requestID: string
  messageType: string
  data: Record<string, any>
}
