interface WeChatAccessTokenResponse {
  access_token: string
  expires_in: number
  refresh_token: string
  openid: string
  scope: string
  unionid?: string
}

interface WeChatUserInfo {
  openid: string
  nickname: string
  sex: number
  province: string
  city: string
  country: string
  headimgurl: string
  privilege: string[]
  unionid?: string
}

export class WeChatService {
  private static readonly APP_ID = process.env.WECHAT_APP_ID
  private static readonly APP_SECRET = process.env.WECHAT_APP_SECRET
  private static readonly BASE_URL = 'https://api.weixin.qq.com'

  // 获取微信授权 URL
  static getAuthUrl(redirectUri: string, state?: string): string {
    const params = new URLSearchParams({
      appid: this.APP_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'snsapi_userinfo',
      state: state || 'STATE'
    })

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`
  }

  // 通过 code 获取 access_token
  static async getAccessToken(code: string): Promise<WeChatAccessTokenResponse | null> {
    try {
      const params = new URLSearchParams({
        appid: this.APP_ID!,
        secret: this.APP_SECRET!,
        code,
        grant_type: 'authorization_code'
      })

      const response = await fetch(`${this.BASE_URL}/sns/oauth2/access_token?${params.toString()}`)
      const data = await response.json()

      if (data.errcode) {
        console.error('WeChat access token error:', data)
        return null
      }

      return data as WeChatAccessTokenResponse
    } catch (error) {
      console.error('Failed to get WeChat access token:', error)
      return null
    }
  }

  // 获取用户信息
  static async getUserInfo(accessToken: string, openid: string): Promise<WeChatUserInfo | null> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        openid,
        lang: 'zh_CN'
      })

      const response = await fetch(`${this.BASE_URL}/sns/userinfo?${params.toString()}`)
      const data = await response.json()

      if (data.errcode) {
        console.error('WeChat user info error:', data)
        return null
      }

      return data as WeChatUserInfo
    } catch (error) {
      console.error('Failed to get WeChat user info:', error)
      return null
    }
  }

  // 刷新 access_token
  static async refreshAccessToken(refreshToken: string): Promise<WeChatAccessTokenResponse | null> {
    try {
      const params = new URLSearchParams({
        appid: this.APP_ID!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })

      const response = await fetch(`${this.BASE_URL}/sns/oauth2/refresh_token?${params.toString()}`)
      const data = await response.json()

      if (data.errcode) {
        console.error('WeChat refresh token error:', data)
        return null
      }

      return data as WeChatAccessTokenResponse
    } catch (error) {
      console.error('Failed to refresh WeChat access token:', error)
      return null
    }
  }

  // 验证 access_token 是否有效
  static async validateAccessToken(accessToken: string, openid: string): Promise<boolean> {
    try {
      const params = new URLSearchParams({
        access_token: accessToken,
        openid
      })

      const response = await fetch(`${this.BASE_URL}/sns/auth?${params.toString()}`)
      const data = await response.json()

      return data.errcode === 0
    } catch (error) {
      console.error('Failed to validate WeChat access token:', error)
      return false
    }
  }
}
