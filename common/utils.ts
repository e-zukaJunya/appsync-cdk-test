import * as cdk from 'aws-cdk-lib'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as wafv2 from 'aws-cdk-lib/aws-wafv2'
import * as consts from './constants'
import { StageContext, context } from './constants'

// 共通処理

// 各種リソースの名称作成
export const createResourceName =
    (resourcePrefix: string) => (sysName: string) => (stg: string) => (uniqueStr: string) =>
        `${resourcePrefix}-${sysName}-${stg}-${uniqueStr}`

// 各種リソースの名称作成
// resource prefix無し版
export const createResourceNameWithoutRp = (sysName: string) => (stg: string) => (uniqueStr: string) =>
    `${sysName}-${stg}-${uniqueStr}`

// 各ステージのcontextの取得
export const getStageContext = (stage: string): StageContext => {
    if (!isStage(stage)) {
        throw new Error('stage情報が不正です')
    }
    const stgContext = context[stage]
    return stgContext
}

// デプロイ先Stageの種類
export const deploymentStage = ['dev', 'stg', 'prod'] as const
type DeploymentStage = (typeof deploymentStage)[number]

// contextから入れられた値が決められたStageの種類かどうか判定
const isStage = (stage: string): stage is DeploymentStage => {
    return deploymentStage.some((value) => value === stage)
}
