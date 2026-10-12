#include "main.h"

static void gpio_init(void) {
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;
    GPIOA->MODER &= ~GPIO_MODER_MODER5_Msk;
    GPIOA->MODER |= GPIO_MODER_MODER5_0;
}

static void uart_init(void) {
    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;
    GPIOA->AFR[0] |= (7 << GPIO_AFRL_AFSEL9_Pos) | (7 << GPIO_AFRL_AFSEL10_Pos);
    GPIOA->MODER &= ~(GPIO_MODER_MODER9_Msk | GPIO_MODER_MODER10_Msk);
    GPIOA->MODER |= GPIO_MODER_MODER9_1 | GPIO_MODER_MODER10_1;
    USART1->BRR = 80000000 / 115200;
    USART1->CR1 = USART_CR1_UE | USART_CR1_TE | USART_CR1_RE;
}

static void delay(volatile uint32_t ms) {
    for (; ms > 0; ms--)
        for (volatile uint32_t i = 0; i < 16000; i++);
}

int main(void) {
    gpio_init();
    uart_init();
    const char msg[] = "Robot FW v2.1.0\r\n";
    while (1) {
        GPIOA->ODR ^= GPIO_ODR_OD5;
        for (const char *p = msg; *p; p++) {
            while (!(USART1->SR & USART_SR_TXE));
            USART1->DR = *p;
        }
        delay(500);
    }
}
