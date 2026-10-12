#ifndef MAIN_H
#define MAIN_H
#include <stdint.h>
#define PERIPH_BASE      0x40000000UL
#define AHB1PERIPH_BASE  (PERIPH_BASE + 0x00020000UL)
#define APB2PERIPH_BASE  (PERIPH_BASE + 0x00010000UL)
#define GPIOA_BASE       (AHB1PERIPH_BASE + 0x0000UL)
#define USART1_BASE      (APB2PERIPH_BASE + 0x1000UL)
#define RCC_BASE         0x40023800UL
typedef struct {
    volatile uint32_t MODER, OTYPER, OSPEEDR, PUPDR, IDR, ODR;
} GPIO_TypeDef;
#define GPIOA  ((GPIO_TypeDef *)GPIOA_BASE)
typedef struct {
    volatile uint32_t SR, DR, BRR, CR1, CR2, CR3, GTPR;
} USART_TypeDef;
#define USART1 ((USART_TypeDef *)USART1_BASE)
typedef struct {
    volatile uint32_t CR, PLLCFGR, CFGR, CIR, AHB1RSTR, AHB2RSTR,
                      APB1RSTR, APB2RSTR, AHB1ENR, AHB2ENR, APB1ENR, APB2ENR;
} RCC_TypeDef;
#define RCC ((RCC_TypeDef *)RCC_BASE)
#define GPIO_MODER_MODER5_Msk   (3UL << 10)
#define GPIO_MODER_MODER5_0     (1UL << 10)
#define GPIO_MODER_MODER9_Msk   (3UL << 18)
#define GPIO_MODER_MODER9_1     (2UL << 18)
#define GPIO_MODER_MODER10_Msk  (3UL << 20)
#define GPIO_MODER_MODER10_1    (2UL << 20)
#define GPIO_AFRL_AFSEL9_Pos    4
#define GPIO_AFRL_AFSEL10_Pos   8
#define GPIO_ODR_OD5            (1UL << 5)
#define USART_SR_TXE            (1UL << 7)
#define RCC_AHB1ENR_GPIOAEN     (1UL << 0)
#define RCC_APB2ENR_USART1EN    (1UL << 4)
#define USART_CR1_UE            (1UL << 13)
#define USART_CR1_TE            (1UL << 3)
#define USART_CR1_RE            (1UL << 2)
#endif
