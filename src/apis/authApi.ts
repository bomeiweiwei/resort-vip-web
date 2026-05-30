import axios from "axios";
import loginSuccess from "../mocks/login_success.json";

const useMock = import.meta.env.VITE_USE_MOCK === "true";

export type LoginRequest = {
    account: string;
    password: string;
};

export type LoginResponse = {
    token: string;
    user: {
        name: string;
        roomName: string;
        role: string;
    };
};

export const login = async (
    request: LoginRequest
): Promise<LoginResponse> => {
    if (useMock) {
        return loginSuccess;
    }

    const response = await axios.post<LoginResponse>("/api/auth/login", request);
    return response.data;
};