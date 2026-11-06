# 发布流程

本文使用占位域名，发布时替换成你自己的服务器和 GitHub 仓库。

## 1. 版本号

- 桌面端：`package.json`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src/lib/platform.ts` 保持一致。
- Android：`app/build.gradle.kts` 的 `versionName` + `versionCode`。
- 服务端：更新 `server/` 的发布清单。

## 2. 构建

```bash
# Windows
pnpm install
pnpm test
pnpm tauri build
# 产物：src-tauri/target/release/bundle/nsis/Guodelist_<version>_x64-setup.exe

# Android
cd ../guodelist-android
./gradlew :app:testDebugUnitTest :app:jacocoTestCoverageVerification
./gradlew :app:assembleRelease -PGUODELIST_SERVER=https://api.your-server.example
# 产物：app/build/outputs/apk/release/app-release.apk
```

Android 签名使用本机 `keystore.properties`，不要提交 keystore 或密码。

## 3. 上传更新源

把安装包上传到自己的发布服务器，并更新 `/api/v1/app/latest` 对应的清单：

```bash
TOKEN="<admin-token>"
API="https://api.your-server.example"

curl -s -X POST "$API/api/v1/admin/releases/windows" \
  -H "Authorization: Bearer $TOKEN" \
  -F "versionName=0.9.7" \
  -F "notes=..." \
  -F "file=@Guodelist_0.9.7_x64-setup.exe"

curl -s -X POST "$API/api/v1/admin/releases/android" \
  -H "Authorization: Bearer $TOKEN" \
  -F "versionName=0.4.15" \
  -F "versionCode=20" \
  -F "notes=..." \
  -F "file=@guodelist-android-0.4.15-release.apk"
```

验证：

```bash
curl -s "$API/api/v1/app/latest?platform=windows&version=0.9.6"
curl -s "$API/api/v1/app/latest?platform=android&versionCode=19"
```

## 4. GitHub Release

在 GitHub Releases 附上同样的安装包即可。Gitea/GitHub 只是归档镜像，客户端更新仍以
`/api/v1/app/latest` 为准。

## 5. 发布前检查

- [ ] 没有 keystore、密码、token、推送 AppSecret 进入 Git；
- [ ] 没有生产域名、个人邮箱、内网 IP 硬编码；
- [ ] 桌面 33 个测试通过；
- [ ] Android 30 个单元测试 + JaCoCo 门禁通过；
- [ ] 安装包 SHA-256 与清单一致；
- [ ] 旧客户端仍能检查到新版本。
