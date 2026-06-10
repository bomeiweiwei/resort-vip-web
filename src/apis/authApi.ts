import axios from "axios";
import loginSuccess from "../mocks/login_success.json";
import type { LoginRequest, LoginResponse } from "../types/auth";

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