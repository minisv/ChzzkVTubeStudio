export interface ChzzkData {
  ver: string
  cmd: number
  svcid: string
  cid: string
  bdy: ChzzkBody[]
}

export interface ChzzkBody {
  msg: string
  profile: string
}

export interface ChzzkProfile {
  nickname: string
  userID: string
}
