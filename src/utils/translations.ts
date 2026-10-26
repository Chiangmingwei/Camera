import { Language } from '../types';

export const i18n = {
  en: {
    appName: 'TeleLens',
    appSubtitle: 'Dual-Phone Remote Camera & Viewfinder',
    roleSelectionTitle: 'Choose Device Mode',
    roleSelectionSubtitle: 'Select how you want to use this smartphone',
    
    // Roles
    cameraRoleTitle: 'This is the Camera Phone',
    cameraRoleBadge: 'Host / Streamer',
    cameraRoleDesc: 'Mount on a tripod or stand. Streams live video and captures full-resolution photos on remote command.',
    cameraRoleButton: 'Start as Camera Phone',
    
    controllerRoleTitle: 'This is the Controller Phone',
    controllerRoleBadge: 'Remote / Viewfinder',
    controllerRoleDesc: 'Hold in hand. See what the camera sees in real-time, adjust zoom/timer, and press shutter to snap.',
    controllerRoleButton: 'Start as Controller Phone',

    simulatorLink: 'Test Both on Single Device (Split View Simulator)',

    // Pairing
    pairingTitle: 'Pair with Controller',
    roomCodeLabel: 'Room Code',
    scanQrLabel: 'Scan with Controller Phone',
    orEnterCode: 'Or enter the 4-digit code on the controller',
    copyLink: 'Copy Pairing Link',
    linkCopied: 'Pairing link copied to clipboard!',
    outdoorTipTitle: 'Outdoors without Wi-Fi?',
    outdoorTipDesc: 'Turn on Personal Hotspot on one phone, connect the other phone to it, and pair instantly with zero cellular data used!',
    
    // Controller Connect Modal
    joinTitle: 'Connect to Camera',
    enterCodeInstruction: 'Enter the 4-digit code shown on the Camera Phone:',
    quickDemoCode: 'Use Demo Code',
    scanQrButton: 'Scan QR with Camera',
    connectButton: 'Connect to Camera',
    invalidCode: 'Please enter a valid 4-digit code',

    // Status
    statusIdle: 'Ready',
    statusWaiting: 'Waiting for Controller...',
    statusConnecting: 'Connecting WebRTC...',
    statusConnected: 'Live Connected',
    statusReconnecting: 'Reconnecting...',
    statusDisconnected: 'Disconnected',
    statusError: 'Connection Error',

    // Camera View
    flipCamera: 'Flip Camera',
    frontCamera: 'Front Camera',
    rearCamera: 'Rear Camera',
    torchOn: 'Flashlight On',
    torchOff: 'Flashlight Off',
    sensorResolution: 'Sensor Resolution',
    remoteCommandActive: 'Remote Trigger Active',
    disconnectPrompt: 'Disconnect session?',

    // Controller View
    viewfinderLive: 'LIVE FEED',
    shutterButton: 'Capture Photo',
    timerOff: 'Timer Off',
    timer3s: '3s Timer',
    timer10s: '10s Timer',
    zoom1x: '1x',
    zoom2x: '2x',
    zoom3x: '3x',
    gridOn: 'Grid On',
    gridOff: 'Grid Off',
    bluetoothHint: 'Press Bluetooth remote or Volume buttons to snap',

    // Gallery
    galleryTitle: 'Captured Photos',
    noPhotos: 'No photos captured yet. Press the shutter button to take your first shot!',
    downloadPhoto: 'Download High-Res',
    sharePhoto: 'Share',
    deletePhoto: 'Delete',
    close: 'Close',
    photoSavedToast: 'Photo received and saved in gallery!',

    // Errors & Permissions
    cameraPermissionDenied: 'Camera Access Denied',
    cameraPermissionHelp: 'Please allow camera access in your browser settings so TeleLens can stream video and capture photos.',
    tryAgain: 'Try Again',
    backToRoles: 'Change Role',
  },
  zh: {
    appName: 'TeleLens 远程相机',
    appSubtitle: '双手机无线取景器与远程遥控快门',
    roleSelectionTitle: '选择当前手机角色',
    roleSelectionSubtitle: '请选择这台设备作为拍摄端还是遥控端',

    // Roles
    cameraRoleTitle: '📱 这是拍摄相机端',
    cameraRoleBadge: '主机 / 镜头端',
    cameraRoleDesc: '放置在三脚架或桌面。实时向遥控手机传输低延迟取景画面，接收远程快门指令拍摄高画质照片。',
    cameraRoleButton: '作为相机端启动',

    controllerRoleTitle: '🎮 这是遥控监视端',
    controllerRoleBadge: '遥控 / 取景器',
    controllerRoleDesc: '拿在手中实时查看画面。支持倒计时、变焦调节、前后镜头翻转，一键按下快门抓拍。',
    controllerRoleButton: '作为遥控端启动',

    simulatorLink: '单机模拟双手机测试（分屏体验）',

    // Pairing
    pairingTitle: '配对遥控器',
    roomCodeLabel: '房间配对码',
    scanQrLabel: '使用遥控端手机扫码',
    orEnterCode: '或在遥控端输入下方 4 位配对码',
    copyLink: '复制配对链接',
    linkCopied: '配对链接已复制到剪贴板！',
    outdoorTipTitle: '户外没有 Wi-Fi 怎么办？',
    outdoorTipDesc: '一台手机开启个人热点，另一台手机连接该热点，无需耗费蜂窝流量即可超低延迟点对点传输！',

    // Controller Connect Modal
    joinTitle: '连接相机手机',
    enterCodeInstruction: '请输入相机手机屏幕上显示的 4 位配对码：',
    quickDemoCode: '一键填入演示码',
    scanQrButton: '调用摄像头扫码',
    connectButton: '连接相机',
    invalidCode: '请输入有效的 4 位配对码',

    // Status
    statusIdle: '待机就绪',
    statusWaiting: '等待遥控端连接...',
    statusConnecting: '正在建立 WebRTC 连接...',
    statusConnected: '已连接传输',
    statusReconnecting: '重新连接中...',
    statusDisconnected: '连接已断开',
    statusError: '连接异常',

    // Camera View
    flipCamera: '翻转镜头',
    frontCamera: '前置镜头',
    rearCamera: '后置主摄',
    torchOn: '补光灯开启',
    torchOff: '补光灯关闭',
    sensorResolution: '硬件原生画质',
    remoteCommandActive: '收到远程遥控指令',
    disconnectPrompt: '确认退出当前会话吗？',

    // Controller View
    viewfinderLive: '实时取景',
    shutterButton: '拍照快门',
    timerOff: '关闭倒计时',
    timer3s: '3 秒倒计时',
    timer10s: '10 秒倒计时',
    zoom1x: '1x 广角',
    zoom2x: '2x 标准',
    zoom3x: '3x 长焦',
    gridOn: '构图网格',
    gridOff: '隐藏网格',
    bluetoothHint: '支持蓝牙自拍杆及音量加减键实体快门',

    // Gallery
    galleryTitle: '已拍摄相册',
    noPhotos: '暂无照片。点击下方快门按钮即可抓拍第一张精彩瞬间！',
    downloadPhoto: '下载原图',
    sharePhoto: '系统分享',
    deletePhoto: '删除',
    close: '关闭',
    photoSavedToast: '已接收高画质成片并存入相册！',

    // Errors & Permissions
    cameraPermissionDenied: '相机权限受限',
    cameraPermissionHelp: '请在手机浏览器设置中允许调用相机，以便开启实时取景画面与拍摄。',
    tryAgain: '重新授权',
    backToRoles: '返回角色选择',
  },
};

export function t(lang: Language, key: keyof typeof i18n['en']): string {
  return i18n[lang][key] || i18n['en'][key] || key;
}
