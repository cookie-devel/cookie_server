import { IAccount } from "@/schemas/account.model";
import { ILocation } from "@/schemas/map/location.model";

export const MapEvents = {
  position: "position",
};
Object.freeze(MapEvents);

export interface SocketRequest {}
export interface SocketResponse {}

export interface MapRequest extends SocketRequest {
  latitude: ILocation["latitude"];
  longitude: ILocation["longitude"];
}

export interface MapResponse extends SocketResponse {
  userid: IAccount["_id"];
  latitude: ILocation["latitude"];
  longitude: ILocation["longitude"];
}
