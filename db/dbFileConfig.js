const path = require('path')

const APP_ROOT = process.cwd()

function resolveUploadPath(envName, defaultRelativePath) {
  const customPath = process.env[envName]
  if (customPath && customPath.trim()) {
    return customPath.trim()
  }
  return path.join(APP_ROOT, defaultRelativePath)
}

module.exports = {
  UPLOAD_PATH_LED_Image: resolveUploadPath('UPLOAD_PATH_LED_IMAGE', 'upload/image'),
  UPLOAD_PATH_AVATAR: resolveUploadPath('UPLOAD_PATH_AVATAR', 'upload/avatar'),
  UPLOAD_PATH_COMPONENT_PREVIEW: resolveUploadPath('UPLOAD_PATH_COMPONENT_PREVIEW', 'upload/componentPreview'),
  UPLOAD_PATH_TEMPLATE_COVER: resolveUploadPath('UPLOAD_PATH_TEMPLATE_COVER', 'upload/templateCover')
}
