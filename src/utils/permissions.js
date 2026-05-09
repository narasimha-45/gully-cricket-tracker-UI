import { getDeviceId } from "./deviceId";

export function canEditMatch(match) {
  return match.ownerDeviceId === getDeviceId();
}
