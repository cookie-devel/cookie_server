import { Namespace, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import LocationModel from "@/schemas/map/location.model";
import * as MapType from "@/interfaces/map";
import { MapEvents } from "@/interfaces/map";
import Account from "@/schemas/account.model";

export default (
  nsp: Namespace<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>
) => {
  nsp.on("connection", (socket: Socket) => {
    console.log(
      `${socket.data.userID} (${socket.data.userName}) connected to mapHandler Namespace (socketid: ${socket.id})`
    );

    socket.join(socket.data.userID);
    console.log(`Joined to ${socket.data.userID}`);

    socket.on(
      // MapType.MapEvents.SendPosition,
      MapType.MapEvents.position,
      async ({ latitude, longitude }: MapType.MapRequest) => {
        console.log(`${socket.data.userID} ${MapEvents.position}`);
        try {
          const location = await LocationModel.create({
            latitude,
            longitude,
          });
          console.log("location", location);

          const userInfo = await Account.findById(socket.data.userID).exec();
          const friendList = userInfo.getFriends();

          // console.log("friendList", friendList);
          // socket.emit(MapEvents.position, {
          //   userid: socket.data.userID,
          //   latitude: location.latitude,
          //   longitude: location.longitude,
          // } as MapType.MapResponse);

          socket.to(await friendList).emit(MapEvents.position, {
            userid: socket.data.userID,
            latitude: location.latitude,
            longitude: location.longitude,
          } as MapType.MapResponse);
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
