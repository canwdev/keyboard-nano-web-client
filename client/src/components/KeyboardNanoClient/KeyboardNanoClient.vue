<script lang="ts" setup>

import {computed, onMounted, ref} from "vue";
import {keyboardNanoApi} from "./utils/api.ts";
import {HidDevice} from "./types.ts";

const reportInput = ref<string>(''); // 存储用户输入的报告数据


const vendorId = ref('')
const usagePage = ref('')
const isConnected = ref(false)

const initDevice = async () => {
  await keyboardNanoApi.deviceInit({
    vendor_id: vendorId.value,
    usage_page: usagePage.value,
  });
  await getStatus()
};

const closeDevice = async () => {
  await keyboardNanoApi.deviceClose();
  await getStatus()
};

const sendHidReport = async () => {
  try {
    const report = reportInput.value.split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
    const response = await keyboardNanoApi.writeHidReport(report);
    alert(response.msg);
  } catch (error) {
    alert('发送报告失败: ' + error);
  }
};

const sendPing = async () => {
  await keyboardNanoApi.ping()
};


const deviceList = ref<HidDevice[]>([])

// 根据 product 字段对设备列表进行分组
const deviceListGroupByProduct = computed(() => {
  return deviceList.value.reduce((acc, device) => {
    const key = device.product;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(device);
    return acc;
  }, {} as Record<string, HidDevice[]>);
});

const getStatus = async () => {
  const res = await keyboardNanoApi.getStatus();

  isConnected.value = res.isConnected;
  vendorId.value = res.vendorId;
  usagePage.value = res.usagePage;
  deviceList.value = res.devices;
}

onMounted(() => {
  getStatus()
})
</script>

<template>
  <div class="keyboard-nano-client">

    <fieldset>
      <legend>设备信息</legend>

      <div class="flex-cols">
        <div class="flex-rows">
          <label>
            vendorId
            <input :disabled="isConnected" type="text" v-model="vendorId">
          </label>
          <label>
            usagePage
            <input :disabled="isConnected" type="text" v-model="usagePage">
          </label>
        </div>
        <div class="flex-rows" style="justify-content: flex-end;">
          <button @click="getStatus">Refresh</button>
          <template v-if="!isConnected">
            <button @click="initDevice">连接设备</button>
          </template>
          <template v-else>
            <button @click="closeDevice">关闭设备</button>
          </template>
        </div>
      </div>
    </fieldset>

    <fieldset v-if="isConnected">
      <legend>测试</legend>

      <button @click="sendHidReport">发送报告</button>
      <button @click="sendPing">ping</button>
      <div>
        <input v-model="reportInput" placeholder="输入报告数据（用逗号分隔）"/>
      </div>
    </fieldset>


    <fieldset>
      <legend>HID Devices</legend>
      <div class="device-list">
        <details v-for="(item, key) of deviceListGroupByProduct" :key="key">
          <summary>{{ key }}
          </summary>
          <ul
            :class="{active: v.vendorId===Number(vendorId) && v.usagePage === Number(usagePage)}"
            v-for="v in item" :key="v.path">
            <li>{{ v }}</li>
          </ul>
        </details>
      </div>
    </fieldset>


  </div>
</template>

<style lang="scss" scoped>
.keyboard-nano-client {
  max-width: 600px;
  margin: 0 auto;

  .device-list {
    overflow-y: auto;
  }

  .active {
    color: red;
  }
}
</style>
