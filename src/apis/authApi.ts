import axios from "axios";
import loginSuccess from "../mocks/login_success.json";
import type { LoginRequest, LoginResponse, VipMagicLoginResponse  } from "../types/auth";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export const login = async (
    request: LoginRequest
): Promise<LoginResponse> => {
    if (useMock) {
        return loginSuccess as LoginResponse;
    }

    const response = await axios.post<LoginResponse>(
        "/api/auth/login",
        request
    );

    return response.data;
};

export const vipMagicLogin = async (
  token: string
): Promise<VipMagicLoginResponse> => {
  const response = await axios.post<VipMagicLoginResponse>(
    "/api/auth/vip-login",
    { token }
  );

  return response.data;
};