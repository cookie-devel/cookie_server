import { Namespace, Socket } from "socket.io";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { MapEvents } from "@/interfaces/map";
import { MapRequest } from "@/interfaces/map";
import { MapResponse } from "@/interfaces/map";
import LocationModel from "@/schemas/map/location.model";
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
      MapEvents.SendPosition,
      async ({ latitude: latitude, longitude: longitude }: MapRequest) => {
        console.log(`${socket.data.userID} ${MapEvents.SendPosition}`);
        try {
          const location = await LocationModel.create({
            latitude,
            longitude,
          });
          console.log("location", location);

          const userInfo = Account.findById(socket.data.userID);
          const friendList = (await userInfo).getFriends();
          console.log("friendList", friendList);

          socket.to(await friendList).emit(MapEvents.GetPosition, {
            sender: socket.data.userID,
            latitude: location.latitude,
            longitude: location.longitude,
          } as MapResponse);
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
