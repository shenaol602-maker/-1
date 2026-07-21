/*
  多设备云端同步配置说明
  1. 在 https://console.firebase.google.com 创建项目，启用 Authentication > Email/Password 与 Firestore。
  2. 将此文件改名为 firebase-config.js，填入 Firebase 控制台提供的配置。
  3. 按 README.md 的部署步骤发布到 Firebase Hosting。
  当前 index.html 为离线演示模式，数据存储在此浏览器本地。
*/
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY', authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT', storageBucket: 'YOUR_PROJECT.firebasestorage.app',
  messagingSenderId: 'YOUR_SENDER_ID', appId: 'YOUR_APP_ID'
};
