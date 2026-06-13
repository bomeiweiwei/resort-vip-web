import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_PROXY_API,
  timeout: 10000,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("customer_access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRedirecting = false;

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      !isRedirecting
    ) {
      isRedirecting = true;

      localStorage.removeItem("customer_access_token");
      localStorage.removeItem("customer_profile");

      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);

export default apiClient;