// base64的库
var Base64 = require("../libs/base64.modified.js")

/**
   * 把广播数据进行解析，返回16进制字符串
   */
function buf2hex(buffer) {
  return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
}

/**
   * 补齐0
   */
function fillByZero(num, len) {
  var l = num.length;

  if (num.length < len) {
    for (var i = 0; i < len - l; i++) {
      num = "0" + num;
    }
  }

  return num;
}


/**
 * 解析广播数据，得到设备的mac地址和序列号
 */
function analyseBroadcastFacturerData(buffer, device) {
  var serial = this.buf2hex(buffer);

  if (serial.length < 32) {
    // 小于32的就不是咱们公司产品了
    return null;
  }

  //防止广播字段长度小于32个字符长度
  // 0到20属于序列号
  var serialNumber = serial.substr(0, 20)

  // 20到32属于mac地址
  var macAddress = serial.substr(20, 12)

  //对mac地址进行转码
  var newMacAddress = this.codeMacAddress(macAddress)
  this.convertHexSerialToDecimalSerial(serialNumber, device)

  device.macAddress = newMacAddress;

  return device
}

/**
 * 转换mac地址的格式显示
 */
function codeMacAddress(macStr) {
  var index = 0;
  var macAddress = "";
  var count = macStr.length;

  while (index < count) {
    var str = macStr.substr(index, 2).toUpperCase();

    macAddress += str

    if (index != count - 2) {
      macAddress += ":"
    }

    index += 2
  }

  return macAddress
}

/**
 * 转换序列号的显示格式
 */
function convertHexSerialToDecimalSerial(hexSerial, device) {
  if (hexSerial.length < 20) {
    return null;
  }

  // 协议版本号 + 商家识别码
  var companyHexStr = hexSerial.substr(0, 4)
  var companyDecimalStr = this.fillByZero(parseInt(companyHexStr, 16).toString(), 4);

  // 首饰类型
  var jewelHexType = hexSerial.substr(4, 2)
  var jewelDecimalType = this.fillByZero(parseInt(jewelHexType, 16).toString(), 2);

  // 生产日期
  var dataHexStr = hexSerial.substr(6, 6)
  var dataDecimalStr = this.fillByZero(parseInt(dataHexStr, 16).toString(), 6);

  // 流水号
  var serialHexStr = hexSerial.substr(12, 6)
  var serialDecimalStr = this.fillByZero(parseInt(serialHexStr, 16).toString(), 6);

  // 扩展位
  var expendHexStr = hexSerial.substr(18, 2)
  var expendDecimalStr = this.fillByZero(parseInt(expendHexStr, 16).toString(), 2);

  // 赋值
  device.serialNumberPrefix = companyDecimalStr + jewelDecimalType + dataDecimalStr
  device.serialNumber = serialDecimalStr
  device.serialNumberSuffix = expendDecimalStr
}

/**
 * 转换命令的类型，返回ArrayBuffer
 */
function changeCommand(command) {
  let arrayBuffer = new Uint8Array(command)
  let base64 = wx.arrayBufferToBase64(arrayBuffer)
  let buffer = wx.base64ToArrayBuffer(base64)

  return buffer
}

/**
 * 转换回调的数据编码
 */
function analyseReturnCharacteristicData(data, startIndex, endIndex) {
  console.log("endIndex", endIndex)

  let newData = data.slice(startIndex, endIndex)
  let base64Str = wx.arrayBufferToBase64(newData)
  let str = Base64.decode(base64Str)
  console.log("str", str)

  return str
}

/**
 * 转换回调的数据编码
 */
function analyseReturnCharacteristicValue(value, startIndex, length) {
  let newValue = value.substr(startIndex * 2, length * 2)
  let str = parseInt(newValue, 16).toString()
  console.log("str", str)

  return str
}

module.exports = {
  buf2hex: buf2hex,
  fillByZero: fillByZero,
  analyseBroadcastFacturerData: analyseBroadcastFacturerData,
  codeMacAddress: codeMacAddress,
  convertHexSerialToDecimalSerial: convertHexSerialToDecimalSerial,
  changeCommand: changeCommand,
  analyseReturnCharacteristicData: analyseReturnCharacteristicData,
  analyseReturnCharacteristicValue: analyseReturnCharacteristicValue,
}