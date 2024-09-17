exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2))
    console.log('event.arguments:', event.arguments)
    const res = {
        roomId: event.arguments.roomId,
        chat: {
            id: Math.random().toString(36).slice(-8),
            message: event.arguments.message,
        },
    }
    return res
}
