// pages/deviceDetail/deviceDetail.js
var WW_CHARACTERISTIC_READ = "FFF2"    //上报通知数据特征值
var WW_CHARACTERISTIC_WRITE = "FFF1"    //写数据特征值
let WW_CHARACTERISTIC_BATTERY = "2A19"    //电池电量特征值
let WW_CHARACTERISTIC_FIRMWARE = "2A28"    //固件版本号

/** 禁止固件发送配对请求 */
let WenDevcieForbitPaired = [0x04, 0x8D, 0x80, 0xEF]
/** 查询固件版本命令 */
let WenQueryFirmware = [0x04, 0x80, 0x02, 0x7A]
/** 查询电池电量 */
let WenQueryBattery = [0x04, 0x81, 0x02, 0x79]

var deviceId = ""

var readServiceUUID = ""
var readCharacteristicsUUID = ""
var writeServiceUUID = ""
var writeCharacteristicsUUID = ""

// 工具类提供的方法
var wxutil = require('../../utils/util.js');
var util = require('../../utils/wenUtil.js');
var wxbarcode = require('../../utils/wxbarcode.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    functionDesc: "请核对以上信息是否正确",
    testTotal: 0,
    okTotal: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    deviceId = options.deviceId
    var device = JSON.parse(options.device)
    console.log("设备信息", device)

    // 生成条形码
    wxbarcode.barcode('barcode', device.serialNumberPrefix + device.serialNumber + device.serialNumberSuffix, 600, 80);

    var that = this

    that.setData({
      device: device
    })

    // 监听回调
    wx.onBLECharacteristicValueChange(function (res) {
      that.analyseCharacteristic(res)
    })

    wx.getBLEDeviceServices({
      deviceId: deviceId,
      success: function (res) {
        console.log('device services:', res.services)

        for (var i = 0; i < res.services.length; i++) {
          var item = res.services[i]
          // 循环服务拿特性
          that.analyseDeviceService(item.uuid)
        }
      },
    })


  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    var that = this

    // 拿缓存数据并且显示
    var testTotal = wx.getStorageSync('testTotal')
    var okTotal = wx.getStorageSync('okTotal')
    var oklv = testTotal > 0 ? (okTotal * 100 / testTotal).toFixed(2) : 0

    that.setData({
      testTotal: testTotal,
      okTotal: okTotal,
      oklv: oklv
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 清空定时器
    console.log("ledTimer", ledTimer)
    clearInterval(ledTimer);
    okIndex = 0

    // 断开连接
    wx.closeBLEConnection({
      deviceId: deviceId,
      success: function (res) {

      },
    })
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {

  },

  /**
   * 获得服务的特性
   */
  analyseDeviceService: function (serviceId) {
    var that = this

    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: serviceId,
      success: function (res) {
        // 解析特性
        for (var i = 0; i < res.characteristics.length; i++) {
          var item = res.characteristics[i]

          if ((item.uuid.indexOf(WW_CHARACTERISTIC_BATTERY) >= 0)) {
            // 电池电量上报
            wx.notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: serviceId,
              characteristicId: item.uuid,
              state: true,
              success: function (res) {
                // 度的特性开启通知上报
                console.log("开启电池上报", res)
              },
            })
          } else if (item.uuid.indexOf(WW_CHARACTERISTIC_READ) >= 0) {
            // 读的特性
            readServiceUUID = serviceId
            readCharacteristicsUUID = item.uuid

            wx.notifyBLECharacteristicValueChange({
              deviceId: deviceId,
              serviceId: readServiceUUID,
              characteristicId: readCharacteristicsUUID,
              state: true,
              success: function (res) {
                // 度的特性开启通知上报
                console.log("开启通知", res)
              },
            })
          } else if (item.uuid.indexOf(WW_CHARACTERISTIC_WRITE) >= 0) {
            // 写的特性
            writeServiceUUID = serviceId
            writeCharacteristicsUUID = item.uuid

            that.sendCommand(WenDevcieForbitPaired)
            that.sendCommand(WenQueryBattery)
          } else if (item.uuid.indexOf(WW_CHARACTERISTIC_FIRMWARE) >= 0) {
            // 固件版本
            wx.readBLECharacteristicValue({
              deviceId: deviceId,
              serviceId: serviceId,
              characteristicId: item.uuid,
              success: function (res) {
                console.log("读取固件版本", res)
              },
            })
          }
        }
      },
    })
  },

  /**
   * 发命令给设备
   */
  sendCommand: function (command) {
    let buffer = util.changeCommand(command)

    wx.writeBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: writeServiceUUID,
      characteristicId: writeCharacteristicsUUID,
      value: buffer,
      success: function (res) {
        console.log("写入成功", res)
      },
      fail: function (res) {
        console.log("写入失败", res)
      }
    })
  },

  /**
   * 解析回调值
   */
  analyseCharacteristic: function (res) {
    let characteristicId = res.characteristicId
    let value = util.buf2hex(res.value)
    var device = this.data.device

    if (characteristicId.indexOf(WW_CHARACTERISTIC_BATTERY) >= 0) {
      // 电池电量
      let battery = parseInt(value, 16)// 转成十进制的
      device.battery = battery

      console.log("电池电量", battery)

      this.setData({
        device: device
      })
    } else if (characteristicId.indexOf(WW_CHARACTERISTIC_READ) >= 0) {
      // 特征值
      console.log("特征值", value)

      if (value.indexOf("8103") == 2) {
        // 电池
        let battery = util.analyseReturnCharacteristicValue(value, 3, 1)
        device.battery = battery

        console.log("电池电量", battery)

        this.setData({
          device: device
        })
      } else if (value == WWDEVICE_SINGLE_CLICK_ACTION || value == WWDEVICE_DOUBLE_CLICK_ACTION) {
        // 单双击的回调
        if (okIndex == 2) {
          // 走下一步咯
          this.okButtonOnClick();
        }
      }
    } else if (characteristicId.indexOf(WW_CHARACTERISTIC_FIRMWARE) >= 0) {
      // 固件版本
      let firmware = util.analyseReturnCharacteristicData(res.value, 0, 14)
      device.firmware = firmware

      this.setData({
        device: device
      })
    }
  },

  /**
   * 按钮事件逻辑处理
   */
  okButtonOnClick: function () {
    console.log("okIndex", okIndex)

    if (okIndex == 0) {
      // ok第一步，发震动命令
      this.sendCommand(WWDEVICE_SHAKE_COMMAND)

      // 往下一步走
      okIndex = 1

      this.setData({
        functionDesc: "请确认振子是否振动"
      })
    } else if (okIndex == 1) {
      // ok第二步，等待接受敲击
      // 关闭震动
      this.sendCommand(WWDEVICE_STOP_SHAKE_COMMAND)

      // 往下一步走
      okIndex = 2

      this.setData({
        functionDesc: "请敲击设备"
      })
    } else if (okIndex == 2) {
      console.log("ledCommandArray", ledCommandArray)

      if (ledCommandArray.length == 0) {
        // 怼一些命令进去
        for (var i = 0; i < 100; i++) {
          ledCommandArray.push(WWDEVICE_LED_RED_SECOND)
          ledCommandArray.push(WWDEVICE_LED_GREEN_SECOND)
          ledCommandArray.push(WWDEVICE_LED_BLUE_SECOND)
        }
      }

      this.sendCommand(WWDEVICE_LED_RED_SECOND)
      var commandIndex = 1

      ledTimer = setInterval(function () {
        if (commandIndex < ledCommandArray.length) {
          let command = ledCommandArray[commandIndex]
          this.sendCommand(command)
        }

        commandIndex++;
      }.bind(this), 1000)

      // 往下一步走
      okIndex = 3

      this.setData({
        functionDesc: "请确认红绿蓝灯是否依次点亮"
      })
    } else if (okIndex == 3) {
      var testTotal = this.data.testTotal
      var okTotal = this.data.okTotal

      console.log("testTotal", testTotal)
      console.log("okTotal", okTotal)

      // 1.累加ok次数
      wx.setStorageSync("testTotal", ++testTotal)
      wx.setStorageSync("okTotal", ++okTotal)

      this.setLogArray(true)

      // 2.返回上一个界面
      this.closeCommand()
    }
  },

  /**
   * ng按钮点击事件
   */
  ngButtonOnClick: function () {
    var testTotal = this.data.testTotal
    // 1.累加ng次数
    wx.setStorageSync("testTotal", ++testTotal)
    this.setLogArray(false)

    // 2.返回
    this.closeCommand()
  },

  /**
   * 发动关闭震动和灯管的命令，并且退出
   */
  closeCommand: function () {
    this.sendCommand(WWDEVICE_STOP_SHAKE_COMMAND)
    this.sendCommand(WWDEVICE_LED_CLOSE)

    wx.navigateBack({

    })
  },

  /**
   * 把数据记录到缓存中
   */
  setLogArray: function (isOK) {
    var device = this.data.device
    var serialNumber = device.serialNumberPrefix + device.serialNumber + device.serialNumberSuffix
    var now = new Date();
    var mytime = wxutil.formatTime(now);
    var okInt = isOK == true ? 1 : 2;

    // 信息
    var info = new Object()
    info.isOK = okInt
    info.time = mytime
    info.serialNumber = serialNumber

    // 读
    var logArray = wx.getStorageSync("logArray")
    // 添加
    logArray.push(info)
    console.log("logArray", logArray)
    
    // 写
    wx.setStorageSync("logArray", logArray)
  }
})

let ledTimer;
let okIndex = 0;
let WWDEVICE_SHAKE_COMMAND = [0x07, 0x89, 0x0A, 0x0A, 0x0A, 0xFF, 0x53]// 震动命令
let WWDEVICE_STOP_SHAKE_COMMAND = [0x04, 0x89, 0x02, 0x71]    //停止震动
let WWDEVICE_LED_RED_SECOND = [0x0B, 0x88, 0x0A, 0x00, 0x0A, 0x00, 0x01, 0xFF, 0x00, 0x00, 0x59]    //亮红灯1秒
let WWDEVICE_LED_GREEN_SECOND = [0x0B, 0x88, 0x0A, 0x00, 0x0A, 0x00, 0x01, 0x00, 0xFF, 0x00, 0x59]    //亮绿灯1秒
let WWDEVICE_LED_BLUE_SECOND = [0x0B, 0x88, 0x0A, 0x00, 0x0A, 0x00, 0x01, 0x00, 0x00, 0xFF, 0x59]    //亮蓝灯1秒
let WWDEVICE_LED_CLOSE = [0x04, 0x88, 0x02, 0x72]    //关闭灯光
var ledCommandArray = []

let WWDEVICE_SINGLE_CLICK_ACTION = "058a011060"   //单击动作返回数据
let WWDEVICE_DOUBLE_CLICK_ACTION = "058a012050"   //双击动作返回数据