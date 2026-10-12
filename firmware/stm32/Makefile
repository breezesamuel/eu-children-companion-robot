TOOLCHAIN = arm-none-eabi-
CC  = $(TOOLCHAIN)gcc
LD  = $(TOOLCHAIN)gcc
OBJCOPY = $(TOOLCHAIN)objcopy
CFLAGS  = -mcpu=cortex-m4 -mthumb -O2 -Wall -I inc
LDFLAGS = -T STM32F407VGTx_FLASH.ld -nostartfiles -specs=nosys.specs
SRC = src/main.c
OBJ = $(SRC:.c=.o)
all: robot_fw_v2.1.0.bin
%.o: %.c
	$(CC) $(CFLAGS) -c $< -o $@
robot_fw_v2.1.0.elf: $(OBJ)
	$(LD) $(CFLAGS) $(LDFLAGS) $(OBJ) -o $@
robot_fw_v2.1.0.bin: robot_fw_v2.1.0.elf
	$(OBJCOPY) -O binary $< $@
flash:
	python ../../flash_tool.py --write robot_fw_v2.1.0.bin
clean:
	rm -f $(OBJ) *.elf *.bin
.PHONY: all flash clean
