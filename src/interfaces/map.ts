import { IAccount } from "@/schemas/account.model";

interface ILocation {
  latitude: number;
  longitude: number;
}

export const MapEvents = {
  position: "position",
  requestShare: "requestShare",
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

export interface RequestShareRequest extends SocketRequest {
  userid: IAccount["_id"];
}

export interface RequestShareResponse extends SocketResponse {
  userid: IAccount["_id"];
}
