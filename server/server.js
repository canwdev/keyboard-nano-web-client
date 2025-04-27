const express = require('express');
const bodyParser = require('body-parser');
const HID = require('node-hid'); // 引入 HID 库
const app = express();
const port = 3300;

app.use(bodyParser.json());

let h;
let vendorIdS = 0x2b86;
let usagePageS = 0xffb1;

function initUsb(vendorId, usagePage) {
  const devices = HID.devices();
  let devicePath = null;

  for (let device of devices) {
    if (device.vendorId === vendorId && device.usagePage === usagePage) {
      devicePath = device.path;
      break;
    }
  }

  if (!devicePath) {
    return null
  }

  h = new HID.HID(devicePath);
  return {
    devicePath,
    h,
  }
}

function readReport(vendorId, usagePage, buffer) {
  console.log("------");
  console.log("<", buffer);

  try {
    h.write(buffer);
  } catch (error) {
    console.error("写入设备错误:", error);
    return 1; // write error
  }

  const startTime = Date.now();

  while (true) {
    try {
      const data = h.read();
      if (data.length > 0) {
        console.log(">", data);
        return data;
      }
      if (Date.now() - startTime > 3000) { // 3 seconds timeout
        return 3; // timeout
      }
    } catch (error) {
      console.error("读取数据错误:", error);
      return 2; // read error
    }
  }
}

app.get('/status', (req, res) => {
  const devices = HID.devices();
  res.json({
    isConnected: !!h,
    vendorId: vendorIdS,
    usagePage: usagePageS,
    devices
  });
});

// 初始化设备
app.post('/device_init', (req, res) => {
  let {vendor_id, usage_page} = req.body;

  vendor_id = Number(vendor_id) || vendorIdS;
  usage_page = Number(usage_page) || usagePageS;

  console.log({vendor_id, usage_page});
  const h = initUsb(vendor_id, usage_page);

  if (!h) {
    return res.status(400).json({message: 'Device not found'});
  } else {
    vendorIdS = vendor_id;
    usagePageS = usage_page;
    return res.json({
      message: "ok",
      devicePath: h.devicePath,
    });
  }
});

// 关闭设备
app.post('/device_close', (req, res) => {
  if (h) {
    h.close();
    h = null
  }
  return res.json({message: "closed"});
});

// 写入数据
app.post('/write', async (req, res) => {
  try {
    const {buffer, isRead = false} = req.body;

    if (!Array.isArray(buffer) || !buffer.length) {
      return res.status(400).json({message: "buffer is not a valid array"});
    }

    console.log('<<< write', buffer);
    await h.write(buffer);
    console.log('write success');

    if (!isRead) {
      return res.json({message: 'write success'});
    }


    try {
      console.log('start read');
      const d = h.readTimeout(3000);
      console.log('read success', d);

      if (d) {
        return res.json({data: d});
      }
    } catch (error) {
      console.error(error)
      return res.status(400).json({message: error.message});
    }

  } catch (error) {
    console.error(error);
    return res.status(400).json({message: error.message});
  }
});


function ping(vendorId = vendorIdS, usagePage = usagePageS, pageId = 4) {
  let buffer = new Array(60).fill(0);
  buffer[0] = pageId; // report_id
  buffer[1] = 0x03; // 读取/写入/复位/测试 0=r 1=w 2=reset 3=test

  console.log("------");
  console.log("<<< ping", buffer);

  let timeStart = performance.now();

  h.write(buffer);

  let data = h.readTimeout(3000);
  if (data) {
    console.log(">>> pong", data);
    let timeEnd = performance.now();
    console.log("------");
    return `Pong! ${Math.round(timeEnd - timeStart)}ms`;
  }
}

// 写入数据
app.post('/ping', (req, res) => {
  const data = ping()
  console.log(data)
  return res.json({message: data});
});
// 启动服务器
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});
