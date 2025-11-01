export interface User {
  id: string;
  userName: string;
  email: string;
  emailConfirmed: boolean;
  phoneNumber: string;
  phoneNumberConfirmed: boolean;
  role: UserRole;
}

export type UserRole = 'customer' | 'staff' | 'admin';

export interface UpdateUserRequest {
  userName: string;
  email: string;
  phoneNumber: string;
}
