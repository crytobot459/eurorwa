export declare function replyFor(text: string): string
export declare function sendMessage(chatId: number | string, text: string): Promise<void>
export declare function webhook(request: Request): Promise<Response>
