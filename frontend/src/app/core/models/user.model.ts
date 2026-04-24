export interface AppUser {
  uid: string;
  email: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  geboortedatum?: string;
}
