#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'
import 'source-map-support/register'
import * as consts from '../common/constants'
import * as utils from '../common/utils'
import { GraphqlApiStack } from '../lib/graphql-api-stack'

const app = new cdk.App()
// contextからステージ名を取得(デフォルトdev)
const stage: string = app.node.tryGetContext('stage') ?? 'dev'
const context = utils.getStageContext(stage)

// const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }

// 命名メソッド
const createResourceName = utils.createResourceNameWithoutRp(consts.sysName)(stage)

const graphqlApiStack = new GraphqlApiStack(app, createResourceName('graphql-api'), {
    stage,
    context,
})
// リソースまとめてタグ付け
const stacks = [graphqlApiStack]

stacks.forEach((stack) => {
    cdk.Tags.of(stack).add('sysName', consts.sysName)
    cdk.Tags.of(stack).add('stage', stage)
})
