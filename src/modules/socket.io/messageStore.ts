interface Message {
  sender: User;
  message: string;
  time: Date;
}

interface Room {
    id: string;
    users: User[];
    messages: Message[];
}

interface User {
  userID: string;
  username: string;
  rooms: Room[];
}

class Chat {
    user: User | null = null;
    
    constructor(user: User) {
        this.user = user;
    }
    
    addUser(room: Room, user: User) {
        room.users.push(user);
    }
    
    addRoom(room: Room) {
        if (this.user === null) throw new Error("User is null");
        this.user.rooms.push(room);
    }

    addMessage(room: Room, message: Message) {
        room.messages.push(message);
    }

    getMessages(room: Room) {
        return room.messages;
    }
}
