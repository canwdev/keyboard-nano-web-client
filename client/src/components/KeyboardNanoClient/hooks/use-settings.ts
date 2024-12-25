import {reactive, ref} from "vue";
import {ActionType, PAGE_ID, UnitID} from "../types.ts";

export const useSettings = ({writeData, writeDataRaw}) => {
  const settingsForm = reactive({
    keyboardMode: 0,
    ledMode: 0,
    // 按键扫描间隔，按键扫描间隔过短可能导致连击
    keyboardScanSP: 210,
    // 长按识别间隔
    keyboardLP: 1300,
    resolutionX: 0,
    resolutionY: 0,
    ledEffectMode: 0,
  })

  const keyboardModes = [
    '自定义',
    '歌曲切换',
    'osu标准模式',
    '触摸上下滑动',
    '鼠标横向移动',

    '视频控制',
    '音量调节',
    'osu懒人模式',
    '模拟Dial',
    '创作者模式1',

    '创作者模式2',
    '触摸左右滑动',
    '鼠标纵向移动',
    '系统应用',
    '页面导航',
  ];

  const ledModes = [
    "灯光组 1",
    "灯光组 2",
    "灯光组 3",
    "灯光组 4",
    "灯光组 5",
    "灯光组 6",
  ]

  const ledEffectModes = [
    "关闭",
    "按下点亮",
    "按下点亮后变暗（黑白）",
    "按下点亮后变暗（随机色彩）",
    "按下熄灭",
  ]

  const loadSettings = async () => {
    const {data} = await writeData(ActionType.READ, [UnitID.FUNC, 0], true)
    console.log('读取功能设置', data);

    settingsForm.keyboardMode = data[4]
    settingsForm.ledMode = data[7]

    settingsForm.keyboardScanSP = data[9]
    settingsForm.keyboardLP = data[10] * 100
    settingsForm.resolutionX = parseInt(data[12] * 255 + data[11])
    settingsForm.resolutionY = parseInt(data[14] * 255 + data[13])

    settingsForm.ledEffectMode = data[15]

    console.log(settingsForm);
  }

  const saveSettings = async () => {
    const buffer = new Array(60).fill(0);

    buffer[0] = PAGE_ID;
    buffer[1] = ActionType.WRITE;
    buffer[2] = UnitID.FUNC;
    buffer[3] = 0;

    buffer[4] = settingsForm.keyboardMode
    buffer[7] = settingsForm.ledMode

    buffer[9] = settingsForm.keyboardScanSP
    buffer[10] = settingsForm.keyboardLP / 100
    buffer[11] = Math.floor(settingsForm.resolutionX % 255)
    buffer[12] = Math.floor(settingsForm.resolutionX / 255)
    buffer[13] = Math.floor(settingsForm.resolutionY % 255)
    buffer[14] = Math.floor(settingsForm.resolutionY / 255)

    buffer[15] = settingsForm.ledEffectMode

    console.log('保存设置', buffer)
    await writeDataRaw(buffer)
    await loadSettings()
  }

  return {
    settingsForm,
    keyboardModes,
    ledModes,
    ledEffectModes,
    loadSettings,
    saveSettings,
  }
}