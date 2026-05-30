import axios from "axios";
import profileMock from "../mocks/profile.json";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export type VipProfile = {
  name: string;
  roomName: string;
};

export const getProfile = async (): Promise<VipProfile> => {
  if (useMock) {
    return profileMock;
  }

  const response = await axios.get<VipProfile>("/api/profile");
  return response.data;
};