import axios, { AxiosResponse } from 'axios';
import {isDev} from "@/enum";

// 设置 Axios 默认配置
const api = axios.create({
  baseURL: isDev ? '/dev_api' : '', // Node.js 服务器地址
  timeout: 10000, // 请求超时设置
});

// 响应拦截器
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data; // 只返回响应数据
  },
  (error) => {
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
  writeHidReport: async (params?: any) => {
    return await api.post('/hid_report', params);
  },
  ping: async () => {
    return await api.post('/ping', );
  },
}
