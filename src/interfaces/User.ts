export interface User {
  userID: string;
  username: string;
  rooms: Room[] | undefined;
}
