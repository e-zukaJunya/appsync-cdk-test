import * as cdk from 'aws-cdk-lib'
import * as appsync from 'aws-cdk-lib/aws-appsync'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as logs from 'aws-cdk-lib/aws-logs'
import { Construct } from 'constructs'
import * as path from 'path'
import * as consts from '../common/constants'
import * as utils from '../common/utils'

interface GraphqlApiStackProps extends cdk.StackProps {
    stage: string
    context: consts.StageContext
}

export class GraphqlApiStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: GraphqlApiStackProps) {
        super(scope, id, props)
        const createResourceName = utils.createResourceNameWithoutRp(consts.sysName)(props.stage)

        // #region Lambda
        // const policy = new iam.Policy(this, 'LambdaPolicy', {
        //     statements: utils.getPolicies(props.stage, props.context, this),
        // })
        const executionLambdaRole = new iam.Role(this, 'LambdaRole', {
            roleName: createResourceName('appsync-lambda'),
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
        })
        // executionLambdaRole.attachInlinePolicy(policy)

        // Lambda関数を1つ作成するのに必要なもの一式を作成する
        const createLambdaSet = (
            name: string,
            cmd: string[],
            duration = cdk.Duration.seconds(60),
            memorySize = 256,
        ) => {
            const f = new lambda.Function(this, `LambdaFunc-${name}`, {
                functionName: createResourceName(name),
                timeout: duration,
                memorySize: memorySize,
                role: executionLambdaRole,
                logRetention: logs.RetentionDays.ONE_WEEK,
                tracing: lambda.Tracing.ACTIVE,
                environment: {
                    SYSTEM_CODE: 'BATCH',
                },
                runtime: lambda.Runtime.NODEJS_20_X,
                code: lambda.Code.fromAsset(path.join(__dirname, './lambda_src')),
                handler: cmd[0],
            })
            // this.addLogAlart(this, props, f, name)
            return f
        }
        // #endregion

        // 認証の設定
        const authFunction = createLambdaSet('auth', ['auth.handler'])

        const api = new appsync.GraphqlApi(this, 'Api', {
            name: createResourceName('api'),
            // スキーマ定義は外部ファイルから読み込む
            definition: appsync.Definition.fromFile(path.join(__dirname, './schema.graphql')),
            authorizationConfig: {
                defaultAuthorization: {
                    // authorizationType: appsync.AuthorizationType.API_KEY,
                    authorizationType: appsync.AuthorizationType.LAMBDA,
                    lambdaAuthorizerConfig: {
                        handler: authFunction,
                    },
                },
            },
            logConfig: {
                fieldLogLevel: appsync.FieldLogLevel.ERROR,
                retention: logs.RetentionDays.ONE_WEEK,
            },
            xrayEnabled: true,
        })

        // サンプル Query
        {
            const fieldName = 'sampleQuery'
            // 紐づける処理のLambdaを作成
            const lambdaFunc = createLambdaSet(fieldName, ['sample-query.handler'])
            // AppSync データソース
            const ds = api.addLambdaDataSource(`DataSource-${fieldName}`, lambdaFunc, { name: fieldName })
            // リゾルバを追加
            ds.createResolver(`Resolver-${fieldName}`, {
                typeName: 'Query',
                fieldName: fieldName,
            })
        }

        // サンプル Mutation
        {
            const fieldName = 'sampleMutation'
            // 紐づける処理のLambdaを作成
            const lambdaFunc = createLambdaSet(fieldName, ['sample-mutation.handler'])
            // AppSync データソース
            const ds = api.addLambdaDataSource(`DataSource-${fieldName}`, lambdaFunc, { name: fieldName })
            // リゾルバを追加
            ds.createResolver(`Resolver-${fieldName}`, {
                typeName: 'Mutation',
                fieldName: fieldName,
            })
        }

        // サンプル Subscription
        {
            const fieldName = 'sampleSubscription'
            // リゾルバを追加
            this.addNoneDataSourceSubscriptionResolver(api, fieldName)
        }
    }

    /**
     * 今回共通の Subscription リゾルバを追加する
     * @param api AppSync API
     * @param fieldName GraphQL Schema におけるフィールド名
     */
    addNoneDataSourceSubscriptionResolver(api: appsync.GraphqlApi, fieldName: string) {
        // AppSync データソース
        const ds = api.addNoneDataSource(`DataSource-${fieldName}`, { name: fieldName })
        // リゾルバ
        ds.createResolver(`Resolver-${fieldName}`, {
            typeName: 'Subscription',
            fieldName: fieldName,
            // 今回はリクエスト・レスポンス共にロジックを置かないので、どちらもただ流すだけの定義
            requestMappingTemplate: appsync.MappingTemplate.fromString(`
                {
                    "version": "2017-02-28",
                    "payload": $util.toJson($ctx.source)
                }
            `),
            responseMappingTemplate: appsync.MappingTemplate.fromString(`
                $util.toJson($ctx.result)
            `),
        })
    }

    // /**
    //  * ログ監視設定
    //  * @param f Lambda関数
    //  * @param props StackProps
    //  */
    // addLogAlart = (scope: GraphqlApiStack, props: GraphqlApiStackProps, f: lambda.Function, functionName: string) => {
    //     const createResourceName = utils.createResourceNameWithoutRp(consts.sysName)(props.stage)
    //     const namespace = `Lambda/LogMetrics/${functionName}`
    //     const metricName = 'CommonError'
    //     // メトリクスフィルタ作成
    //     f.logGroup.addMetricFilter(`MetricFilter-${functionName}`, {
    //         metricNamespace: namespace,
    //         metricName: metricName,
    //         filterPattern: logs.FilterPattern.any(
    //             logs.FilterPattern.stringValue('$.level', '=', 'Error'),
    //             logs.FilterPattern.stringValue('$.level', '=', 'Fatal'),
    //         ),
    //     })
    //     // アラーム作成（アラーム：メトリクスフィルタ＝１：１）
    //     new cw.Alarm(scope, `Alarm-${functionName}-Error`, {
    //         alarmName: createResourceName(`appsync-${functionName}-error`),
    //         metric: new cw.Metric({
    //             namespace: namespace,
    //             metricName: metricName,
    //             statistic: cw.Stats.SUM,
    //         }),
    //         threshold: 1,
    //         evaluationPeriods: 1,
    //         treatMissingData: cw.TreatMissingData.NOT_BREACHING,
    //     }).addAlarmAction(new cwActions.SnsAction(props.miscStack.alertTopic))
    // }
}
