export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignInResponse {
  accessToken: string;
  accessTokenExpiration: number;
  refreshToken: string;
  refreshTokenExpiration: number;
}

export interface SignUpRequest {
  userName: string;
  email: string;
  password: string;
  confirmPassword: string;
}
