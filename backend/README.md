# 答卷管理

前台继续由 GitHub Pages 发布；本目录的数据服务使用 Cloudflare Worker 与私有 D1 数据库。管理员密码保存在 Worker secret，登录后使用 8 小时的 HttpOnly 会话。管理接口不提供跨域访问权限。公开接口只允许提交答卷，不提供读取功能。

## 更新

1. 安装 Node.js 22 与 Python 3.11 以上版本。
2. 在本目录运行 `npm ci`、`node build.mjs` 和 `node --test test.mjs`。
3. 如尚未登录，运行 `npx wrangler login --scopes account:read user:read workers_scripts:write d1:write`。
4. 运行 `python deploy.py`。脚本只创建或更新名为 `cdut-survey-results` 的数据库及 Worker，不替换其他站点。
5. 部署脚本通过健康检查后才启用根目录的 `collection-config.js`，再将网站改动推送到 main 发布。

本机管理员密码与部署标识保存在仓库外的 `../cdut-results-private/admin-access.json`，不要上传到公共仓库或分享。修改其中的密码后重新执行部署脚本可更新管理密码；已有登录会话最长保留 8 小时。

## 数据规则

参与者先明确同意保存答卷后才会提交。旧进度不追溯上传；保存失败会显示重试按钮。相同答卷再次打开结果页不会新增记录，修改答案会更新原记录。第 4 题选择“基本不看”时，第 5—16 题保存为跳过，且不用于计分。

管理页支持按日期和人格类型筛选、查看每份答案与四维结果、汇总各选项的选择次数，并导出带 UTF-8 BOM 的 CSV 文件供 Excel 打开。提交时间按北京时间显示。人格解读是娱乐建议，不是问卷提供的心理量表。

接口限频使用短期、加盐后的请求标识，不保存原始 IP；过期的会话和限频记录每天自动清理。数据库中的答卷仅通过登录后的接口访问。不要把数据库导出或管理员密码加入 GitHub 仓库。
