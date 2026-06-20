<script setup lang="ts">
import type { PropType } from 'vue'
import type { HidDevice } from '../types.ts'

const props = defineProps({
  deviceGroups: {
    type: Object as PropType<Record<string, HidDevice[]>>,
    required: true,
  },
  usagePage: {
    type: String,
    required: true,
  },
  vendorId: {
    type: String,
    required: true,
  },
})
</script>

<template>
  <fieldset>
    <legend>HID Devices</legend>
    <div class="device-list">
      <details
        v-for="(item, key) of props.deviceGroups"
        :key="key"
      >
        <summary>{{ key }}</summary>
        <ul
          v-for="v in item"
          :key="v.path"
          :class="{ active: v.vendorId === Number(props.vendorId) && v.usagePage === Number(props.usagePage) }"
        >
          <li>{{ v }}</li>
        </ul>
      </details>
    </div>
  </fieldset>
</template>

<style scoped lang="scss">
.device-list {
  overflow-y: auto;
}

.active {
  color: red;
}
</style>
