# Lab 5: Docker 容器化管理

## 步骤 0：配置 Docker

- 在个人系统上安装 Docker
- 验证 Docker 的安装

可以通过 `docker` 命令验证安装

## 步骤 1：将训练模型容器化

为训练代码创建一个 docker 容器。然后启动，容器应运行训练脚本并将模型文件存储到共享卷中，你需要完善 train 目录中部分完成的 Dockerfile 和 `train.py` 代码。

阅读并完善 Dockerfile 文件，你需要：
- 阅读已有代码，明确每条语句的作用
- 保证完善后的 Dockerfile 文件能够完成如下功能
   - 复制 `requirements.txt` 并安装依赖
   - 复制 `train.py` 到工作目录
   - 在共享卷中存储模型
   - 设置启动时运行 `train.py` 文件

阅读并完善 `train.py` 文件，你需要：
- 阅读已有代码，明确每条语句的作用
- 保证完善后的文件能够加载 iris 数据集并训练，将训练完毕的模型储存到挂载目录下

你可以通过如下命令验证容器化步骤：
```bash
docker build -t isse-training -f docker/training/Dockerfile .
docker run --rm -v model_storage:/app/models isse-training
```

## 步骤 2：将推理 Flask 应用容器化

创建一个服务于模型的 docker 容器，模型存储在容器中或通过共享驱动器挂载。你可以使用提供的 `inference/server.py` 的部分实现，但需要从头开始创建自己的 Dockerfile（可以参考 training 中的写法）。

首先你需要完善 `server.py` 的内容：
- 阅读已有代码，明确作用
- 使用 joblib 库使得程序从正确的路径加载模型
- 用户向 `/predict` 路由发送 `POST` 请求时，能够正确调用并返回预测结果

其次，书写为推理服务提供的 Dockerfile 文件，能够正确设置工作目录并启动服务。

你可以通过如下命令验证容器化步骤：
```bash
docker build -t isse-inference -f docker/inference/Dockerfile .
docker run --rm -p 8080:8080 -v model_storage:/app/models isse-inference
curl -X POST http://localhost:8080/predict -H 'Content-Type: application/json' -d '{"input":[6.3,3.3,6,2.5]}
```

你也可以发送一个坏请求，测试错误处理功能

## 步骤 3：Docker-compose 化

最终，你需要完善根目录下的 `docker-compose.yml` 文件，统一地处理训练与推理两个容器化应用，将模型储存在共享卷中，并暴露 8080 接口供推理服务访问。

你需要完善 `docker-compose.yml` 的内容，以满足上述要求，最终可以通过 `docker-compose up --build` 来自动启动服务。

## 提交内容

1. 所有代码文件
2. 一张截图，显示你已正确通过 docker 启动服务并正常工作

