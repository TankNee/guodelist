# Guodelist API

零依赖 Node 服务：账号、清单、任务、同步、管理端统计。可由任意 Node 主机或容器运行，前面放一层 HTTPS 反向代理。

## 部署

| 项 | 示例值 |
|---|---|
| 对外地址 | `https://api.your-server.example` |
| 监听端口 | `8788` |
| 代码目录 | `/srv/guodelist-api` |
| 数据文件 | `/srv/guodelist-api/data/db.json` |

启动时注入环境变量：

```bash
#!/bin/bash
cd /srv/guodelist-api
export PORT=8788
export APP_SECRET='replace-with-a-long-random-secret'
export ADMIN_EMAIL='admin@your-server.example'
export ADMIN_PASSWORD='replace-with-a-strong-password'
export DATA_FILE=/srv/guodelist-api/data/db.json
exec node index.mjs
```

`APP_SECRET`、管理员密码和任何推送 AppSecret 只放在服务端环境变量中，不要提交到 Git。

## 环境变量

| 变量 | 说明 |
|---|---|
| `PORT` | 监听端口，默认 8787 |
| `APP_SECRET` | JWT 签名密钥；更换会让所有登录失效 |
| `ADMIN_EMAIL` | 首次启动时创建的管理员邮箱 |
| `ADMIN_PASSWORD` | 首次启动时的管理员密码（只用于建库） |
| `DATA_FILE` | JSON 数据文件路径 |

## REST

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/v1/health` | 健康检查 |
| POST | `/api/v1/auth/register` | `{email,password,name}` → `{token,user}` |
| POST | `/api/v1/auth/login` | `{email,password}` → `{token,user}` |
| GET | `/api/v1/me` | 当前用户 |
| POST | `/api/v1/sync` | 全量快照 + 墓碑合并 |
| GET/POST | `/api/v1/lists` | 清单 |
| PATCH/DELETE | `/api/v1/lists/:id` | 清单 |
| GET/POST | `/api/v1/tasks` | 任务 |
| PATCH/DELETE | `/api/v1/tasks/:id` | 任务 |
| GET | `/api/v1/admin/stats` | 管理员：统计 |
| GET | `/api/v1/admin/users` | 管理员：用户列表 |
| PATCH | `/api/v1/admin/users/:id` | 管理员：`{disabled,role}` |
| DELETE | `/api/v1/admin/users/:id` | 管理员：删除 |

鉴权：`Authorization: Bearer <token>`，JWT HS256，30 天有效。

## 本地运行

```bash
APP_SECRET=dev ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=change-me \
  PORT=8787 DATA_FILE=./data/db.json node index.mjs
```
