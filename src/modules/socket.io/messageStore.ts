interface Message {
  sender: User;
  message: string;
  time: Date;
}

interface User {
  userID: string;
  username: string;
  rooms: Room[];
}

class Room {
  roomID: string;
  users: User[] = [];
  messages: Message[] = [];

  constructor(roomID: string) {
    this.roomID = roomID;
    this.users = [];
    this.messages = [];
  }

  setUsers(users: User[]) {
    this.users = users;
  }

  addUser(user: User) {
    this.users.push(user);
  }

  addMessage(message: Message) {
    this.messages.push(message);
  }

  getMessages() {
    return this.messages;
  }
}
