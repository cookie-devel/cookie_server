import { User } from './User';

export interface Message {
  sender: User;
  content: string;
  time: Date;
}

export interface Room {
  id: string;
  users: User[];
  messages: Message[];
}
