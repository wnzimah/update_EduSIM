const browserHost = typeof window !== "undefined" ? window.location.hostname : "localhost";
const browserProtocol = typeof window !== "undefined" ? window.location.protocol : "http:";

export const environment = {
  production: false,
  apiBaseUrl: `${browserProtocol}//${browserHost}:8080/api`
};
