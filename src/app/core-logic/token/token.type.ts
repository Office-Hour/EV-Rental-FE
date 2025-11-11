export interface Token {
  token: string;
  expiration: Date;
}

export interface TokenInfo {
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  Renter?: boolean;
  Admin?: boolean;
  Staff?: boolean;
  StaffId?: string;
  RenterId?: string;
}
