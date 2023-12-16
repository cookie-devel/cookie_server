import {
  AndroidConfig,
  ApnsConfig,
  Notification,
  Message,
  getMessaging,
  MessagingPayload,
  NotificationMessagePayload,
} from "firebase-admin/messaging";

import Account from "@/schemas/account.model";
import { IChatRoom } from "@/schemas/chatroom.model";

type Payload = {
  groupKey?: string;
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
};

const getApnsConfig: (payload: Payload) => ApnsConfig = (payload) => {
  return {
    headers: {
      "mutable-content": "1",
    },
    payload: {
      aps: {
        sound: "default",
        // badge: 1,
        threadId: payload.groupKey,
        alert: {
          title: payload.title,
          subtitle: payload.subtitle,
          body: payload.body,
          launchImage: payload.imageUrl,
        },
        mutableContent: true,
      },
    },
  };
};

const getAndroidConfig: (payload: Payload) => AndroidConfig = (payload) => {
  return {
    collapseKey: payload.groupKey,
    notification: {
      sound: "default",
      defaultSound: true,
      priority: "high",
      title: payload.title,
      body: payload.body,
      imageUrl: payload.imageUrl,
    },
  };
};

const getNotification: (payload: Payload) => Notification = (payload) => {
  return {
    title: payload.title,
    body: payload.body,
    imageUrl: payload.imageUrl,
  };
};

const getNotificationMessagePayload: (
  payload: Payload
) => NotificationMessagePayload = (payload) => {
  return {
    title: payload.title,
    body: payload.body,
    sound: "default",
  };
};

const pushToken = async (token: string | string[], payload: Payload) => {
  if (!token) return;

  const apns = getApnsConfig(payload);
  const android = getAndroidConfig(payload);
  const notification = getNotification(payload);

  if (typeof token === "string") {
    try {
      const response = await getMessaging().send({
        token,
        notification,
        apns,
        android,
      });
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.log("Error sending message:", error);
    }
  } else if (Array.isArray(token)) {
    try {
      const response = await getMessaging().sendEachForMulticast({
        tokens: token,
        notification,
        apns,
        android,
      });
      console.log("Successfully sent message:", response);
    } catch (error) {
      console.log("Error sending message:", error);
    }
  }
};

const pushTopic = async (topic: string, payload: Payload) => {
  const apns = getApnsConfig(payload);
  const android = getAndroidConfig(payload);
  const notification = getNotification(payload);

  try {
    const response = await getMessaging().send({
      topic,
      notification,
      apns,
      android,
    });
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.log("Error sending message:", error);
  }
};

const pushChat = async (
  roomId: string,
  members: string[],
  payload: Payload
) => {
  const tokens: string[] = (
    (
      await Account.find({
        _id: { $in: members },
      })
        .populate("deviceTokens")
        .select("deviceTokens")
        .exec()
    )
      .map((account) => account.deviceTokens)
      .flat() as any
  ).map((token) => token.token);

  const apns = getApnsConfig(payload);
  const android = getAndroidConfig(payload);
  const notification = getNotification(payload);
  try {
    const response = await getMessaging().sendEachForMulticast({
      tokens,
      notification,
      apns,
      android,
      data: {
        type: "chat",
        chatRoom: roomId,
      },
    });
    console.log("Successfully sent message:", response);
  } catch (error) {
    console.log("Error sending message:", error);
  }
};

// const pushTopic = async (topic: string, payload: Payload) => {
//   const notification = getNotificationMessagePayload(payload);
//   try {
//     const response = await getMessaging().sendToTopic(topic, {
//       notification,
//     });
//     console.log('Successfully sent message:', response);
//   } catch (error) {
//     console.log('Error sending message:', error);
//   }
// };

export { pushToken as sendPush, pushTopic as sendTopic, pushChat as sendChat };

// Two ways to send push notification
// // By User Token
// sendPush(regToken, {
//   groupKey: "cookie-server",
//   title: "Cookie Server",
//   subtitle: "Server Message",
//   body: "Server Restarted",
//   imageUrl: "https://file.mk.co.kr/meet/neds/2023/09/image_readtop_2023_711979_16950994225631775.jpg",
// });
// // By Topic
// sendTopic("cookie-server", {
//   title: "Cookie Server",
//   subtitle: "Server Message",
//   body: "Server Restarted",
//   imageUrl: "https://file.mk.co.kr/meet/neds/2023/09/image_readtop_2023_711979_16950994225631775.jpg",
// });
