// 固定値

export type Keys<T> = keyof T
export type Values<T> = T[Keys<T>]

// システム名
export const sysName = 'appsync-example'
// contextの型
export interface StageContext {
    example: string
}

// デプロイ先ステージによって切り替える値
export const context = {
    dev: {
        example: 'example',
    },
    stg: {
        example: 'example',
    },
    prod: {
        example: 'example',
    },
} as const
