<script lang="ts">
import {defineComponent, PropType} from 'vue'
import {useVModel} from '@vueuse/core'
type TabItem = {
  label?: string
  value: string | number
  title?: string
  render?: any
}

export default defineComponent({
  name: 'TabLayout',
  props: {
    modelValue: {
      type: [String, Number],
      required: true,
    },
    horizontal: {
      type: Boolean,
      default: false,
    },
    options: {
      type: Array as PropType<TabItem[]>,
      default() {
        return []
      },
    },
  },
  setup(props, {emit}) {
    const mValue = useVModel(props, 'modelValue', emit)
    return {
      mValue,
    }
  },
})
</script>

<template>
  <div class="mc-vertical-tab-layout vp-bg" :class="{horizontal}">
    <div class="sidebar-wrap">
      <div class="mc-tab-list">
        <div
          v-for="item in options"
          :key="item.value"
          :class="{active: item.value === mValue}"
          @click="mValue = item.value"
          class="list-item"
          :title="item.title"
        >
          <div v-if="item.label" class="item-text">{{ item.label }}</div>
        </div>
      </div>

      <slot name="sidebar"></slot>
    </div>
    <div class="content-wrap">
      <slot></slot>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.mc-vertical-tab-layout {
  display: flex;
  align-items: center;
  height: 100%;
  overflow: hidden;
  line-height: 1.6;
  $color_border: #9c9c9c;

  .sidebar-wrap {
    width: 120px;
    height: 100%;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border: 1px solid $color_border;
    border-bottom: none;
    border-radius: 5px 5px 0 0;

    .mc-tab-list {
      overflow: hidden;
      flex: 1;
      .list-item {
        padding: 4px 8px;
        transition: background-color 0.3s;
        cursor: pointer;
        border-radius: 4px 4px 0 0;

        &:hover {
          background-color: rgba(95, 95, 95, 0.1);
        }

        &.active {
          background-color: rgb(73, 73, 73);
          color: white;
        }

        .item-text {
        }
      }
    }
  }

  &.horizontal {
    overflow: unset;
    justify-content: flex-start;
    flex-direction: column;

    .sidebar-wrap {
      min-width: fit-content;
      height: auto;
      overflow: hidden;
      width: 100%;
      .mc-tab-list {
        display: flex;
        .list-item {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          padding: 4px 16px;
        }
      }
    }
    .content-wrap {
      width: 100%;
      padding: 10px;
      border: 1px solid $color_border;
    }
  }

  .content-wrap {
    flex: 1;
    overflow-y: auto;
    height: 100%;
  }
}
</style>
