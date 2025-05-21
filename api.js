import axios from "axios";

export function createPike13Client(token) {
  return axios.create({
    baseURL: "https://method3fitness.pike13.com/api/v2",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}

export function createReportingClient(token) {
  return axios.create({
    baseURL: "https://method3fitness.pike13.com/desk/api/v3",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
}
