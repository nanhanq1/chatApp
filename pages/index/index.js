// index.js
const crypto = require('../../utils/crypto.js')
const app = getApp()

Page({
  data: {
    inputText: '',
    outputText: '',
    inputImage: '',
    outputImage: '',
    types: [
      { name: '文本加密', type: 'text' },
      { name: '图片加密', type: 'image' }
    ],
    selectedTypeIndex: 0,
    keys: [
      { name: '默认密钥', key: 'ThisIsA16ByteKey' },
      { name: '密钥A', key: 'SecurityKeyAAAAA' },
      { name: '密钥B', key: 'SecurityKeyBBBBB' }
    ],
    selectedKeyIndex: 0,
    status: '就绪',
    encryptMode: 'encrypt',
    isDarkMode: app.globalData.isDarkMode,
    operations: [
      { name: '加密', type: 'encrypt' },
      { name: '解密', type: 'decrypt' }
    ],
    operationIndex: 0,
    imageOperations: [
      { name: '加密', type: 'encrypt' },
      { name: '解密', type: 'decrypt' }
    ],
    imageOperationIndex: 0,
    canExecute: false,
    showDropdown: false
  },

  onLoad() {
    // 监听系统主题变化
    wx.onThemeChange((result) => {
      this.setData({
        isDarkMode: result.theme === 'dark'
      })
    })
  },

  // 切换主题
  toggleTheme() {
    app.toggleDarkMode()
    this.setData({
      isDarkMode: app.globalData.isDarkMode
    })
  },

  // 类型选择变化处理
  onTypeChange(e) {
    this.setData({
      selectedTypeIndex: parseInt(e.detail.value),
      inputText: '',
      outputText: '',
      inputImage: '',
      outputImage: '',
      status: '已更新状态'
    })
  },

  // 选择图片
  chooseImage() {
    wx.showActionSheet({
      itemList: ['从相册选择', '拍摄照片'],
      success: (res) => {
        const sourceType = res.tapIndex === 0 ? ['album'] : ['camera']
        wx.chooseImage({
          count: 1,
          sourceType,
          success: (res) => {
            this.setData({
              inputImage: res.tempFilePaths[0]
            })
            this.updateCanExecute()
          }
        })
      }
    })
  },

  // 加密功能
  async encrypt() {
    const isImageType = this.data.types[this.data.selectedTypeIndex].type === 'image'

    if (isImageType) {
      if (!this.data.inputImage) {
        wx.showToast({
          title: '请选择要加密的图片',
          icon: 'none'
        })
        return
      }
      await this.encryptImage()
    } else {
      this.encryptText()
    }
  },

  // 文本加密
  encryptText() {
    const text = this.data.inputText.trim()
    if (!text) {
      wx.showToast({
        title: '请输入要加密的内容',
        icon: 'none'
      })
      return
    }

    try {
      const key = this.data.keys[this.data.selectedKeyIndex].key
      const encrypted = crypto.encrypt(text, key)

      this.setData({
        outputText: encrypted,
        status: '加密成功'
      })
    } catch (e) {
      console.error('加密错误:', e)
      wx.showToast({
        title: e.message || '加密失败',
        icon: 'none',
        duration: 2000
      })
      this.setData({
        status: '加密失败：' + (e.message || '未知错误')
      })
    }
  },

  // 图片加密
  async encryptImage() {
    try {
      wx.showLoading({
        title: '加密中...',
        mask: true
      })

      const key = this.data.keys[this.data.selectedKeyIndex].key

      // 读取图片数据为 base64
      const imageData = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: this.data.inputImage,
          encoding: 'base64',
          success: res => resolve(res.data),
          fail: err => reject(err)
        })
      })

      // 添加图片头信息
      const fullImageData = `data:image/png;base64,${imageData}`

      // 加密图片数据
      const encrypted = crypto.encrypt(fullImageData, key)

      this.setData({
        outputText: encrypted,
        status: '图片加密成功'
      })

      wx.hideLoading()
      wx.showToast({
        title: '加密成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('图片加密错误:', error)
      wx.hideLoading()
      wx.showToast({
        title: '加密失败：' + (error.message || '未知错误'),
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 解密功能
  async decrypt() {
    const isImageType = this.data.types[this.data.selectedTypeIndex].type === 'image'

    if (isImageType) {
      // 图片解密只需要密文，不需要选择图片
      if (!this.data.inputText) {
        wx.showToast({
          title: '请输入要解密的密文',
          icon: 'none'
        })
        return
      }
      await this.decryptImage()
    } else {
      this.decryptText()
    }
  },

  // 文本解密
  decryptText() {
    const text = this.data.inputText.trim()
    if (!text) {
      wx.showToast({
        title: '请输入要解密的内容',
        icon: 'none'
      })
      return
    }

    try {
      const key = this.data.keys[this.data.selectedKeyIndex].key
      const decrypted = crypto.decrypt(text, key)

      this.setData({
        outputText: decrypted,
        status: '解密成功'
      })
    } catch (e) {
      console.error('解密错误:', e)
      wx.showToast({
        title: e.message || '解密失败',
        icon: 'none',
        duration: 2000
      })
      this.setData({
        status: '解密失败：' + (e.message || '未知错误')
      })
    }
  },

  // 图片解密
  async decryptImage() {
    try {
      if (!this.data.inputText) {
        wx.showToast({
          title: '请输入密文',
          icon: 'none'
        })
        return
      }

      wx.showLoading({
        title: '解密中...',
        mask: true
      })

      const key = this.data.keys[this.data.selectedKeyIndex].key

      // 解密数据
      const decrypted = crypto.decrypt(this.data.inputText.trim(), key)

      // 验证解密后的数据是否为有效的 base64 图片
      if (!decrypted.startsWith('data:image')) {
        throw new Error('无效的图片数据')
      }

      // 提取 base64 数据
      const base64Data = decrypted.split(',')[1]

      // 将 base64 转换为临时文件
      const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_${Date.now()}.png`

      await new Promise((resolve, reject) => {
        wx.getFileSystemManager().writeFile({
          filePath: tempFilePath,
          data: base64Data,
          encoding: 'base64',
          success: () => resolve(),
          fail: err => reject(err)
        })
      })

      this.setData({
        outputImage: tempFilePath
      })

      wx.hideLoading()
      wx.showToast({
        title: '解密成功',
        icon: 'success'
      })
    } catch (error) {
      console.error('图片解密错误:', error)
      wx.hideLoading()
      wx.showToast({
        title: '解密失败：' + (error.message || '无效的密文'),
        icon: 'none',
        duration: 2000
      })
    }
  },

  // 读取文件数据
  getFileData(filePath, encoding = 'ascii') {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: encoding,  // 使用指定编码
        success: res => resolve(res.data),
        fail: reject
      })
    })
  },

  // 保存数据到临时文件
  saveToTempFile(data, type = 'text') {
    return new Promise((resolve, reject) => {
      const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_${Date.now()}.${type === 'base64' ? 'jpg' : 'txt'}`
      wx.getFileSystemManager().writeFile({
        filePath: tempFilePath,
        data: type === 'base64' ? data : JSON.stringify(data),
        encoding: type === 'base64' ? 'base64' : 'utf8',
        success: () => resolve(tempFilePath),
        fail: reject
      })
    })
  },

  // 复制结果或保存图片
  copyResult() {
    // 如果有密文，直接复制密文（无论是文本还是图片加密的结果）
    if (this.data.outputText) {
      wx.setClipboardData({
        data: this.data.outputText,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板'
          })
          this.setData({
            status: '已复制到剪贴板'
          })
        }
      })
      return
    }

    // 如果有图片结果
    if (this.data.outputImage) {
      wx.saveImageToPhotosAlbum({
        filePath: this.data.outputImage,
        success: () => {
          wx.showToast({
            title: '已保存到相册'
          })
          this.setData({
            status: '已保存到相册'
          })
        }
      })
      return
    }

    wx.showToast({
      title: '没有可复制的内容',
      icon: 'none'
    })
  },

  // 清空所有
  clearAll() {
    this.setData({
      inputText: '',
      outputText: '',
      inputImage: '',
      outputImage: '',
      status: '已清空'
    })
    this.updateCanExecute()
  },

  // 切换加密/解密模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      encryptMode: mode,
      inputText: '',
      outputText: '',
      inputImage: '',
      outputImage: '',
      status: '已更新状态'
    })
  },

  // 从剪贴板粘贴
  async pasteFromClipboard() {
    try {
      const res = await wx.getClipboardData()
      if (res.data) {
        this.setData({
          inputText: res.data
        })
        this.updateCanExecute()
      }
    } catch (error) {
      wx.showToast({
        title: '粘贴失败',
        icon: 'none'
      })
    }
  },

  // 分享结果
  async shareResult() {
    try {
      if (!this.data.outputText && !this.data.outputImage) {
        wx.showToast({
          title: '没有可分享的内容',
          icon: 'none'
        })
        return
      }

      // 复制到剪贴板
      wx.setClipboardData({
        data: this.data.outputText || '图片无法直接分享',
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          })
        }
      })
    } catch (error) {
      console.error('分享失败:', error)
      wx.showToast({
        title: '分享失败',
        icon: 'none'
      })
    }
  },

  // 添加密钥选择变化处理方法
  onKeyChange(e) {
    this.setData({
      selectedKeyIndex: parseInt(e.detail.value),
      outputText: '',  // 清空输出
      outputImage: '', // 清空输出图片
      status: '已更换密钥'
    })
  },

  // 添加输入文本变化处理方法
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    })
    this.updateCanExecute()
  },

  // 文本操作类型变化
  onOperationChange(e) {
    this.setData({
      operationIndex: parseInt(e.detail.value),
      outputText: '',
      status: '已切换操作类型'
    })
  },

  // 图片操作类型变化
  onImageOperationChange(e) {
    this.setData({
      imageOperationIndex: parseInt(e.detail.value),
      outputText: '',
      outputImage: '',
      inputImage: '',
      inputText: '',
      status: '已切换操作类型'
    })
  },

  // 执行文本操作
  executeOperation() {
    if (this.data.operations[this.data.operationIndex].type === 'encrypt') {
      this.encrypt()
    } else {
      this.decrypt()
    }
  },

  // 执行图片操作
  executeImageOperation() {
    if (this.data.imageOperations[this.data.imageOperationIndex].type === 'encrypt') {
      this.encrypt()
    } else {
      this.decrypt()
    }
  },

  // 更新是否可以执行操作
  updateCanExecute() {
    const isText = this.data.selectedTypeIndex === 0
    const isEncrypt = this.data.operationIndex === 0

    let canExecute = false
    if (isText) {
      canExecute = !!this.data.inputText
    } else { // 图片模式
      canExecute = isEncrypt ? !!this.data.inputImage : !!this.data.inputText
    }

    this.setData({ canExecute })
  },

  // 切换下拉框显示状态
  toggleDropdown() {
    this.setData({
      showDropdown: !this.data.showDropdown
    })
  },

  // 在点击页面其他区域时隐藏下拉框
  hideDropdown() {
    this.setData({
      showDropdown: false
    })
  },

  // 切换加密类型
  switchType(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      selectedTypeIndex: index,
      inputText: '',
      inputImage: '',
      outputText: '',
      outputImage: ''
    })
    this.updateCanExecute()
  },

  // 切换操作模式
  switchOperation(e) {
    const index = parseInt(e.currentTarget.dataset.index)
    this.setData({
      operationIndex: index,
      inputText: '',
      inputImage: '',
      outputText: '',
      outputImage: ''
    })
    this.updateCanExecute()
  },

  // 执行操作
  async executeOperation() {
    if (!this.data.canExecute) return

    const isText = this.data.selectedTypeIndex === 0
    const isEncrypt = this.data.operationIndex === 0

    try {
      wx.showLoading({ title: '处理中...' })

      if (isText) {
        isEncrypt ? this.encryptText() : this.decryptText()
      } else {
        isEncrypt ? await this.encryptImage() : await this.decryptImage()
      }

      wx.hideLoading()
    } catch (error) {
      wx.hideLoading()
      wx.showToast({
        title: error.message || '操作失败',
        icon: 'none'
      })
    }
  },

  // 保存图片到相册
  async saveImage() {
    try {
      // 检查是否有相册权限
      const setting = await wx.getSetting()

      if (!setting.authSetting['scope.writePhotosAlbum']) {
        // 没有权限，请求权限
        try {
          await wx.authorize({
            scope: 'scope.writePhotosAlbum'
          })
        } catch (error) {
          // 用户拒绝授权，引导用户去设置页面开启
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去授权',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
          return
        }
      }

      // 有权限了，执行保存操作
      if (!this.data.outputImage) {
        wx.showToast({
          title: '没有可保存的图片',
          icon: 'none'
        })
        return
      }

      // 保存图片到相册
      await wx.saveImageToPhotosAlbum({
        filePath: this.data.outputImage
      })

      wx.showToast({
        title: '已保存到相册',
        icon: 'success'
      })

    } catch (error) {
      console.error('保存图片错误:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      })
    }
  }
})
