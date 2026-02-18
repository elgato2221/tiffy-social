export interface UserProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string | null;
  avatar: string | null;
  gender: string;
  role: string;
  coins: number;
  online: boolean;
  createdAt: string;
  _count?: {
    videos: number;
    likes: number;
  };
}

export interface VideoWithUser {
  id: string;
  url: string;
  thumbnail: string | null;
  caption: string | null;
  duration: number;
  views: number;
  userId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  likes: { userId: string }[];
  _count: {
    likes: number;
  };
}

export interface MessageWithUsers {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  cost: number;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    name: string;
    avatar: string | null;
  };
  receiver: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface Conversation {
  user: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    online: boolean;
  };
  lastMessage: {
    content: string;
    createdAt: string;
    senderId: string;
  };
  unreadCount: number;
}

export interface TransactionItem {
  id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
}
