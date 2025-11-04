export interface User {
  id: string;
  userName: string;
  email: string;
  emailConfirmed: boolean;
  phoneNumber: string;
  phoneNumberConfirmed: boolean;
}

export type UserRole = 'renter' | 'staff' | 'admin';

export interface UpdateUserRequest {
  userName: string;
  email: string;
  phoneNumber: string;
}
