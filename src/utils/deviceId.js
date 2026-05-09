export function getDeviceId() {
  let id = localStorage.getItem("deviceId");

  if (!id) {
    id = `device_${crypto.randomUUID()}`;
    localStorage.setItem("deviceId", id);
  }

  return id;
}
