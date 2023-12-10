import { Namespace, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import * as MapType from "@/interfaces/map";
import { MapEvents } from "@/interfaces/map";

export default (
  nsp: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  nsp.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID} (${socket.data.userName}) connected to mapHandler Namespace (socketid: ${socket.id})`
    );

    socket.join(socket.data.userID);
    console.log(`Joined to ${socket.data.userID}`);

    // send location to friends
    socket.on(MapType.MapEvents.position, async (data) => {
      try {
        console.log("location", data["latitude"], data["longitude"]);
        console.log("friends", data["userid"]);

        // const userInfo = await Account.findById(socket.data.userID).exec();
        // const friendList = userInfo.friendIDs;

        data["userid"].forEach((friendID) => {
          console.log(`sending location to ${friendID}`);
          socket.to(friendID).emit(MapEvents.position, {
            userid: socket.data.userID,
            latitude: data["latitude"],
            longitude: data["longitude"],
          } as MapType.MapResponse);
        });
      } catch (error) {
        console.log(error);
      }
    });

    // request share to friend
    socket.on(
      MapType.MapEvents.requestShare,
      async ({ userid }: MapType.RequestShareRequest) => {
        console.log(`${socket.data.userID} ${MapEvents.requestShare}`);
        try {
          console.log("request share", userid);

          socket.to(userid).emit(MapEvents.requestShare, {
            userid: socket.data.userID,
          } as MapType.RequestShareResponse);
        } catch (error) {
          console.log(error);
        }
      }
    );

    nsp.on("disconnect", (socket) => {
      console.log(
        `${socket.data.userID} (${socket.data.userName}) disconnected from chatHandler Namespace (socketid: ${socket.id})`
      );
    });
  });
};
