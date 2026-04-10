'use strict'

/**
 * @name File
 * @author Mr·Fan DkPlusAI
 * @Time 2026/03/24
 * @description 文件工具方法，包含目录创建、重命名、筛选与文件信息处理。
 **/

const fs = require('fs')
const path = require('path')

const rename = (_old, _new) => {
  return new Promise((resolve, reject) => {
    fs.rename(_old, _new, function (err) {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  })
}

const getFileName = file => {
  const extension = path.extname(file)
  const fileName = path.basename(file, extension)
  return fileName
}

function filterFile(file) {
  // 获取文件后缀名
  const extension = path.extname(file)
  return file.indexOf('.') !== 0 && file !== 'index.js' && extension == '.js'
}

module.exports = { rename: rename, getFileName: getFileName, filterFile: filterFile }
