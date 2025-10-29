export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: 'customer' | 'staff' | 'admin';
  status: 'active' | 'pending' | 'blocked';
}
