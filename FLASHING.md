# USB-TTL 固件烧录指南

## 硬件架构

- **主控**: Rockchip RK3588 (运行 Linux + Python API 服务)
- **协处理器**: STM32F4/STM32G4 系列 (电机/传感器控制)
- **通信**: STM32 通过 UART 与 RK3588 连接

USB-TTL 烧录针对 **STM32 协处理器**。

## 所需材料

| 物料 | 说明 |
|------|------|
| USB-TTL 模块 | CH340G/CP2102/FT232，3.3V 电平 |
| 杜邦线 | 母对母 × 4 |
| 机器人主板 | 找到 STM32 的 USART1 接口 (PA9/PA10) |

## 接线

| USB-TTL | STM32 主板 |
|---------|-----------|
| TXD     | PA10 (USART1_RX) |
| RXD     | PA9 (USART1_TX) |
| GND     | GND |
| 3.3V    | **不接** (主板自供电) |

> ⚠️ **切勿接 VCC** — 主板通过电源供电，USB-TTL 只接 GND/TX/RX

## 烧录步骤

### 1. 进入烧录模式

将主板上的 **BOOT0 跳线** 短接到高电平 (3.3V)，然后上电或按复位键：

| 状态 | BOOT0 | BOOT1 |
|------|-------|-------|
| 烧录 | 1 (H) | 0 (L) |
| 运行 | 0 (L) | 0 (L) |

### 2. 确认连接

```bash
# Windows — 查看 COM 端口号 (设备管理器)
# Linux
ls /dev/ttyUSB*
# 应有 /dev/ttyUSB0 或类似
```

### 3. 安装烧录工具

```bash
# STM32 官方工具
pip install stm32loader    # Python 版
# 或
sudo apt install stm32flash  # Linux

# 通用 (支持 STM32/ESP32/Arduino)
pip install esptool
```

### 4. 擦除 + 烧录

```bash
# 使用 stm32flash (Linux)
# 先备份原固件
stm32flash -r backup.bin /dev/ttyUSB0

# 擦除
stm32flash -o /dev/ttyUSB0

# 烧录新固件 (115200 波特率)
stm32flash -w firmware.bin -v -g 0x0 /dev/ttyUSB0
```

```bash
# 使用 stm32loader (Python, 跨平台)
# 擦除
python -m stm32loader -p COM3 -e

# 烧录
python -m stm32loader -p COM3 -ewv firmware.bin
```

### 5. 退出烧录模式

1. 断开 BOOT0 跳线 (恢复低电平)
2. 按复位键重新启动
3. STM32 应从 0x08000000 (Flash) 启动运行新固件

## 波特率设置

| 阶段 | 波特率 |
|------|--------|
| 烧录 | 115200 (默认) / 460800 (可选) |
| 运行时通信 (STM32 ↔ RK3588) | 115200, 8N1 |

## 固件文件位置

```
firmware/
├── stm32/           # STM32 协处理器固件
│   └── robot_fw_v2.1.0.bin
└── rk3588/          # RK3588 系统镜像 (SD 卡/emmc)
    └── robot_sys_v1.0.img
```

## 验证

烧录完成后，通过 API 检查固件版本：

```bash
curl http://robot-ip:8888/api/device/robot_c2/status
# 返回中应有 firmware_version 字段
```

## 故障排查

| 现象 | 原因 | 解决 |
|------|------|------|
| 无法识别设备 | 驱动未安装 | 安装 CH340G/CP2102 驱动 |
| 烧录失败/校验错误 | 波特率过高 | 降低到 57600 或 115200 |
| 接线错误 | TX/RX 接反 | 交换 TXD/RXD |
| 无响应 | 未进入烧录模式 | 检查 BOOT0 跳线 |
| 电平不匹配 | USB-TTL 是 5V | 更换 3.3V 电平的 USB-TTL 模块 |
