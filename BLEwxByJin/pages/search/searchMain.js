// pages/search/searchMain.js
var app = getApp()

/** 发现的设备数组 */
var devices_list = []

// 工具类提供的方法
var util = require('../../utils/wenUtil.js');

var onceToken = ""
var logArray = []

Page({
  /**
   * 页面的初始数据
   */
  data: {
    /** 蓝牙开关是否就绪 */
    isbluetoothready: false,
    searchingstatus: false,
    devices: [],
    testTotal: 0,
    okTotal: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.switchBlueTooth()
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
    console.log("显示")
    var that = this

    // 拿缓存数据并且显示
    var testTotal = wx.getStorageSync('testTotal')
    var okTotal = wx.getStorageSync('okTotal')
    var oklv = testTotal > 0 ? (okTotal * 100 / testTotal).toFixed(2) : 0

    console.log("testTotal", testTotal)
    console.log("okTotal", okTotal)

    that.setData({
      testTotal: testTotal,
      okTotal: okTotal,
      oklv: oklv
    })

    // 获取测试记录
    logArray = wx.getStorageSync("logArray")
    console.log("logArray", logArray)

    if (onceToken == "onceToken") {
      onceToken = ""

      // 开始搜索
      this.startSearch()
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.log("隐藏")

    this.stopSearch()
    onceToken = "onceToken"
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 停止搜索
    this.stopSearch();

    // 关掉蓝牙适配器
    wx.hideNavigationBarLoading()

    wx.closeBluetoothAdapter({
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
   * 蓝牙开关方法
   */
  switchBlueTooth: function () {
    var that = this

    that.setData({
      isbluetoothready: !that.data.isbluetoothready,
    })

    if (that.data.isbluetoothready) {
      wx.openBluetoothAdapter({
        success: function (res) {
          console.log("初始化蓝牙适配器成功")

          // 获得蓝牙状态
          wx.getBluetoothAdapterState({
            success: function (res) {
              console.log("蓝牙适配器状态", res)

              if (res.available) {
                that.startSearch()
              }
            },
          })

          wx.onBluetoothAdapterStateChange(function (res) {
            console.log("蓝牙适配器状态变化", res)

            that.setData({
              isbluetoothready: res.available,
              searchingstatus: res.discovering
            })
          })

          // 发现设备
          wx.onBluetoothDeviceFound(function (devices) {
            var deviceSource = that.getReallyDevice(devices)
            var device = util.analyseBroadcastFacturerData(deviceSource.advertisData, deviceSource)

            if (device) {
              // 确保有值才是吻吻设备
              console.log('发现新蓝牙设备', device.serialNumber)
              console.log(device)

              for (var i = 0; i < devices_list.length; i++) {
                if (device.deviceId == devices_list[i].deviceId) {
                  devices_list.splice(i, 1)
                  break;
                }
              }

              // 赋值对应的OK值
              for (var i = 0; i < logArray.length; i++) {
                if (logArray[i].serialNumber == device.serialNumberPrefix + device.serialNumber + device.serialNumberSuffix) {
                  // 序列号相等则赋值上对应的OK值
                  device.isOK = logArray[i].isOK;
                  // break;
                }
              }

              devices_list.push(device)

              that.setData({
                devices: devices_list
              })
            }
          })
        },
        fail: function (res) {
          console.log("初始化蓝牙适配器失败")

          wx.showModal({
            title: '提示',
            content: '请检查手机蓝牙是否打开',
            success: function (res) {
              that.setData({
                isbluetoothready: false,
                searchingstatus: false
              })
            }
          })
        }
      })
    } else {
      devices_list = []

      that.closeBLE()
    }
  },

  /**
   * 得到真正的设备数据
   */
  getReallyDevice: function (devices) {
    var ishave = true;

    if (devices.deviceId) {
      return devices;
    } else if (devices.devices) {
      return devices.devices[0];
    } else if (devices[0]) {
      return devices[0]
    }

    return null
  },

  /**
   * 搜索蓝牙设备
   */
  startSearch: function () {
    devices_list = []
    var that = this
    wx.showNavigationBarLoading()

    wx.startBluetoothDevicesDiscovery({
      services: ["FFF0", "FEF5"],
      success: function (res) {
        console.log("开始搜索附近蓝牙设备")
        console.log(res)

        that.setData({
          searchingstatus: true
        })
      }
    })
  },

  /**
   * 停止搜索
   */
  stopSearch: function () {
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {

      },
    })
  },

  /**
   * 关闭蓝牙
   */
  closeBLE: function () {
    // 关闭蓝牙适配器
    wx.closeBluetoothAdapter({
      success: function (res) {
        wx.hideNavigationBarLoading()
        console.log(res)

        that.setData({
          isbluetoothready: false,
          devices: [],
          searchingstatus: false,
        })
      }
    })
  },

  /**
   * 连接设备
   */
  connectTO: function (e) {
    var that = this

    wx.showLoading({
      title: '连接蓝牙设备中...',
    })

    wx.createBLEConnection({
      deviceId: e.currentTarget.id,
      success: function (res) {
        wx.hideLoading()

        wx.showToast({
          title: '连接成功',
          icon: 'success',
          duration: 1000
        })

        // 把连接好的设备id存起来
        console.log(res)
        var connectedDeviceId = e.currentTarget.id
        var device = that.fineDeviceInfoById(connectedDeviceId)

        wx.navigateTo({
          url: '../deviceDetail/deviceDetail?deviceId=' + connectedDeviceId + "&device=" + JSON.stringify(device)
        });
      },
      fail: function (res) {
        wx.hideLoading()
        
        wx.showToast({
          title: '连接设备失败',
          icon: 'success',
          duration: 1000
        })
      }
    })

    this.stopSearch()
  },

  /**
   * 找设备
   */
  fineDeviceInfoById: function(deviceId) {
    for (var i = 0; i < devices_list.length; i++) {
      if (deviceId == devices_list[i].deviceId) {
        // 找到了
        return devices_list[i]
        break
      }
    }

    return null
  }
})