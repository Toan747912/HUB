export interface UserDocument {
  _id: string;
  username: string;
  passwordHash: string;
  roles: string[];
  createdAt: Date;
}
