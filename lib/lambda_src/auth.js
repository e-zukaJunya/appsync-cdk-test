exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2))

    // 認証トークンを取得
    const token = event.authorizationToken

    // 認証ロジックの実装
    if (token === 'test') {
        // 認証成功
        return {
            isAuthorized: true,
            // 後続処理に渡す情報
            resolverContext: {
                hoge: 'fuga',
            },
            // 特定のフィールドに対するアクセス拒否
            deniedFields: [],
        }
    } else {
        // 認証失敗
        return {
            isAuthorized: false,
        }
    }
}
