exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2))
    console.log('event.arguments:', event.arguments)
    const res = {
        id: Math.random().toString(36).slice(-8),
        name: event.arguments.name,
        value: 0,
    }
    return res
}
