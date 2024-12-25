import axios, { AxiosResponse } from 'axios';
import {isDev} from "@/enum";
import {ref} from "vue";

export const isAxiosLoading = ref(false);

// 设置 Axios 默认配置
const api = axios.create({
  baseURL: isDev ? '/dev_api' : '', // Node.js 服务器地址
  timeout: 10000, // 请求超时设置
});

api.interceptors.request.use(
  (config) => {
    isAxiosLoading.value = true;
    return config
  },
  (error) => {
    isAxiosLoading.value = false;
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    isAxiosLoading.value = false;
    return response.data; // 只返回响应数据
  },
  (error) => {
    isAxiosLoading.value = false;

    const message = error.response?.data?.message || error.message;

    window.$notification({
      type: 'error',
      message: message,
      timeout: 5000,
    })

    // 可以在这里处理错误
    return Promise.reject(error);
  }
);

export const keyboardNanoApi = {
  getStatus: async () => {
    return await api.get('/status');
  },
  deviceInit: async (params?: any) => {
    return await api.post('/device_init', params)
  },
  deviceClose: async () => {
    return await await api.post('/device_close')
  },
  write: async (params?: any) => {
    return await api.post('/write', params);
  },
  ping: async () => {
    return await api.post('/ping', );
  },
}
