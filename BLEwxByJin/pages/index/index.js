//index.js
//获取应用实例
const app = getApp()
var onceToken = ""

Page({
  data: {
    motto: '吻吻蓝牙',
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo')
  },
  //事件处理函数
  bindViewTap: function() {
    wx.navigateTo({
      url: '../search/searchMain'//跳转到搜索主页面
    })
  },
  onLoad: function () {
    // 初始化设置好为0
    wx.setStorageSync("testTotal", 0)
    wx.setStorageSync("okTotal", 0)
    wx.setStorageSync("logArray", [])

    onceToken = "onceToken"

    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      })
    } else if (this.data.canIUse){
      // 由于 getUserInfo 是网络请求，可能会在 Page.onLoad 之后才返回
      // 所以此处加入 callback 以防止这种情况
      app.userInfoReadyCallback = res => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    } else {
      // 在没有 open-type=getUserInfo 版本的兼容处理
      wx.getUserInfo({
        success: res => {
          app.globalData.userInfo = res.userInfo
          this.setData({
            userInfo: res.userInfo,
            hasUserInfo: true
          })
        }
      })
    }
  },
  getUserInfo: function(e) {
    console.log(e)
    app.globalData.userInfo = e.detail.userInfo
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },

  onShow: function() {
    if (onceToken == "onceToken") {
      var testTotal = wx.getStorageSync('testTotal')
      var okTotal = wx.getStorageSync('okTotal')

      this.setData({
        testTotal: testTotal,
        okTotal: okTotal
      })
    } else {
      this.setData({
        testTotal: 0,
        okTotal: 0
      })
    }
  },

  /**
   * 导出日志记录
   */
  outputLogArray: function() {
    var logArray = wx.getStorageSync("logArray")
    var str = this.formatLog(logArray)

    // 复制到剪切板
    wx.setClipboardData({
      data: str,
      success: function(res) {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1000
        })
      },
      fail: function(res) {
        wx.showModal({
          title: '提示',
          content: '复制失败:' + res,
          success: function (res) {

          }
        })
      }
    })
  },
  
  formatLog:function(logArray) {
    var logStr = ""

    for (var i = 0; i < logArray.length; i++) {
      var item = logArray[i]
      var okStr = item.isOK == 1 ? "ok" : "ng"
      logStr += item.time + "\t" + item.serialNumber + "\t" + okStr + "\n"
    }

    return logStr
  },
})
